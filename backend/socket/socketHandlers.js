module.exports = (io, socket) => {
    console.log('Client connecté avec ID :', socket.id);
  
    socket.on('join_room', (room) => {
      socket.join(room);
      console.log(`Utilisateur ${socket.id} a rejoint le salon ${room}`);
    });
  
    socket.on('send_message', (messageData) => {
      const { room, message, username } = messageData;
      if (room && message && username) {
        io.to(room).emit('receive_message', {
          username,
          message,
          timestamp: new Date(),
        });
      }
    });
  
    socket.on('disconnect', () => {
      console.log(`Client ${socket.id} déconnecté`);
    });
  };
  