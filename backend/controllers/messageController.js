const Message = require("../models/Message");

class MessageController {

  // Retrieve public messages for a given room
  async getMessagesByChanel(req, res) {
    const { room } = req.params;
    try {
      const messages = await Message.find({ room })
        .populate('sender', 'username email')
        .sort({ createdAt: 1 });

      res.status(200).json(messages);
    } catch (error) {
      console.error('Error while fetching messages:', error);
      res.status(500).json({ error: "Internal server error while fetching messages." });
    }
  }

  // Send a message in a public room
  async createMessage(req, res) {
    const { content, sender, room } = req.body;

    if (!content || !sender || !room) {
      return res.status(400).json({ error: "All fields are required." });
    }

    try {
      const message = await Message.create({ content, sender, room });
      await message.populate('sender', 'username email');
      res.status(201).json(message);
    } catch (error) {
      console.error("Error while sending message:", error);
      res.status(500).json({ error: "Failed to send message." });
    }
  }

  // Retrieve the private message history between two users
  async getPrivateMessages(req, res) {
    const { userId, recipientId } = req.params;

    try {
      const messages = await Message.find({
        $or: [
          { sender: userId, recipient: recipientId },
          { sender: recipientId, recipient: userId }
        ]
      })
      .populate('sender', 'username email')
      .sort({ createdAt: 1 });

      res.status(200).json(messages);
    } catch (error) {
      console.error("Error while fetching private messages:", error);
      res.status(500).json({ error: "Internal server error while fetching private messages." });
    }
  }

  // Send a private message
  async sendPrivateMessage(req, res) {
    const { content, sender, recipient } = req.body;

    if (!content || !sender || !recipient) {
      return res.status(400).json({ error: "All fields are required." });
    }

    try {
      const message = await Message.create({
        content,
        sender,
        recipient,
      });

      await message.populate('sender', 'username email');

      res.status(201).json(message);
      return message;

    } catch (error) {
      console.error("Error while sending private message in controller:", error);
      res.status(500).json({ error: "Failed to send private message." });
      throw error;
    }
  }

  async getUserConversations(req, res) {
    const { userId } = req.params;

    try {
      // Retrieve all relevant messages for the user
      const messages = await Message.find({
        recipient: { $ne: null },
        $or: [
          { sender: userId },
          { recipient: userId }
        ]
      })
      .populate('sender', 'username email')
      .populate('recipient', 'username email')
      .sort({ createdAt: -1 });

      // Group by participant
      const conversationMap = new Map();

      for (const msg of messages) {
        const otherUser = msg.sender._id.toString() === userId
          ? msg.recipient
          : msg.sender;

        if (!otherUser) continue;

        const otherUserId = otherUser._id.toString();

        if (!conversationMap.has(otherUserId)) {
          // Explicitly retrieve the number of unread messages
          const unreadCount = await Message.countDocuments({
            sender: otherUserId,
            recipient: userId,
            read: false
          });

          conversationMap.set(otherUserId, {
            user: otherUser,
            lastMessage: msg,
            hasNewMessages: unreadCount > 0,
            unreadCount: unreadCount 
          });
        }
      }

      const conversations = Array.from(conversationMap.values());
      res.status(200).json(conversations);
    } catch (error) {
      console.error("Error while fetching conversations:", error);
      res.status(500).json({ error: "Internal server error while fetching conversations." });
    }
  }

  // Mark messages as read
  async markMessagesAsRead(req, res) {
    const { userId, conversationId } = req.body;

    try {
      await Message.updateMany(
        { sender: conversationId, recipient: userId, read: false },
        { $set: { read: true } }
      );

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error while updating messages as read:", error);
      res.status(500).json({ error: "Error while updating messages." });
    }
  }
}

module.exports = new MessageController();