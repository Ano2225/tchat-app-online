const User = require("../models/User");
const Message = require("../models/Message")

// username -> Set of socket IDs
const connectedUsers = new Map();

module.exports = (io, socket) => {
  console.log('Client connecté avec ID :', socket.id);

  let currentUsername = null;

  // --- Rejoindre une room ---
  socket.on('join_room', (room) => {
    socket.join(room);
    socket.currentRoom = room;
    console.log(`Utilisateur ${socket.id} a rejoint la room ${room}`);
  });

  // --- Quitter une room ---
  socket.on('leave_room', () => {
    if (socket.currentRoom) {
      socket.leave(socket.currentRoom);
      console.log(`Utilisateur ${socket.id} a quitté la room ${socket.currentRoom}`);
      delete socket.currentRoom;
    }
  });

  // --- Envoi de message ---
  socket.on('send_message', async (messageData) => {
    const { sender, content, room } = messageData;
    if (room && sender && content) {
      const user = await User.findById(sender);
      if (!user) return;

      const enrichedMessage = {
        _id: Date.now().toString(),
        sender: {
          _id: user._id.toString(),
          username: user.username,
        },
        content,
        createdAt: new Date(),
      };

      io.to(room).emit('receive_message', enrichedMessage);
    }
  });

  // --- Connexion initiale ---
  socket.on('user_connected', (username) => {
    currentUsername = username;

    if (!connectedUsers.has(username)) {
      connectedUsers.set(username, new Set());
    }

    connectedUsers.get(username).add(socket.id);
    emitUserList();
  });

  // --- Mise à jour du nom d'utilisateur ---
  socket.on('update_username', (newUsername) => {
    if (!newUsername || newUsername === currentUsername) return;

    // Retirer l'ancien username
    if (currentUsername && connectedUsers.has(currentUsername)) {
      connectedUsers.get(currentUsername).delete(socket.id);
      if (connectedUsers.get(currentUsername).size === 0) {
        connectedUsers.delete(currentUsername);
      }
    }

    // Ajouter le nouveau username
    currentUsername = newUsername;
    if (!connectedUsers.has(newUsername)) {
      connectedUsers.set(newUsername, new Set());
    }
    connectedUsers.get(newUsername).add(socket.id);

    emitUserList();
  });

 
   // Rejoindre une room privée
   socket.on('join_private_room', ({ senderId, recipientId }) => {
    const roomId = getPrivateRoomId(senderId, recipientId);
    socket.join(roomId);
    console.log(`📥 Utilisateur ${senderId} a rejoint la room privée : ${roomId}`);
  });

  // Récupération de l'historique
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
      console.error("Erreur lors de la récupération de l'historique :", error);
    }
  });

  // Envoi d'un message privé
  socket.on('send_private_message', async ({ senderId, recipientId, content }) => {
    try {
      const newMessage = await Message.create({
        sender: senderId,
        recipient: recipientId,
        content,
      });

      await newMessage.populate('sender', 'username email');

      const roomId = getPrivateRoomId(senderId, recipientId);
      io.to(roomId).emit('receive_private_message', newMessage);

      console.log(`📨 Nouveau message envoyé dans room ${roomId}`);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message privé :', error);
    }
  });



  // --- Déconnexion ---
  socket.on('disconnect', () => {
    console.log(`Client ${socket.id} déconnecté`);

    if (currentUsername && connectedUsers.has(currentUsername)) {
      connectedUsers.get(currentUsername).delete(socket.id);
      if (connectedUsers.get(currentUsername).size === 0) {
        connectedUsers.delete(currentUsername);
      }

      emitUserList();
    }
  });

  // --- Émettre la liste des utilisateurs connectés ---
  function emitUserList() {
    const usernames = Array.from(connectedUsers.keys());
    io.emit('update_user_list', usernames);
  }

  function getPrivateRoomId(userId1, userId2) {
    return [userId1, userId2].sort().join('_');
  }
  
};
