const User = require("../models/User");

module.exports = (io, socket) => {
  console.log('Client connecté avec ID :', socket.id);

  socket.on('join_room', (room) => {
    socket.join(room);
    socket.currentRoom = room; // stocke la room actuelle dans le socket
    console.log(`Utilisateur ${socket.id} a rejoint la room ${room}`);
  });

  socket.on('leave_room', () => {
    if (socket.currentRoom) {
      socket.leave(socket.currentRoom);
      console.log(`Utilisateur ${socket.id} a quitté la room ${socket.currentRoom}`);
      delete socket.currentRoom;
    }
  });

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

  socket.on('disconnect', () => {
    console.log(`Client ${socket.id} déconnecté`);
  });
};
