const User = require("../models/User");
const Message = require("../models/Message");
const gameHandlers = require('./gameHandlers');

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
    } else if (socket.currentRoom) {
      socket.leave(socket.currentRoom);
      console.log(`User ${socket.id} left room ${socket.currentRoom}`);
      
      if (socket.currentRoom === 'Game') {
        socket.emit('leave_game_channel', socket.currentRoom);
      }
      
      delete socket.currentRoom;
    }
  });

  // --- Send a message to a public room ---
  socket.on('send_message', async (messageData) => {
    const { sender, content, room, replyTo } = messageData;
    if (room && sender && content) {
      try {
        const user = await User.findById(sender.id);
        if (!user) return;

        // S'assurer que socket a les bonnes infos utilisateur
        socket.userId = user._id.toString();
        socket.username = user.username;
        
        // Toujours sauvegarder et afficher le message d'abord
        const newMessage = await Message.create({
          sender: user._id,
          content,
          room,
          replyTo: replyTo || null,
        });

        await newMessage.populate('sender', 'username');
        if (replyTo) {
          await newMessage.populate('replyTo');
        }

        const enrichedMessage = {
          _id: newMessage._id.toString(),
          sender: {
            _id: newMessage.sender._id.toString(),
            username: newMessage.sender.username,
          },
          content: newMessage.content,
          room: newMessage.room,
          replyTo: newMessage.replyTo,
          reactions: newMessage.reactions || [],
          createdAt: newMessage.createdAt,
        };

        // Envoyer le message immédiatement
        io.to(room).emit('receive_message', enrichedMessage);
        
        // Puis traiter la logique de jeu si nécessaire
        if (room === 'Game') {
          // Traiter la réponse de jeu de manière asynchrone
          setImmediate(() => {
            gameHandlers.handleChatMessage(socket, { room, message: content }, io);
          });
        }

      } catch (error) {
        console.error('Error processing message:', error);
      }
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
        // Store in our mapping
        userIdToUsername.set(currentUserId, username);

        // Mettre à jour le statut en ligne dans la base de données
        await User.findByIdAndUpdate(user._id, {
          isOnline: true,
          lastSeen: new Date()
        });
      } else {
        // For anonymous users, use a temporary ID
        currentUserId = `anon_${socket.id}`;
        socket.userId = currentUserId;
        socket.username = username;
        // Don't store anonymous in userIdToUsername mapping
      }

      if (!connectedUsers.has(username)) {
        connectedUsers.set(username, new Set());
      }

      connectedUsers.get(username).add(socket.id);
      emitUserList();
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
    } catch (error) {
      console.error("Error in update_username:", error);
    }
  });

  // --- Join a private room (between two users) ---
  socket.on('join_private_room', ({ senderId, recipientId }) => {
    const roomId = getPrivateRoomId(senderId, recipientId);
    socket.join(roomId);
    console.log(`📥 User ${senderId} joined private room: ${roomId}`);
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
        .populate('sender', 'username email')
        .sort({ createdAt: 1 });

      const roomId = getPrivateRoomId(userId, recipientId);
      io.to(roomId).emit('message_history', messages);
    } catch (error) {
      console.error("Error while fetching message history:", error);
    }
  });

  // --- Send a private message ---
  socket.on('send_private_message', async ({ senderId, recipientId, content, media_url, media_type }) => {
    try {
      const newMessage = await Message.create({
        sender: senderId,
        recipient: recipientId,
        content,
        media_url,
        media_type,
      });

      await newMessage.populate('sender', 'username email');

      const roomId = getPrivateRoomId(senderId, recipientId);
      io.to(roomId).emit('receive_private_message', newMessage);
      console.log(`📨 New message sent in room ${roomId}`, { content, media_url, media_type });

      // Get recipient's username from their ID
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
    const usernames = Array.from(connectedUsers.keys());
    io.emit('update_user_list', usernames);
  }

  // --- Generate a consistent private room ID for two users ---
  function getPrivateRoomId(userId1, userId2) {
    return [userId1, userId2].sort().join('_');
  }
};