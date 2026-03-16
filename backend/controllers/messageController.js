const Message = require("../models/Message");
const User = require("../models/User");
const { ObjectId } = require('mongodb');

/**
 * Build a MongoDB query for a user ID that handles both:
 *  - 32-char better-auth string IDs  → { _id: id }
 *  - 24-char legacy ObjectId IDs     → { $or: [{ _id: id }, { _id: ObjectId(id) }] }
 */
function buildIdQuery(id) {
  const isObjectId = /^[0-9a-f]{24}$/i.test(id);
  return isObjectId
    ? { $or: [{ _id: id }, { _id: new ObjectId(id) }] }
    : { _id: id };
}

/**
 * Resolve a sender ID to a display object.
 */
function fallbackSender(rawId, displayName = null) {
  const id = rawId ? String(rawId) : null;
  if (displayName) return { _id: id, username: displayName, avatarUrl: null, sexe: null };
  if (!id) return { _id: null, username: 'Utilisateur supprimé', avatarUrl: null, sexe: null };
  if (id.startsWith('anon_')) {
    const username = id.slice(5) || 'Anonyme';
    return { _id: id, username, avatarUrl: null, sexe: null };
  }
  return { _id: id, username: 'Utilisateur supprimé', avatarUrl: null, sexe: null };
}

/**
 * Manually populate sender for a list of lean message objects.
 * Uses User.collection.find() to bypass Mongoose _id:false schema quirks.
 * Handles both 32-char string IDs and legacy 24-char ObjectId IDs.
 */
