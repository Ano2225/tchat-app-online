const User = require("../models/User");
const Message = require("../models/Message");
const gameHandlers = require('./gameHandlers');
const aiService = require('../services/aiService');

// username -> Set of socket IDs
const connectedUsers = new Map();
// userId -> username mapping
const userIdToUsername = new Map();

module.exports = (io, socket) => {
  console.log('Client connected with ID:', socket.id);

  let currentUsername = null;
  let currentUserId = null;

  // Initialiser les handlers de jeu
  gameHandlers(io, socket);
  
  // Rejoindre automatiquement le canal de jeu si l'utilisateur rejoint le canal Game
  socket.on('auto_join_game', (channel) => {
    if (channel === 'Game' && socket.userId && socket.username) {
      socket.emit('join_game_channel', channel);
    }
  });

  // --- Join a public room ---
  socket.on('join_room', (room) => {
    // Validate authentication
    if (!socket.userId || !socket.username) {
      console.log(`[SECURITY] Unauthorized room join attempt from socket: ${socket.id}`);
      return;
    }
    
    // Validate room parameter
    if (!room || typeof room !== 'string' || room.length > 50) {
      console.log(`[SECURITY] Invalid room parameter from user: ${socket.username}`);
      return;
    }
    
    socket.join(room);
    socket.currentRoom = room;
    console.log(`User ${socket.username} joined room ${room}`);
    
    // Si c'est le canal Game, rejoindre aussi le canal de jeu
    if (room === 'Game') {
      socket.emit('join_game_channel', room);
    }
    // Emit updated list for this room
    emitRoomUserList(room);
  });

  // --- Leave a public room ---
  socket.on('leave_room', (room) => {
    if (room) {
      socket.leave(room);
      console.log(`User ${socket.id} left room ${room}`);
      
      // Si c'est le canal Game, quitter aussi le canal de jeu
      if (room === 'Game') {
        socket.emit('leave_game_channel', room);
      }
      
      if (socket.currentRoom === room) {
        delete socket.currentRoom;
      }
      // Emit updated list for this room
      emitRoomUserList(room);
    } else if (socket.currentRoom) {
      socket.leave(socket.currentRoom);
      console.log(`User ${socket.id} left room ${socket.currentRoom}`);
      
      if (socket.currentRoom === 'Game') {
        socket.emit('leave_game_channel', socket.currentRoom);
      }
      
      delete socket.currentRoom;
      // Emit updated list for the previous room
      emitRoomUserList(room);
    }
  });

  // --- Send a message to a public room ---
  socket.on('send_message', async (messageData) => {
    const { sender, content, room, replyTo, replyPreview, isAIChat } = messageData;
    if (!room || !content) return;

    try {
      const senderId = socket.userId || sender?.id;
      if (!senderId) return;

      if (!socket.userId || !socket.username || !socket.userMeta) {
        const user = await User.findById(senderId).select('username avatarUrl sexe');
        if (!user) return;
        socket.userId = user._id.toString();
        socket.username = user.username;
        socket.userMeta = {
          avatarUrl: user.avatarUrl || null,
          sexe: user.sexe || null
        };
      }

      // Vérifier que le socket est dans la room, sinon le rejoindre
      const rooms = Array.from(socket.rooms || []);
      if (!rooms.includes(room)) {
        socket.join(room);
        socket.currentRoom = room;
        console.log(`User ${socket.username} auto-joined room ${room} to send message`);
      }

      const newMessage = new Message({
        sender: socket.userId,
        content,
        room,
        replyTo: replyTo || null
      });

      const enrichedMessage = {
        _id: newMessage._id.toString(),
        sender: {
          _id: socket.userId,
          username: socket.username,
          avatarUrl: socket.userMeta?.avatarUrl || undefined,
          sexe: socket.userMeta?.sexe || undefined
        },
        content,
        room,
        replyTo: replyPreview || null,
        reactions: [],
        createdAt: newMessage.createdAt
      };

      // Envoyer le message immédiatement
      io.to(room).emit('receive_message', enrichedMessage);

      // Sauvegarder en arrière-plan pour réduire la latence
      newMessage.save().catch((error) => {
        console.error('Error saving message:', error);
      });

      // Puis traiter la logique de jeu si nécessaire
      if (room === 'Game') {
        setImmediate(() => {
          gameHandlers.handleChatMessage(socket, { room, message: content }, io);
        });
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  // --- Add reaction to message ---
  socket.on('add_reaction', async ({ messageId, emoji, userId, room }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      const user = await User.findById(userId).select('username');
      if (!user) return;
      
      console.log('Adding reaction:', { messageId, emoji, userId, username: user.username });

      // Trouver si l'utilisateur a déjà une réaction sur ce message
      const userExistingReaction = message.reactions.find(r => 
        r.users.some(u => u.id === userId)
      );

      // Si l'utilisateur a déjà une réaction
      if (userExistingReaction) {
        // Supprimer l'utilisateur de sa réaction actuelle
        const userIndex = userExistingReaction.users.findIndex(u => u.id === userId);
        userExistingReaction.users.splice(userIndex, 1);
        userExistingReaction.count = userExistingReaction.users.length;
        
        // Supprimer la réaction si plus personne ne l'utilise
        if (userExistingReaction.count === 0) {
          message.reactions = message.reactions.filter(r => r.emoji !== userExistingReaction.emoji);
        }
        
        // Si c'est la même emoji, on s'arrête là (suppression)
        if (userExistingReaction.emoji === emoji) {
          await message.save();
          console.log('Reaction removed, emitting to room:', room, 'reactions:', message.reactions);
          io.to(room).emit('reaction_updated', {
            messageId,
            reactions: message.reactions
          });
          return;
        }
      }

      // Ajouter la nouvelle réaction
      const targetReaction = message.reactions.find(r => r.emoji === emoji);
      
      if (targetReaction) {
        // Ajouter l'utilisateur à la réaction existante
        targetReaction.users.push({ id: userId, username: user.username });
        targetReaction.count = targetReaction.users.length;
      } else {
        // Créer une nouvelle réaction
        message.reactions.push({
          emoji,
          users: [{ id: userId, username: user.username }],
          count: 1
        });
      }

      await message.save();
      
      console.log('Reaction updated, emitting to room:', room, 'reactions:', message.reactions);
      
      // Emit to all users in the room
      io.to(room).emit('reaction_updated', {
        messageId,
        reactions: message.reactions
      });
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  });

  // --- Handle user connection ---
  socket.on('user_connected', async (username) => {
    try {
      currentUsername = username;

      // Find the user ID for this username
      const user = await User.findOne({ username });
      if (user) {
        // Vérifier si l'utilisateur est bloqué
        if (user.isBlocked && !user.isAnonymous) {
          socket.emit('user_blocked', { message: 'Votre compte a été bloqué. Contactez l\'administrateur.' });
          socket.disconnect();
          return;
        }

        currentUserId = user._id.toString();
        socket.userId = currentUserId;
        socket.username = username;
        socket.userMeta = {
          avatarUrl: user.avatarUrl || null,
          sexe: user.sexe || null
        };
        
        // GESTION DES SESSIONS UNIQUES POUR UTILISATEURS AUTHENTIFIÉS
        // Si l'utilisateur est déjà connecté, déconnecter les anciennes sessions
        if (connectedUsers.has(username)) {
          const existingSockets = connectedUsers.get(username);
          console.log(`Déconnexion des anciennes sessions pour ${username}:`, existingSockets.size);
          
          // Déconnecter toutes les anciennes sessions
          existingSockets.forEach(oldSocketId => {
            const oldSocket = io.sockets.sockets.get(oldSocketId);
            if (oldSocket && oldSocket.id !== socket.id) {
              console.log(`Déconnexion de l'ancienne session: ${oldSocketId}`);
              oldSocket.emit('session_replaced', { 
                message: 'Votre session a été remplacée par une nouvelle connexion.' 
              });
              oldSocket.disconnect(true);
            }
          });
          
          // Vider l'ancienne liste
          connectedUsers.delete(username);
        }
        
        // Store in our mapping
        userIdToUsername.set(currentUserId, username);

        // Mettre à jour le statut en ligne dans la base de données
        await User.findByIdAndUpdate(user._id, {
          isOnline: true,
          lastSeen: new Date()
        });
      } else {
        // GESTION DES UTILISATEURS ANONYMES
        // Vérifier si le nom d'utilisateur est déjà pris (par un utilisateur authentifié ou anonyme)
        if (connectedUsers.has(username)) {
          console.log(`Nom d'utilisateur ${username} déjà pris`);
          socket.emit('username_taken', { 
            message: `Le nom d'utilisateur "${username}" est déjà utilisé. Veuillez en choisir un autre.` 
          });
          socket.disconnect();
          return;
        }
        
        // Vérifier aussi si ce nom correspond à un utilisateur enregistré
        const existingUser = await User.findOne({ username });
        if (existingUser) {
          console.log(`Nom d'utilisateur ${username} appartient à un compte enregistré`);
          socket.emit('username_reserved', { 
            message: `Le nom d'utilisateur "${username}" appartient à un compte enregistré. Veuillez vous connecter ou choisir un autre nom.` 
          });
          socket.disconnect();
          return;
        }
        
        // For anonymous users, use a temporary ID
        currentUserId = `anon_${socket.id}`;
        socket.userId = currentUserId;
        socket.username = username;
        socket.userMeta = {
          avatarUrl: null,
          sexe: null
        };
      }

      // Créer une nouvelle entrée pour ce socket uniquement
      connectedUsers.set(username, new Set([socket.id]));
      
      console.log(`Utilisateur ${username} connecté avec le socket ${socket.id}`);
      
      emitUserList();
      // If the socket is currently in a room, also emit that room's user list
      if (socket.currentRoom) {
        emitRoomUserList(socket.currentRoom);
      }
    } catch (error) {
      console.error("Error in user_connected:", error);
    }
  });

  // --- Update username (e.g. after login or change) ---
  socket.on('update_username', async (newUsername) => {
    if (!newUsername || newUsername === currentUsername) return;

    try {
      // Remove old username entry
      if (currentUsername && connectedUsers.has(currentUsername)) {
        connectedUsers.get(currentUsername).delete(socket.id);
        if (connectedUsers.get(currentUsername).size === 0) {
          connectedUsers.delete(currentUsername);
        }
      }

      // Add new username entry
      currentUsername = newUsername;
      
      // Update the user ID mapping
      const user = await User.findOne({ username: newUsername });
      if (user) {
        // Remove old mapping if exists
        if (currentUserId) {
          // Mettre l'ancien utilisateur hors ligne
          await User.findByIdAndUpdate(currentUserId, { 
            isOnline: false,
            lastSeen: new Date()
          });
          userIdToUsername.delete(currentUserId);
        }
        
        currentUserId = user._id.toString();
        userIdToUsername.set(currentUserId, newUsername);
        socket.userId = currentUserId;
        socket.username = newUsername;
        socket.userMeta = {
          avatarUrl: user.avatarUrl || null,
          sexe: user.sexe || null
        };
        
        // Mettre le nouvel utilisateur en ligne
        await User.findByIdAndUpdate(user._id, { 
          isOnline: true,
          lastSeen: new Date()
        });
      }

      if (!connectedUsers.has(newUsername)) {
        connectedUsers.set(newUsername, new Set());
      }
      connectedUsers.get(newUsername).add(socket.id);

      emitUserList();
      if (socket.currentRoom) {
        emitRoomUserList(socket.currentRoom);
      }
    } catch (error) {
      console.error("Error in update_username:", error);
    }
  });

  // --- Join a private room (between two users) ---
  socket.on('join_private_room', async ({ senderId, recipientId }) => {
    const roomId = getPrivateRoomId(senderId, recipientId);
    socket.join(roomId);
    console.log(`📥 User ${senderId} joined private room: ${roomId}`);
    
    // Marquer les messages comme lus quand l'utilisateur rejoint la conversation
    try {
      await Message.updateMany(
        {
          sender: recipientId,
          recipient: senderId,
          read: false
        },
        { read: true }
      );
      
      // Notifier l'expéditeur que ses messages ont été lus
      const recipientUsername = userIdToUsername.get(recipientId.toString());
      if (recipientUsername && connectedUsers.has(recipientUsername)) {
        const recipientSockets = connectedUsers.get(recipientUsername);
        recipientSockets.forEach(socketId => {
          io.to(socketId).emit('messages_read', { readBy: senderId });
        });
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  });

  // --- Fetch message history between two users ---
  socket.on('get_message_history', async ({ userId, recipientId }) => {
    try {
      const messages = await Message.find({
        $or: [
          { sender: userId, recipient: recipientId },
          { sender: recipientId, recipient: userId },
        ]
      })
        .populate('sender', 'username email sexe')
        .sort({ createdAt: 1 });

      const roomId = getPrivateRoomId(userId, recipientId);
      io.to(roomId).emit('message_history', messages);
    } catch (error) {
      console.error("Error while fetching message history:", error);
    }
  });

  // --- Send a private message ---
  socket.on('send_private_message', async ({ senderId, recipientId, content, media_url, media_type, isAIChat }) => {
    try {
      // Vérifier si l'expéditeur ou le destinataire sont bloqués
      const sender = await User.findById(senderId);
      const recipient = await User.findById(recipientId);
      
      if (!sender || !recipient) {
        console.log('Sender or recipient not found');
        return;
      }
      
      // Vérifier si l'un des utilisateurs a bloqué l'autre
      const senderBlockedUsers = sender.blockedUsers || [];
      const recipientBlockedUsers = recipient.blockedUsers || [];
      
      if (senderBlockedUsers.includes(recipientId) || recipientBlockedUsers.includes(senderId)) {
        console.log('Message blocked: users have blocked each other');
        socket.emit('message_blocked', { message: 'Impossible d\'envoyer le message. Utilisateur bloqué.' });
        return;
      }
      
      const newMessage = await Message.create({
        sender: senderId,
        recipient: recipientId,
        content,
        media_url,
        media_type,
      });

      await newMessage.populate('sender', 'username email avatarUrl sexe');

      const roomId = getPrivateRoomId(senderId, recipientId);
      io.to(roomId).emit('receive_private_message', newMessage);
      console.log(`📨 New message sent in room ${roomId}`, { content, media_url, media_type });

      // Traiter la réponse IA pour les messages privés si activée
      if (isAIChat && recipientId === 'ai') {
        setImmediate(async () => {
          try {
            // Récupérer le contexte des messages privés
            const recentMessages = await Message.find({
              $or: [
                { sender: senderId, recipient: 'ai' },
                { sender: 'ai', recipient: senderId }
              ]
            })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('sender', 'username');
            
            const context = recentMessages.reverse().map(msg => ({
              role: msg.isAI ? 'assistant' : 'user',
              content: msg.content
            }));

            const aiResponse = await aiService.generateResponse(content, context);
            
            const aiMessage = await Message.create({
              sender: 'ai',
              recipient: senderId,
              content: aiResponse,
              isAI: true,
              aiContext: context
            });

            const aiMessageData = {
              ...aiMessage.toObject(),
              sender: {
                _id: 'ai',
                username: 'Assistant IA',
                avatarUrl: null
              }
            };

            io.to(roomId).emit('receive_private_message', aiMessageData);
          } catch (error) {
            console.error('Error generating AI private response:', error);
          }
        });
      }

      // Get recipient's username from their ID (skip for AI)
      if (recipientId === 'ai') return;
      const recipientUsername = userIdToUsername.get(recipientId.toString());
      
      // --- Real-time notification to recipient ---
      if (recipientUsername && connectedUsers.has(recipientUsername)) {
        const recipientSockets = connectedUsers.get(recipientUsername);
        recipientSockets.forEach(socketId => {
          io.to(socketId).emit('notify_user', {
            from: {
              _id: newMessage.sender._id,
              username: newMessage.sender.username,
            },
            content: newMessage.content || 'Image',
            createdAt: newMessage.createdAt,
          });
        });
      }

    } catch (error) {
      console.error('Error while sending private message:', error);
    }
  });

  // --- Handle disconnection ---
  socket.on('disconnect', async () => {
    console.log(`Client ${socket.id} disconnected`);

    if (currentUsername && connectedUsers.has(currentUsername)) {
      connectedUsers.get(currentUsername).delete(socket.id);
      if (connectedUsers.get(currentUsername).size === 0) {
        connectedUsers.delete(currentUsername);
        
        // Mettre à jour le statut hors ligne dans la base de données
        if (currentUserId) {
          try {
            await User.findByIdAndUpdate(currentUserId, { 
              isOnline: false,
              lastSeen: new Date()
            });
          } catch (error) {
            console.error('Error updating user offline status:', error);
          }
          userIdToUsername.delete(currentUserId);
        }
      }

      emitUserList();
      // If the socket had a currentRoom, update that room's user list too
      if (socket.currentRoom) {
        emitRoomUserList(socket.currentRoom);
      }
    }
  });

  // --- Provide a way for clients to request current users in a room ---
  socket.on('get_room_users', (room) => {
    console.log(`[get_room_users] Request received for room: ${room}, socket: ${socket.id}, username: ${socket.username}`);
    try {
      if (!room || typeof room !== 'string') {
        console.log('[get_room_users] Invalid room parameter');
        return;
      }
      // Use the same enriched logic as emitRoomUserList
      (async () => {
        try {
          const usersInfo = [];
          const roomInfo = io.sockets.adapter.rooms.get(room);
          console.log(`[get_room_users] Room info exists: ${!!roomInfo}, size: ${roomInfo ? roomInfo.size : 0}`);
          if (!roomInfo) {
            console.log(`[get_room_users] No users in room ${room}, emitting empty list`);
            socket.emit('update_room_user_list', { room, users: [] });
            return;
          }

          for (const socketId of roomInfo) {
            const s = io.sockets.sockets.get(socketId);
            if (s && s.username) {
              let avatarUrl = null;
              let sexe = null;
              if (s.userId) {
                try {
                  const dbUser = await User.findById(s.userId).select('avatarUrl sexe');
                  if (dbUser && dbUser.avatarUrl) avatarUrl = dbUser.avatarUrl;
                  if (dbUser && dbUser.sexe) sexe = dbUser.sexe;
                } catch (err) {
                  // ignore per-user DB errors
                }
              }
              usersInfo.push({ username: s.username, avatarUrl, sexe: sexe || 'autre' });
              console.log(`[get_room_users] Added user: ${s.username} to room ${room}`);
            }
          }

          console.log(`[get_room_users] Emitting ${usersInfo.length} users for room ${room}`);
          socket.emit('update_room_user_list', { room, users: usersInfo });
        } catch (err) {
          console.error('Error building room user info for get_room_users:', err);
          // Fallback to plain usernames
          const usernames = getUsernamesInRoom(room);
          socket.emit('update_room_user_list', { room, users: usernames });
        }
      })();
    } catch (err) {
      console.error('Error in get_room_users:', err);
    }
  });

  // --- Mark messages as read ---
  socket.on('mark_messages_read', async ({ senderId, recipientId }) => {
    try {
      await Message.updateMany(
        {
          sender: recipientId,
          recipient: senderId,
          read: false
        },
        { read: true }
      );
      
      // Notifier l'expéditeur que ses messages ont été lus
      const recipientUsername = userIdToUsername.get(recipientId.toString());
      if (recipientUsername && connectedUsers.has(recipientUsername)) {
        const recipientSockets = connectedUsers.get(recipientUsername);
        recipientSockets.forEach(socketId => {
          io.to(socketId).emit('messages_read', { readBy: senderId });
        });
      }
      
      console.log(`✅ Messages marked as read between ${senderId} and ${recipientId}`);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  });

  // --- Check if user is Online/Offline (FIXED) ---
  socket.on('check_user_online', async (recipientId) => {
    try {
      // Convert the recipientId to a username
      const username = userIdToUsername.get(recipientId.toString());
      
      if (username && connectedUsers.has(username)) {
        socket.emit('user_online', recipientId);
      } else {
        // Try to look up the username in the database if not in our cache
        const user = await User.findById(recipientId);
        if (user && connectedUsers.has(user.username)) {
          // Update our cache
          userIdToUsername.set(recipientId.toString(), user.username);
          socket.emit('user_online', recipientId);
        } else {
          socket.emit('user_offline', recipientId);
        }
      }
    } catch (error) {
      console.error("Error checking user online status:", error);
      socket.emit('user_offline', recipientId);
    }
  });

  // --- Emit the list of connected users ---
  function emitUserList() {
    // Emit richer user info (username + avatarUrl when available) to clients
    const usernames = Array.from(connectedUsers.keys());
    (async () => {
      try {
        const usersInfo = [];
        for (const username of usernames) {
          const socketsSet = connectedUsers.get(username);
          let avatarUrl = null;
          let sexe = null;

          if (socketsSet && socketsSet.size > 0) {
            // Try to pick one socket for this username and lookup its userId
            const socketId = Array.from(socketsSet)[0];
            const s = io.sockets.sockets.get(socketId);
            if (s && s.userId) {
              try {
                const dbUser = await User.findById(s.userId).select('avatarUrl sexe');
                if (dbUser && dbUser.avatarUrl) avatarUrl = dbUser.avatarUrl;
                if (dbUser && dbUser.sexe) sexe = dbUser.sexe;
              } catch (err) {
                // ignore DB errors for best-effort avatar retrieval
              }
            }
          }
          usersInfo.push({ username, avatarUrl, sexe: sexe || 'autre' });
        }
        io.emit('update_user_list', usersInfo);
      } catch (err) {
        console.error('Error emitting enriched user list:', err);
        // Fallback to plain usernames
        io.emit('update_user_list', usernames);
      }
    })();
  }

  // Emit users present in a specific room to members of that room
  function emitRoomUserList(room) {
    console.log(`[emitRoomUserList] Called for room: ${room}`);
    try {
      const usernames = getUsernamesInRoom(room);
      console.log(`[emitRoomUserList] Found ${usernames.length} usernames in room ${room}`);
      // Build enriched user info (username + avatarUrl) for members of the room
      (async () => {
        try {
          const usersInfo = [];
          const roomInfo = io.sockets.adapter.rooms.get(room);
          console.log(`[emitRoomUserList] Room ${room} has ${roomInfo ? roomInfo.size : 0} sockets`);
          if (!roomInfo) {
            console.log(`[emitRoomUserList] No room info, emitting empty list`);
            io.to(room).emit('update_room_user_list', { room, users: [] });
            return;
          }

          for (const socketId of roomInfo) {
            const s = io.sockets.sockets.get(socketId);
            if (s && s.username) {
              let avatarUrl = null;
              let sexe = null;
              if (s.userId) {
                try {
                  const dbUser = await User.findById(s.userId).select('avatarUrl sexe');
                  if (dbUser && dbUser.avatarUrl) avatarUrl = dbUser.avatarUrl;
                  if (dbUser && dbUser.sexe) sexe = dbUser.sexe;
                } catch (err) {
                  // ignore per-user DB errors
                }
              }
              usersInfo.push({ username: s.username, avatarUrl, sexe: sexe || 'autre' });
            }
          }

          console.log(`[emitRoomUserList] Emitting ${usersInfo.length} users to room ${room}`);
          io.to(room).emit('update_room_user_list', { room, users: usersInfo });
        } catch (err) {
          console.error('Error building room user info for', room, err);
          io.to(room).emit('update_room_user_list', { room, users: usernames });
        }
      })();
    } catch (err) {
      console.error('Error emitting room user list for', room, err);
    }
  }

  // Helper: compute unique usernames currently connected in a room
  function getUsernamesInRoom(room) {
    const roomInfo = io.sockets.adapter.rooms.get(room);
    const names = new Set();
    if (!roomInfo) return [];
    for (const socketId of roomInfo) {
      const s = io.sockets.sockets.get(socketId);
      if (s && s.username) names.add(s.username);
    }
    return Array.from(names);
  }

  // --- Generate a consistent private room ID for two users ---
  function getPrivateRoomId(userId1, userId2) {
    return [userId1, userId2].sort().join('_');
  }
};
