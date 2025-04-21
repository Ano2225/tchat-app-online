const User = require("../models/User");
const Message = require("../models/Message");

// username -> Set of socket IDs
const connectedUsers = new Map();

module.exports = (io, socket) => {
  console.log('Client connected with ID:', socket.id);

  let currentUsername = null;

  // --- Join a public room ---
  socket.on('join_room', (room) => {
    socket.join(room);
    socket.currentRoom = room;
    console.log(`User ${socket.id} joined room ${room}`);
  });

  // --- Leave a public room ---
  socket.on('leave_room', () => {
    if (socket.currentRoom) {
      socket.leave(socket.currentRoom);
      console.log(`User ${socket.id} left room ${socket.currentRoom}`);
      delete socket.currentRoom;
    }
  });

  // --- Send a message to a public room ---
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

  // --- Handle user connection ---
  socket.on('user_connected', (username) => {
    currentUsername = username;

    if (!connectedUsers.has(username)) {
      connectedUsers.set(username, new Set());
    }

    connectedUsers.get(username).add(socket.id);
    emitUserList();
  });

  // --- Update username (e.g. after login or change) ---
  socket.on('update_username', (newUsername) => {
    if (!newUsername || newUsername === currentUsername) return;

    // Remove old username entry
    if (currentUsername && connectedUsers.has(currentUsername)) {
      connectedUsers.get(currentUsername).delete(socket.id);
      if (connectedUsers.get(currentUsername).size === 0) {
        connectedUsers.delete(currentUsername);
      }
    }

    // Add new username entry
    currentUsername = newUsername;
    if (!connectedUsers.has(newUsername)) {
      connectedUsers.set(newUsername, new Set());
    }
    connectedUsers.get(newUsername).add(socket.id);

    emitUserList();
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
      console.log(`📨 New message sent in room ${roomId}`);

      // --- Real-time notification to recipient ---
      const recipientSockets = connectedUsers.get(recipientId.toString());
      if (recipientSockets) {
        recipientSockets.forEach(socketId => {
          io.to(socketId).emit('notify_user', {
            from: {
              _id: newMessage.sender._id,
              username: newMessage.sender.username,
            },
            content: newMessage.content,
            createdAt: newMessage.createdAt,
          });
        });
      }

    } catch (error) {
      console.error('Error while sending private message:', error);
    }
  });

  // --- Handle disconnection ---
  socket.on('disconnect', () => {
    console.log(`Client ${socket.id} disconnected`);

    if (currentUsername && connectedUsers.has(currentUsername)) {
      connectedUsers.get(currentUsername).delete(socket.id);
      if (connectedUsers.get(currentUsername).size === 0) {
        connectedUsers.delete(currentUsername);
      }

      emitUserList();
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