async function populateSenders(msgs) {
  const rawIds = [...new Set(
    msgs.map(m => m.sender).filter(id => id && !String(id).startsWith('anon_'))
  )];
  if (!rawIds.length) {
    return msgs.map(msg => ({
      ...msg,
      sender: fallbackSender(String(msg.sender ?? ''), msg.senderUsername || null)
    }));
  }

  // Build a query that handles both string and ObjectId _ids
  const orClauses = rawIds.flatMap(id => {
    const str = String(id);
    if (/^[0-9a-f]{24}$/i.test(str)) {
      return [{ _id: str }, { _id: new ObjectId(str) }];
    }
    return [{ _id: str }];
  });

  const users = await User.collection
    .find({ $or: orClauses }, { projection: { username: 1, avatarUrl: 1, sexe: 1, email: 1 } })
    .toArray();

  // Index by string representation of _id (covers both ObjectId and string stored values)
  const userMap = new Map(users.map(u => [String(u._id), u]));

  return msgs.map(msg => {
    const rawId = String(msg.sender ?? '');
    const found = rawId ? userMap.get(rawId) : null;
    if (found) return { ...msg, sender: { _id: String(found._id), username: found.username, avatarUrl: found.avatarUrl || null, sexe: found.sexe || null } };
    return { ...msg, sender: fallbackSender(rawId, msg.senderUsername || null) };
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
      const senderUser = await User.collection.findOne(
        buildIdQuery(sender),
        { projection: { username: 1 } }
      );
      const message = await Message.create({ content, sender, senderUsername: senderUser?.username || null, room });
      const payload = {
        ...message.toObject(),
        _id: message._id.toString(),
        sender: { _id: sender, username: senderUser?.username || 'Utilisateur', avatarUrl: null, sexe: null }
      };
      res.status(201).json(payload);
    } catch (error) {
      console.error("Error while sending message:", error);
      res.status(500).json({ error: "Failed to send message." });
    }
  }

  // Retrieve the private message history between two users
  async getPrivateMessages(req, res) {
    const { userId, recipientId } = req.params;

    try {
      // Check blocking in both directions using collection.findOne to handle mixed ID types
      const [u1, u2] = await Promise.all([
        User.collection.findOne(buildIdQuery(userId), { projection: { blockedUsers: 1 } }),
        User.collection.findOne(buildIdQuery(recipientId), { projection: { blockedUsers: 1 } }),
      ]);
      const u1Blocked = (u1?.blockedUsers || []).map(String);
      const u2Blocked = (u2?.blockedUsers || []).map(String);
      const blockedByMe   = u1Blocked.includes(String(recipientId));
      const blockedByThem = u2Blocked.includes(String(userId));
      if (blockedByMe || blockedByThem) {
        return res.status(200).json({ blocked: true, blockedByMe, blockedByThem, messages: [] });
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

  // Send a private message (REST fallback — frontend uses socket)
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
      // Check blocking using collection.findOne to handle mixed ID types
      const [senderUser, recipientUser] = await Promise.all([
        User.collection.findOne(buildIdQuery(sender), { projection: { blockedUsers: 1, username: 1 } }),
        User.collection.findOne(buildIdQuery(recipient), { projection: { blockedUsers: 1 } }),
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

      // Build sender object manually — avoid populate() which fails with mixed ID types
      const messagePayload = {
        _id: message._id.toString(),
        sender: {
          _id: sender,
          username: senderUser?.username || 'Utilisateur',
          avatarUrl: null,
          sexe: null,
        },
        recipient,
        content: message.content,
        media_url: message.media_url || null,
        media_type: message.media_type || null,
        createdAt: message.createdAt,
        replyTo: message.replyTo || null,
      };

      const getPrivateRoomId = (id1, id2) => [id1, id2].sort().join('_');
      const roomId = getPrivateRoomId(sender, recipient);
      io.to(roomId).emit('receive_private_message', messagePayload);

      res.status(201).json(messagePayload);
    } catch (error) {
      console.error("Erreur lors de l'envoi du message privé:", error);
      res.status(500).json({ error: "Échec de l'envoi du message privé." });
    }
  }

  async getUserConversations(req, res) {
    const { userId } = req.params;

    try {
      // Get caller's blocked list
      const callerUser = await User.collection.findOne(
        buildIdQuery(userId),
        { projection: { blockedUsers: 1 } }
      );
      const blockedSet = new Set(callerUser?.blockedUsers || []);

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

      // Collect all unique user IDs needed
      const allIds = new Set();
      for (const entry of aggregation) {
        if (entry._id) allIds.add(String(entry._id));
        if (entry.lastMessage?.sender)    allIds.add(String(entry.lastMessage.sender));
        if (entry.lastMessage?.recipient) allIds.add(String(entry.lastMessage.recipient));
      }

      // Build a fake msgs array to reuse populateSenders logic
      const registeredIds = [...allIds].filter(id => !id.startsWith('anon_'));
      const orClauses = registeredIds.flatMap(id => {
        if (/^[0-9a-f]{24}$/i.test(id)) return [{ _id: id }, { _id: new ObjectId(id) }];
        return [{ _id: id }];
      });
      const usersFound = orClauses.length
        ? await User.collection.find({ $or: orClauses }, { projection: { username: 1, avatarUrl: 1, sexe: 1 } }).toArray()
        : [];
      const userMap = new Map(usersFound.map(u => [String(u._id), u]));
      const resolveUser = (rawId) => {
        if (!rawId) return null;
        const str = String(rawId);
        const found = userMap.get(str);
        if (found) return { _id: String(found._id), username: found.username, avatarUrl: found.avatarUrl || null, sexe: found.sexe || null };
        return fallbackSender(str);
      };

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

      message.reactions.forEach(reaction => {
        reaction.users = reaction.users.filter(id => id.toString() !== userId);
        reaction.count = reaction.users.length;
      });
      message.reactions = message.reactions.filter(r => r.count > 0);

      const existingReaction = message.reactions.find(r => r.emoji === emoji);
      if (existingReaction) {
        existingReaction.users.push(userId);
        existingReaction.count = existingReaction.users.length;
      } else {
        message.reactions.push({ emoji, users: [userId], count: 1 });
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
