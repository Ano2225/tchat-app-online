const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authBetter');
const { csrfProtection } = require('../middleware/csrf');
const MessageController = require('../controllers/MessageController');

module.exports = (io) => {
  // Show Messages by Channel
  router.get('/:room', authMiddleware, MessageController.getMessagesByChanel);
  router.post('/', authMiddleware, csrfProtection, MessageController.createMessage);

  // Private Messages
  router.get('/private/:userId/:recipientId', authMiddleware, MessageController.getPrivateMessages);

  router.post('/private', authMiddleware, csrfProtection, async (req, res, next) => {
    try {
      await MessageController.sendPrivateMessage(req, res, io);
    } catch (error) {
      console.error('error during send private message', error);
      next(error);
    }
  });
  
  router.get('/conversations/:userId', authMiddleware, MessageController.getUserConversations);

  router.post('/mark-as-read', authMiddleware, csrfProtection, async (req, res, next) => {
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

  // Reactions
  router.post('/reaction/:messageId', authMiddleware, csrfProtection, MessageController.addReaction);

  return router;
};