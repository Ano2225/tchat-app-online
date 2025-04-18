const User = require("../models/User");

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
};
