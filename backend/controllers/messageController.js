const Message = require("../models/Message");
const User = require("../models/User");

/**
 * Resolve a sender ID to a display object.
 * Called with the RAW ID (always available via lean()) so we never lose it.
 *
 *  anon_<username>   → { username } — anonymous user, history preserved by username
 *  24-char hex       → "Ancien utilisateur" — message pre-migration (ObjectId era)
 *  anything else     → "Utilisateur supprimé" — registered user whose account was deleted
 */
function fallbackSender(rawId, displayName = null) {
  const id = rawId ? String(rawId) : null;

  // Priority: use saved username if available (covers deleted accounts gracefully)
  if (displayName) return { _id: id, username: displayName, avatarUrl: null, sexe: null };

  if (!id) return { _id: null, username: 'Utilisateur supprimé', avatarUrl: null, sexe: null };

  // Anonymous user — extract username from stable ID "anon_<username>"
  if (id.startsWith('anon_')) {
    const username = id.slice(5) || 'Anonyme';
    return { _id: id, username, avatarUrl: null, sexe: null };
  }

  // Legacy ObjectId or deleted account with no saved username
  return { _id: id, username: 'Utilisateur supprimé', avatarUrl: null, sexe: null };
}

/**
 * Manually populate sender for a list of lean message objects.
 * Using lean() preserves the raw sender ID so fallbackSender always has it,
 * unlike Mongoose .populate() which silently sets sender=null on lookup failure.
 */
async function populateSenders(msgs) {
  // Collect all non-anon sender IDs that need a DB lookup
  const registeredIds = [...new Set(
    msgs.map(m => m.sender).filter(id => id && !String(id).startsWith('anon_'))
  )];

  // Single query for all registered users
  const users = registeredIds.length
    ? await User.find({ _id: { $in: registeredIds } }).select('username avatarUrl sexe email').lean()
    : [];
  const userMap = new Map(users.map(u => [String(u._id), u]));

  return msgs.map(msg => {
    const rawId = String(msg.sender ?? '');
    const found = rawId ? userMap.get(rawId) : null;
    if (found) return { ...msg, sender: found };
    // User not found in DB — use denormalized senderUsername saved at write time
    const displayName = msg.senderUsername || null;
    return { ...msg, sender: fallbackSender(rawId, displayName) };
  });
}

class MessageController {

  // Retrieve public messages for a given room (paginated)
  async getMessagesByChanel(req, res) {
    const { room } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const before = req.query.before; // cursor: ISO date or ObjectId of oldest message loaded
    try {
      const filter = before
        ? { room, createdAt: { $lt: new Date(before) } }
        : { room };

      const raw = await Message.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const messages = await populateSenders(raw.reverse());
      res.status(200).json(messages);
    } catch (error) {
      console.error('Error while fetching messages:', error);
      res.status(500).json({ error: "Internal server error while fetching messages." });
    }
  }

  // Send a message in a public room
  async createMessage(req, res) {
    const { content, room } = req.body;
    const sender = req.user?._id || req.user?.id;

    if (!content || !sender || !room) {
      return res.status(400).json({ error: "All fields are required." });
    }

    try {
      const senderUser = await User.findById(sender).select('username').lean();
      const message = await Message.create({ content, sender, senderUsername: senderUser?.username || null, room });
      await message.populate('sender', 'username email avatarUrl sexe');
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
      // Check blocking in both directions
      const [u1, u2] = await Promise.all([
        User.findById(userId).select('blockedUsers').lean(),
        User.findById(recipientId).select('blockedUsers').lean(),
      ]);
      const u1Blocked = u1?.blockedUsers || [];
      const u2Blocked = u2?.blockedUsers || [];
      if (u1Blocked.includes(recipientId) || u2Blocked.includes(userId)) {
        return res.status(403).json({ error: 'Utilisateur bloqué', isBlocked: true });
      }

      const raw = await Message.find({
        $or: [
          { sender: userId, recipient: recipientId },
          { sender: recipientId, recipient: userId }
        ]
      })
      .sort({ createdAt: 1 })
      .lean();

      const messages = await populateSenders(raw);
      res.status(200).json(messages);
    } catch (error) {
      console.error("Error while fetching private messages:", error);
      res.status(500).json({ error: "Internal server error while fetching private messages." });
    }
  }

