const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const MessageController = require('../controllers/MessageController');

module.exports = (io) => {
  // Show Messages by Channel
  router.get('/:room', authMiddleware, MessageController.getMessagesByChanel);
  router.post('/', authMiddleware, MessageController.createMessage);

  // Private Messages
  router.get('/private/:userId/:recipientId', authMiddleware, MessageController.getPrivateMessages);
  router.post('/private', authMiddleware, async (req, res, next) => {
    const { content, sender, recipient } = req.body;

    if (!content || !sender || !recipient) {
      return res.status(400).json({ error: "Tous les champs sont requis !." });
    }

    try {
      const newMessage = await MessageController.sendPrivateMessage(req, res);
      if (res.statusCode === 201 && newMessage) {
        const getPrivateRoomId = (userId1, userId2) => {
          return [userId1, userId2].sort().join('_');
        };

        const roomId = getPrivateRoomId(sender, recipient);

        // Emit the Socket.IO event to the private room
        io.to(roomId).emit('receive_private_message', newMessage);
        console.log(`📨 New private message sent and emitted to room ${roomId}`);
      }

    } catch (error) {
      console.error('Error while sending private message in route:', error);
      next(error);
    }
  });
  router.get('/conversations/:userId', authMiddleware, MessageController.getUserConversations);

  router.post('/mark-as-read', authMiddleware, async (req, res, next) => {
    try {
      await MessageController.markMessagesAsRead(req, res);

      if (res.statusCode === 200) {
        const { userId, conversationId } = req.body;

        const getPrivateRoomId = (id1, id2) => {
          return [id1, id2].sort().join('_');
        };

        const roomId = getPrivateRoomId(userId, conversationId);
        io.to(roomId).emit('messages_read', {
          readerId: userId,
          senderId: conversationId,
        });
        console.log(`KVM 📖 Messages marked as read in room ${roomId} by user ${userId}`);
      }
    } catch (error) {
      next(error);
    }
  });

  return router;
};