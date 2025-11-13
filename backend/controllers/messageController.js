const Message = require("../models/Message");

class MessageController {

  // Retrieve public messages for a given room
  async getMessagesByChanel(req, res) {
    const { room } = req.params;
    try {
      const messages = await Message.find({ room })
        .populate('sender', 'username email avatarUrl')
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
      await message.populate('sender', 'username email avatarUrl');
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
      .populate('sender', 'username email avatarUrl')
      .sort({ createdAt: 1 });

      res.status(200).json(messages);
    } catch (error) {
      console.error("Error while fetching private messages:", error);
      res.status(500).json({ error: "Internal server error while fetching private messages." });
    }
  }

  // Send a private message
  async sendPrivateMessage(req, res, io) { 
    const { content, sender, recipient, media_url, media_type } = req.body;

    if (!sender || !recipient) {
      return res.status(400).json({ error: "Sender and recipient are required." });
    }

    if (!content && (!media_url || !media_type)) {
      return res.status(400).json({ error: "Message must contain either text 'content' or 'media_url' and 'media_type'." });
    }

    try {
      const message = await Message.create({
        content,
        sender,
        recipient,
        media_url,
        media_type,
      });

      await message.populate('sender', 'username email avatarUrl');

      const getPrivateRoomId = (userId1, userId2) => {
        return [userId1, userId2].sort().join('_');
      };

      const roomId = getPrivateRoomId(sender, recipient);

      io.to(roomId).emit('receive_private_message', message);
      console.log(`📨 Nouveau message privé envoyé et émis vers la salle ${roomId}`);

      res.status(201).json(message);
      return message;

    } catch (error) {
      console.error("Erreur lors de l'envoi du message privé dans le contrôleur:", error);
      res.status(500).json({ error: "Échec de l'envoi du message privé." });
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
      .populate('sender', 'username email avatarUrl')
      .populate('recipient', 'username email avatarUrl')
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

  // Add reaction to message
  async addReaction(req, res) {
    const { messageId } = req.params;
    const { emoji, userId } = req.body;

    try {
      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      // Remove user from all existing reactions first (one reaction per user)
      message.reactions.forEach(reaction => {
        reaction.users = reaction.users.filter(id => id.toString() !== userId);
        reaction.count = reaction.users.length;
      });
      // Remove empty reactions
      message.reactions = message.reactions.filter(r => r.count > 0);

      const existingReaction = message.reactions.find(r => r.emoji === emoji);
      
      if (existingReaction) {
        // Add user to this reaction
        existingReaction.users.push(userId);
        existingReaction.count = existingReaction.users.length;
      } else {
        // Create new reaction
        message.reactions.push({
          emoji,
          users: [userId],
          count: 1
        });
      }

      await message.save();
      res.status(200).json(message);
    } catch (error) {
      console.error("Error adding reaction:", error);
      res.status(500).json({ error: "Failed to add reaction" });
    }
  }
}

module.exports = new MessageController();