  // Send a private message
  async sendPrivateMessage(req, res, io) {
    const { content, recipient, media_url, media_type } = req.body;
    const sender = req.user?._id || req.user?.id;

    if (!sender || !recipient) {
      return res.status(400).json({ error: "Sender and recipient are required." });
    }

    if (!content && (!media_url || !media_type)) {
      return res.status(400).json({ error: "Message must contain either text 'content' or 'media_url' and 'media_type'." });
    }

    try {
      // Check blocking before creating message
      const [senderUser, recipientUser] = await Promise.all([
        User.findById(sender).select('blockedUsers username').lean(),
        User.findById(recipient).select('blockedUsers').lean(),
      ]);
      const sBlocked = senderUser?.blockedUsers || [];
      const rBlocked = recipientUser?.blockedUsers || [];
      if (sBlocked.includes(recipient) || rBlocked.includes(sender)) {
        return res.status(403).json({ error: 'Utilisateur bloqué', isBlocked: true });
      }

      const message = await Message.create({
        content,
        sender,
        senderUsername: senderUser?.username || null,
        recipient,
        media_url,
        media_type,
      });

      await message.populate('sender', 'username email avatarUrl sexe');

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
      // Get caller's blocked list to exclude those conversations
      const callerUser = await User.findById(userId).select('blockedUsers').lean();
      const blockedSet = new Set(callerUser?.blockedUsers || []);

      // Single aggregation: get last message + unread count per conversation partner
      // sender/recipient are stored as strings (better-auth 32-char IDs), no ObjectId cast needed
      const aggregation = await Message.aggregate([
        {
          $match: {
            recipient: { $ne: null },
            $or: [
              { sender: userId },
              { recipient: userId }
            ]
          }
        },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: {
              $cond: [
                { $eq: ['$sender', userId] },
                '$recipient',
                '$sender'
              ]
            },
            lastMessage: { $first: '$$ROOT' },
            unreadCount: {
              $sum: {
                $cond: [
                  { $and: [
                    { $eq: ['$recipient', userId] },
                    { $eq: ['$read', false] }
                  ]},
                  1, 0
                ]
              }
            }
          }
        }
      ]);

      // Collect all unique user IDs needed (partner + lastMessage participants)
      const allIds = new Set();
      for (const entry of aggregation) {
        if (entry._id) allIds.add(String(entry._id));
        if (entry.lastMessage?.sender)    allIds.add(String(entry.lastMessage.sender));
        if (entry.lastMessage?.recipient) allIds.add(String(entry.lastMessage.recipient));
      }
      // Only look up registered users (not anon_ IDs)
      const registeredIds = [...allIds].filter(id => !id.startsWith('anon_'));
      const usersFound = registeredIds.length
        ? await User.find({ _id: { $in: registeredIds } }).select('username avatarUrl sexe email').lean()
        : [];
      const userMap = new Map(usersFound.map(u => [String(u._id), u]));
      const resolveUser = (rawId) => rawId ? (userMap.get(String(rawId)) || fallbackSender(String(rawId))) : null;

      const conversations = aggregation
        .filter(entry => {
          const partnerId = String(entry._id ?? '');
          return partnerId && !blockedSet.has(partnerId);
        })
        .map(entry => ({
          user: resolveUser(entry._id),
          lastMessage: {
            ...entry.lastMessage,
            sender:    resolveUser(entry.lastMessage?.sender),
            recipient: resolveUser(entry.lastMessage?.recipient),
          },
          hasNewMessages: entry.unreadCount > 0,
          unreadCount: entry.unreadCount
        }));

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