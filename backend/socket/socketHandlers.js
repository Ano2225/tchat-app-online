const User = require("../models/User");

module.exports = (io, socket) => {
  console.log('Client connecté avec ID :', socket.id);

  socket.on('join_room', (room) => {
    socket.join(room);
    console.log(`Utilisateur ${socket.id} a rejoint le salon ${room}`);
  });

  socket.on('send_message', async (messageData) => {
    const { room, sender, content } = messageData;
  
    if (room && sender && content) {
      try {
        const user = await User.findById(sender);
        if (!user) return;
  
        io.to(room).emit('receive_message', {
          _id: Date.now().toString(),
          sender: {
            _id: user._id,
            username: user.username,
          },
          content,
          createdAt: new Date(),
        });
      } catch (err) {
        console.error('Erreur socket:', err);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client ${socket.id} déconnecté`);
  });
};
