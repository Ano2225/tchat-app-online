const User = require("../models/User");
const Message = require("../models/Message");
const aiService = require('../services/aiService');
const { ObjectId } = require('mongodb');
const gameHandlers = require('./gameHandlers');
const botService = require('../services/botService');

// ─── Socket-level rate limiting ─────────────────────────────────────────────
// 20 messages per minute per socket (matches HTTP messageRateLimit)
const MSG_RATE_WINDOW_MS = 60_000;
const MSG_RATE_MAX       = 20;
// socketId → { count, windowStart }
const socketMsgRateMap = new Map();

function isSocketRateLimited(socketId) {
  const now = Date.now();
  let entry = socketMsgRateMap.get(socketId);
  if (!entry || now - entry.windowStart > MSG_RATE_WINDOW_MS) {
    entry = { count: 1, windowStart: now };
    socketMsgRateMap.set(socketId, entry);
    return false;
  }
  entry.count += 1;
  return entry.count > MSG_RATE_MAX;
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - MSG_RATE_WINDOW_MS;
  for (const [id, entry] of socketMsgRateMap.entries()) {
    if (entry.windowStart < cutoff) socketMsgRateMap.delete(id);
  }
}, 5 * 60_000);

// ─── In-memory presence store ────────────────────────────────────────────────
// username → Set<socketId>
const connectedUsers = new Map();
// userId (string) → username
const userIdToUsername = new Map();

// ─── Debounce helpers ────────────────────────────────────────────────────────
// Avoid broadcasting a new user-list for every individual join/leave when
// multiple connections arrive in the same tick (e.g. 100 users reconnecting).
const roomDebounceTimers = new Map();
let globalListDebounceTimer = null;

function scheduleRoomUserList(room) {
  if (roomDebounceTimers.has(room)) clearTimeout(roomDebounceTimers.get(room));
  roomDebounceTimers.set(room, setTimeout(() => {
    roomDebounceTimers.delete(room);
    emitRoomUserList(room);
  }, 250));
}

function scheduleUserList() {
  if (globalListDebounceTimer) clearTimeout(globalListDebounceTimer);
  globalListDebounceTimer = setTimeout(() => {
    globalListDebounceTimer = null;
    emitUserList();
  }, 250);
}

// ─── Emit user lists — ZERO DB queries ───────────────────────────────────────
// User metadata (avatarUrl, sexe) is cached on socket.userMeta at connection
// time and reused here to avoid N queries per broadcast.

function emitUserList(io) {
  if (!io) return; // guard: io captured in module scope below
  const usersInfo = [];
  for (const [username, socketIds] of connectedUsers.entries()) {
    const socketId = Array.from(socketIds)[0];
    const s = socketId ? io.sockets.sockets.get(socketId) : null;
    usersInfo.push({
      username,
      userId: s?.userId || null,
      avatarUrl: s?.userMeta?.avatarUrl || null,
      sexe: s?.userMeta?.sexe || 'autre',
      role: s?.userMeta?.role || null,
      statut: s?.userMeta?.statut || null,
      isBot: false,
    });
  }
  // Append bot profiles so they appear in the online list
  const { BOT_PROFILES } = require('./botProfiles');
  for (const bot of BOT_PROFILES) {
    usersInfo.push({
      username:  bot.username,
      userId:    bot.id,
      avatarUrl: bot.avatarUrl,
      sexe:      bot.sexe,
      isBot:     true,
    });
  }
  io.emit('update_user_list', usersInfo);
}

function emitRoomUserList(room, io) {
  if (!io) return;
  const seen = new Set();
  const usersInfo = [];

  const roomInfo = io.sockets.adapter.rooms.get(room);
  if (roomInfo) {
    for (const socketId of roomInfo) {
      const s = io.sockets.sockets.get(socketId);
      if (s && s.username && !seen.has(s.username)) {
        seen.add(s.username);
        usersInfo.push({
          username: s.username,
          userId:   s.userId || null,
          avatarUrl: s.userMeta?.avatarUrl || null,
          sexe:     s.userMeta?.sexe || 'autre',
          role:     s.userMeta?.role || null,
          statut:   s.userMeta?.statut || null,
          isBot:    false,
        });
      }
    }
  }

  // Always include bots that cover this room
  const { BOT_PROFILES } = require('./botProfiles');
  for (const bot of BOT_PROFILES) {
    if (bot.channels.includes(room) && !seen.has(bot.username)) {
      seen.add(bot.username);
      usersInfo.push({
        username:  bot.username,
        userId:    bot.id,
        avatarUrl: bot.avatarUrl,
        sexe:      bot.sexe,
        isBot:     true,
      });
    }
  }

  io.to(room).emit('update_room_user_list', { room, users: usersInfo });
}

// ─── Main handler ─────────────────────────────────────────────────────────────
module.exports = (io, socket) => {

  // Bind io into local closures so helpers above can use it
  const _emitUserList      = () => emitUserList(io);
  const _emitRoomUserList  = (room) => emitRoomUserList(room, io);
  const _scheduleRoomList  = (room) => {
    if (roomDebounceTimers.has(room)) clearTimeout(roomDebounceTimers.get(room));
    roomDebounceTimers.set(room, setTimeout(() => {
      roomDebounceTimers.delete(room);
      _emitRoomUserList(room);
    }, 250));
  };
  const _scheduleUserList = () => {
    if (globalListDebounceTimer) clearTimeout(globalListDebounceTimer);
    globalListDebounceTimer = setTimeout(() => {
      globalListDebounceTimer = null;
      _emitUserList();
    }, 250);
  };

  let currentUsername = null;
  let currentUserId   = null;

  // ── Join a public room ────────────────────────────────────────────────────
  socket.on('join_room', (room) => {
    if (!socket.userId || !socket.username) return;
    if (!room || typeof room !== 'string' || room.length > 50) return;

    socket.join(room);
    socket.currentRoom = room;
    _scheduleRoomList(room);

    // Bot engagement: greet the joining user (non-blocking)
    if (socket.username) {
      botService.onUserJoined(io, room, socket.username).catch(() => {});
    }
  });

  // ── Leave a public room ───────────────────────────────────────────────────
  socket.on('leave_room', (room) => {
    const target = room || socket.currentRoom;
    if (!target) return;
    socket.leave(target);
    if (socket.currentRoom === target) delete socket.currentRoom;
    _scheduleRoomList(target);
  });

  // ── Send a message to a public room ──────────────────────────────────────
  socket.on('send_message', async (messageData) => {
    const { content, room, replyTo, replyPreview } = messageData;
    if (!room || !content) return;

    if (isSocketRateLimited(socket.id)) {
      socket.emit('error', { message: 'Trop de messages. Attendez un moment.' });
      return;
    }

    try {
      const senderId = socket.userId;
      if (!senderId) return;

      // Hydrate socket metadata if missing (e.g. race on reconnect)
      if (!socket.userMeta) {
        if (senderId.startsWith('anon_')) {
          // Anonymous user — no DB record, use username from socket
          socket.username = socket.username || senderId.slice(5);
          socket.userMeta = { avatarUrl: null, sexe: null, role: null, statut: null };
        } else {
          const isObjId = /^[0-9a-f]{24}$/i.test(senderId);
          const user = await User.collection.findOne(
            isObjId ? { $or: [{ _id: senderId }, { _id: new ObjectId(senderId) }] } : { _id: senderId },
            { projection: { username: 1, avatarUrl: 1, sexe: 1, role: 1, statut: 1 } }
          );
          if (!user) return;
          socket.username = user.username;
          socket.userMeta = { avatarUrl: user.avatarUrl || null, sexe: user.sexe || null, role: user.role || 'user', statut: user.statut || null };
        }
      }

      // Auto-join if somehow not in room
      if (!Array.from(socket.rooms).includes(room)) {
        socket.join(room);
        socket.currentRoom = room;
      }

      // For the Game channel, let gameHandlers process potential answers first
      if (room === 'Game') {
        await gameHandlers.handleChatMessage(socket, { room, message: content }, io);
      }

      const newMessage = new Message({
        sender: senderId,
        senderUsername: socket.username || null,
        content,
        room,
        replyTo: replyTo || null,
      });

      // Broadcast first (optimistic), then persist
      io.to(room).emit('receive_message', {
        _id: newMessage._id.toString(),
        sender: {
          _id: senderId,
          username: socket.username,
          avatarUrl: socket.userMeta?.avatarUrl || undefined,
          sexe:      socket.userMeta?.sexe      || undefined,
          role:      socket.userMeta?.role      || undefined,
        },
        content,
        room,
        replyTo: replyPreview || null,
        reactions: [],
        createdAt: newMessage.createdAt,
      });

      newMessage.save().catch((err) => console.error('Message save error:', err));

      // ── @mention notifications ────────────────────────────────────────────
      const mentionRegex = /@([a-zA-Z0-9_]{1,50})/g;
      const mentionedNames = new Set();
      let m;
      while ((m = mentionRegex.exec(content)) !== null) {
        const name = m[1];
        if (name !== socket.username) mentionedNames.add(name);
      }
      for (const mentionedName of mentionedNames) {
        const socketIds = connectedUsers.get(mentionedName);
        if (!socketIds) continue;
        const notif = {
          fromUsername: socket.username,
          room,
          messageId: newMessage._id.toString(),
          preview: content.length > 120 ? content.slice(0, 120) + '…' : content,
          createdAt: newMessage.createdAt,
          senderAvatarUrl: socket.userMeta?.avatarUrl || null,
          senderSexe: socket.userMeta?.sexe || null,
        };
        for (const socketId of socketIds) {
          io.to(socketId).emit('mention_notification', notif);
        }
      }

      // Bot engagement: maybe respond if user mentions a bot name
      botService.onUserMessage(io, room, content, replyPreview).catch(() => {});

    } catch (err) {
      console.error('send_message error:', err);
    }
  });

  // ── Emoji reaction ────────────────────────────────────────────────────────
  // Two DB ops (findById + save) are unavoidable for reaction toggle logic.
  // We use lean() on the initial read then save only the reactions field.
  socket.on('add_reaction', async ({ messageId, emoji, room }) => {
    const userId = socket.userId;
    if (!userId) return;
    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      const username = socket.username;

      // Toggle: find if user already reacted
      const existing = message.reactions.find(r => r.users.some(u => u.id === userId));

      if (existing) {
        // Remove user from existing reaction
        existing.users = existing.users.filter(u => u.id !== userId);
        existing.count = existing.users.length;
        if (existing.count === 0) {
          message.reactions = message.reactions.filter(r => r.emoji !== existing.emoji);
        }
        // Same emoji = pure remove
        if (existing.emoji === emoji) {
          await message.save();
          io.to(room).emit('reaction_updated', { messageId, reactions: message.reactions });
          return;
        }
      }

      // Add/update reaction
      const target = message.reactions.find(r => r.emoji === emoji);
      if (target) {
        target.users.push({ id: userId, username });
        target.count = target.users.length;
      } else {
        message.reactions.push({ emoji, users: [{ id: userId, username }], count: 1 });
      }

      await message.save();
      io.to(room).emit('reaction_updated', { messageId, reactions: message.reactions });

    } catch (err) {
      console.error('add_reaction error:', err);
    }
  });

  // ── User connected (auth + anonymous) ────────────────────────────────────
  socket.on('user_connected', async (username) => {
    try {
      currentUsername = username;

      // socket.verifiedUserId / socket.verifiedUsername are set by the io.use() middleware
      // in server.js and are guaranteed to match a valid session — never trust client-supplied
      // IDs for authorization. We use verifiedUserId as the authoritative identity.
      const verifiedId = socket.verifiedUserId;

      // Reject if the claimed username doesn't match the verified session
      if (socket.verifiedUsername && username !== socket.verifiedUsername) {
        socket.emit('auth_error', { message: 'Nom d\'utilisateur non autorisé.' });
        socket.disconnect();
        return;
      }

      // Fetch user record for blocking check and metadata — use verified ID, not username
      const isObjId = /^[0-9a-f]{24}$/i.test(verifiedId);
      const user = await User.collection.findOne(
        isObjId ? { $or: [{ _id: verifiedId }, { _id: new ObjectId(verifiedId) }] } : { _id: verifiedId },
        { projection: { username: 1, avatarUrl: 1, sexe: 1, role: 1, isBlocked: 1, isAnonymous: 1 } }
      );

      if (!user) {
        socket.emit('auth_error', { message: 'Utilisateur introuvable.' });
        socket.disconnect();
        return;
      }

      if (user.isBlocked && !user.isAnonymous) {
        socket.emit('user_blocked', { message: 'Votre compte a été bloqué.' });
        socket.disconnect();
        return;
      }

      currentUserId   = verifiedId;
      socket.userId   = verifiedId;
      socket.username = user.username || username;
      socket.userMeta = { avatarUrl: user.avatarUrl || null, sexe: user.sexe || null, role: user.role || 'user', statut: user.statut || null };

      // Add this socket to the user's set of connections (multi-tab support).
      // Stale socket IDs (from disconnected sockets) are cleaned up here.
      if (connectedUsers.has(socket.username)) {
        const existing = connectedUsers.get(socket.username);
        // Prune dead sockets from the set
        for (const oldId of existing) {
          if (oldId !== socket.id && !io.sockets.sockets.get(oldId)) {
            existing.delete(oldId);
          }
        }
        existing.add(socket.id);
      }

      userIdToUsername.set(currentUserId, socket.username);

      User.collection.updateOne(
        isObjId ? { $or: [{ _id: verifiedId }, { _id: new ObjectId(verifiedId) }] } : { _id: verifiedId },
        { $set: { isOnline: true, lastSeen: new Date() } }
      ).catch(() => {});

      if (!connectedUsers.has(socket.username)) {
        connectedUsers.set(socket.username, new Set([socket.id]));
      }
      if (currentUserId) socket.join(currentUserId);
      _scheduleUserList();
      if (socket.currentRoom) _scheduleRoomList(socket.currentRoom);
      io.emit('presence_update', { userId: currentUserId, username: socket.username, isOnline: true });

    } catch (err) {
      console.error('user_connected error:', err);
    }
  });

  // ── Update username ───────────────────────────────────────────────────────
  socket.on('update_username', async (newUsername) => {
    if (!newUsername || newUsername === currentUsername) return;
    // Verify the requested username belongs to this socket's verified session
    if (socket.verifiedUsername && newUsername !== socket.verifiedUsername) {
      socket.emit('auth_error', { message: 'Nom d\'utilisateur non autorisé.' });
      return;
    }
    try {
      if (currentUsername && connectedUsers.has(currentUsername)) {
        connectedUsers.get(currentUsername).delete(socket.id);
        if (connectedUsers.get(currentUsername).size === 0) connectedUsers.delete(currentUsername);
      }

      currentUsername = newUsername;
      const user = await User.findOne({ username: newUsername }).lean();

      if (user) {
        if (currentUserId) {
          User.collection.updateOne(
            /^[0-9a-f]{24}$/i.test(currentUserId) ? { $or: [{ _id: currentUserId }, { _id: new ObjectId(currentUserId) }] } : { _id: currentUserId },
            { $set: { isOnline: false, lastSeen: new Date() } }
          ).catch(() => {});
          userIdToUsername.delete(currentUserId);
        }
        currentUserId   = user._id.toString();
        socket.userId   = currentUserId;
        socket.username = newUsername;
        socket.userMeta = { avatarUrl: user.avatarUrl || null, sexe: user.sexe || null, role: user.role || 'user', statut: user.statut || null };
        userIdToUsername.set(currentUserId, newUsername);
        // Join personal room so direct delivery of private messages works
        socket.join(currentUserId);
        const _nuid = String(user._id);
        User.collection.updateOne(
          /^[0-9a-f]{24}$/i.test(_nuid) ? { $or: [{ _id: _nuid }, { _id: new ObjectId(_nuid) }] } : { _id: _nuid },
          { $set: { isOnline: true, lastSeen: new Date() } }
        ).catch(() => {});
        io.emit('presence_update', { userId: currentUserId, username: newUsername, isOnline: true });
      }

      if (!connectedUsers.has(newUsername)) connectedUsers.set(newUsername, new Set());
      connectedUsers.get(newUsername).add(socket.id);

      _scheduleUserList();
      if (socket.currentRoom) _scheduleRoomList(socket.currentRoom);

    } catch (err) {
      console.error('update_username error:', err);
    }
  });

  // ── Refresh profile meta (username, avatarUrl, sexe) after REST update ───
  socket.on('refresh_profile', async () => {
    const userId = socket.userId;
    if (!userId || userId.startsWith('anon_')) return;
    try {
      const isObjId = /^[0-9a-f]{24}$/i.test(userId);
      const user = await User.collection.findOne(
        isObjId ? { $or: [{ _id: userId }, { _id: new ObjectId(userId) }] } : { _id: userId },
        { projection: { username: 1, avatarUrl: 1, sexe: 1, role: 1, statut: 1 } }
      );
      if (!user) return;

      const oldUsername = socket.username;
      const newUsername = user.username;

      // Update connectedUsers map if username changed
      if (oldUsername && oldUsername !== newUsername) {
        if (connectedUsers.has(oldUsername)) {
          connectedUsers.get(oldUsername).delete(socket.id);
          if (connectedUsers.get(oldUsername).size === 0) connectedUsers.delete(oldUsername);
        }
        if (!connectedUsers.has(newUsername)) connectedUsers.set(newUsername, new Set());
        connectedUsers.get(newUsername).add(socket.id);
        currentUsername = newUsername;
        userIdToUsername.set(userId, newUsername);
      }

      socket.username = newUsername;
      socket.userMeta = { avatarUrl: user.avatarUrl || null, sexe: user.sexe || null, role: user.role || 'user', statut: user.statut || null };

      _scheduleUserList();
      if (socket.currentRoom) _scheduleRoomList(socket.currentRoom);
    } catch (err) {
      console.error('refresh_profile error:', err);
    }
  });

  // ── Indicateur de frappe ─────────────────────────────────────────────────
  socket.on('typing_start', ({ room, username: clientUsername }) => {
    if (!room || typeof room !== 'string') return;
    // Priorité : socket.username (vérifié côté serveur) > fallback client > anonyme générique
    const name = socket.username || clientUsername || (socket.userId ? 'Anonyme' : null);
    if (!name) return;
    socket.to(room).emit('user_typing', { username: name, room });
  });

  socket.on('typing_stop', ({ room, username: clientUsername }) => {
    if (!room || typeof room !== 'string') return;
    const name = socket.username || clientUsername || (socket.userId ? 'Anonyme' : null);
    if (!name) return;
    socket.to(room).emit('user_stopped_typing', { username: name, room });
  });

  // ── Indicateur de frappe — messages privés ──────────────────────────────
  socket.on('private_typing_start', ({ recipientId }) => {
    if (!socket.userId || !recipientId) return;
    const roomId = getPrivateRoomId(socket.userId, recipientId);
    socket.to(roomId).emit('private_user_typing', { username: socket.username });
  });

  socket.on('private_typing_stop', ({ recipientId }) => {
    if (!socket.userId || !recipientId) return;
    const roomId = getPrivateRoomId(socket.userId, recipientId);
    socket.to(roomId).emit('private_user_stopped_typing', { username: socket.username });
  });

  // ── Statut mis à jour — notifier les autres utilisateurs ─────────────────
  socket.on('statut_updated', (newStatut) => {
    if (!socket.userId || socket.userId.startsWith('anon_')) return;
    if (typeof newStatut !== 'string') return;
    const statut = newStatut.slice(0, 60).trim();
    socket.userMeta = { ...socket.userMeta, statut: statut || null };
    // Diffuser aux autres utilisateurs connectés
    socket.broadcast.emit('statut_notification', {
      userId: socket.userId,
      username: socket.username,
      avatarUrl: socket.userMeta.avatarUrl,
      sexe: socket.userMeta.sexe,
      statut,
    });
    _scheduleUserList();
    if (socket.currentRoom) _scheduleRoomList(socket.currentRoom);
  });

  // ── Join private room ─────────────────────────────────────────────────────
  socket.on('join_private_room', async ({ recipientId }) => {
    const senderId = socket.userId;
    if (!senderId) return;

    const roomId = getPrivateRoomId(senderId, recipientId);
    socket.join(roomId);

    // Mark incoming messages as read (fire-and-forget)
    Message.updateMany(
      { sender: recipientId, recipient: senderId, read: false },
      { read: true }
    ).then(() => {
      const recipientUsername = userIdToUsername.get(recipientId.toString());
      if (recipientUsername && connectedUsers.has(recipientUsername)) {
        connectedUsers.get(recipientUsername).forEach(sid =>
          io.to(sid).emit('messages_read', { readBy: senderId })
        );
      }
    }).catch(() => {});
  });

  // ── Private message history (paginated, max 50) ───────────────────────────
  socket.on('get_message_history', async ({ recipientId }) => {
    const userId = socket.userId;
    if (!userId) return;

    try {
      const messages = await Message.find({
        $or: [
          { sender: userId, recipient: recipientId },
          { sender: recipientId, recipient: userId },
        ]
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      messages.reverse(); // oldest first for display

      // Normalize: ensure sender is always an object (populate is unreliable with mixed _id types)
      messages.forEach(m => {
        if (!m.sender || typeof m.sender === 'string') {
          m.sender = { _id: m.sender, username: m.senderUsername || 'Utilisateur' };
        } else if (!m.sender._id) {
          m.sender = { _id: String(m.sender), username: m.senderUsername || 'Utilisateur' };
        }
      });

      const roomId = getPrivateRoomId(userId, recipientId);
      io.to(roomId).emit('message_history', messages);
    } catch (err) {
      console.error('get_message_history error:', err);
    }
  });

  // ── Send private message ──────────────────────────────────────────────────
  socket.on('send_private_message', async ({ optimisticId, recipientId, content, media_url, media_type }) => {
    const senderId = socket.userId;
    if (!senderId) { socket.emit('error', { message: 'Not authenticated' }); return; }
    if (isSocketRateLimited(socket.id)) {
      socket.emit('private_message_error', { optimisticId, message: 'Trop de messages. Attendez un moment.' });
      return;
    }

    try {
      // Anonymous users (anon_ prefix) are not stored in MongoDB — skip DB lookup
      const isAnonSender = typeof senderId === 'string' && senderId.startsWith('anon_');
      const isAnonRecipient = typeof recipientId === 'string' && recipientId.startsWith('anon_');

      let sBlocked = [], rBlocked = [];

      // Use User.collection.findOne() to bypass Mongoose _id:false schema quirks.
      // Also support legacy ObjectId _ids (24-char hex) alongside 32-char better-auth string _ids.
      const buildIdQuery = (id) => {
        const isObjectId = /^[0-9a-f]{24}$/i.test(id);
        return isObjectId
          ? { $or: [{ _id: id }, { _id: new ObjectId(id) }] }
          : { _id: id };
      };

      if (!isAnonSender) {
        const sender = await User.collection.findOne(
          buildIdQuery(senderId),
          { projection: { blockedUsers: 1 } }
        );
        if (!sender) {
          socket.emit('private_message_error', { optimisticId, message: 'Session invalide.' });
          return;
        }
        sBlocked = sender.blockedUsers || [];
      }

      if (!isAnonRecipient) {
        const recipient = await User.collection.findOne(
          buildIdQuery(recipientId),
          { projection: { blockedUsers: 1 } }
        );
        if (!recipient) {
          socket.emit('private_message_error', { optimisticId, message: 'Destinataire introuvable.' });
          return;
        }
        rBlocked = recipient.blockedUsers || [];
      }

      const blockedByMe   = sBlocked.map(String).includes(String(recipientId));
      const blockedByThem = rBlocked.map(String).includes(String(senderId));
      if (blockedByMe || blockedByThem) {
        socket.emit('message_blocked', { optimisticId, blockedByMe, blockedByThem });
        return;
      }

      const newMessage = await Message.create({ sender: senderId, senderUsername: socket.username || null, recipient: recipientId, content, media_url, media_type });

      // Build sender object from socket metadata — avoids populate() which fails
      // for users with legacy ObjectId _ids due to Mongoose _id:false schema quirk
      const messagePayload = {
        _id: newMessage._id.toString(),
        sender: {
          _id: senderId,
          username: socket.username,
          avatarUrl: socket.userMeta?.avatarUrl || null,
          sexe: socket.userMeta?.sexe || null,
          role: socket.userMeta?.role || null,
        },
        recipient: recipientId,
        content: newMessage.content,
        media_url: newMessage.media_url || null,
        media_type: newMessage.media_type || null,
        createdAt: newMessage.createdAt,
        replyTo: newMessage.replyTo || null,
      };

      const roomId = getPrivateRoomId(senderId, recipientId);

      // Join recipient to the private room server-side so they receive the message
      // even if they haven't opened the chatbox yet
      const recipientUsername = userIdToUsername.get(recipientId.toString());
      if (recipientUsername && connectedUsers.has(recipientUsername)) {
        connectedUsers.get(recipientUsername).forEach(sid => {
          const recipientSocket = io.sockets.sockets.get(sid);
          if (recipientSocket) recipientSocket.join(roomId);
        });
      }

      // Deliver to private room (reaches both participants)
      io.to(roomId).emit('receive_private_message', messagePayload);

      // Also deliver notification via personal room (for unread badge / toast)
      // even when no chatbox is open
      io.to(recipientId.toString()).emit('new_private_message', {
        message: messagePayload,
        senderId,
        senderUsername: socket.username,
      });

    } catch (err) {
      console.error('send_private_message error:', err);
      socket.emit('private_message_error', { optimisticId, message: 'Une erreur est survenue.' });
    }
  });

  // ── Mark messages read ────────────────────────────────────────────────────
  socket.on('mark_messages_read', async ({ recipientId }) => {
    const senderId = socket.userId;
    if (!senderId) return;

    Message.updateMany(
      { sender: recipientId, recipient: senderId, read: false },
      { read: true }
    ).then(() => {
      const recipientUsername = userIdToUsername.get(recipientId.toString());
      if (recipientUsername && connectedUsers.has(recipientUsername)) {
        connectedUsers.get(recipientUsername).forEach(sid =>
          io.to(sid).emit('messages_read', { readBy: senderId })
        );
      }
    }).catch(() => {});
  });

  // ── Check user online ─────────────────────────────────────────────────────
  socket.on('check_user_online', async (recipientId) => {
    try {
      const username = userIdToUsername.get(recipientId.toString());
      if (username && connectedUsers.has(username)) {
        socket.emit('user_online', recipientId);
        return;
      }
      const _rid = String(recipientId);
      const user = await User.collection.findOne(
        /^[0-9a-f]{24}$/i.test(_rid) ? { $or: [{ _id: _rid }, { _id: new ObjectId(_rid) }] } : { _id: _rid },
        { projection: { username: 1 } }
      );
      if (user && connectedUsers.has(user.username)) {
        userIdToUsername.set(recipientId.toString(), user.username);
        socket.emit('user_online', recipientId);
      } else {
        socket.emit('user_offline', recipientId);
      }
    } catch (err) {
      socket.emit('user_offline', recipientId);
    }
  });

  // ── Get room users (on-demand request from client) ────────────────────────
  socket.on('get_room_users', (room) => {
    if (!room || typeof room !== 'string') return;
    // Reuse emitRoomUserList (includes bots) but emit only to this socket
    const seen = new Set();
    const usersInfo = [];
    const roomInfo = io.sockets.adapter.rooms.get(room);
    if (roomInfo) {
      for (const socketId of roomInfo) {
        const s = io.sockets.sockets.get(socketId);
        if (s && s.username && !seen.has(s.username)) {
          seen.add(s.username);
          usersInfo.push({
            username: s.username,
            userId:   s.userId || null,
            avatarUrl: s.userMeta?.avatarUrl || null,
            sexe:     s.userMeta?.sexe || 'autre',
            role:     s.userMeta?.role || null,
            statut:   s.userMeta?.statut || null,
            isBot:    false,
          });
        }
      }
    }
    // Inject bots for this room
    const { BOT_PROFILES } = require('./botProfiles');
    for (const bot of BOT_PROFILES) {
      if (bot.channels.includes(room) && !seen.has(bot.username)) {
        seen.add(bot.username);
        usersInfo.push({
          username:  bot.username,
          userId:    bot.id,
          avatarUrl: bot.avatarUrl,
          sexe:      bot.sexe,
          isBot:     true,
        });
      }
    }
    socket.emit('update_room_user_list', { room, users: usersInfo });
  });

  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    socketMsgRateMap.delete(socket.id);
    if (!currentUsername || !connectedUsers.has(currentUsername)) return;

    connectedUsers.get(currentUsername).delete(socket.id);
    if (connectedUsers.get(currentUsername).size === 0) {
      connectedUsers.delete(currentUsername);

      if (currentUserId) {
        User.collection.updateOne(
          /^[0-9a-f]{24}$/i.test(currentUserId) ? { $or: [{ _id: currentUserId }, { _id: new ObjectId(currentUserId) }] } : { _id: currentUserId },
          { $set: { isOnline: false, lastSeen: new Date() } }
        ).catch(() => {});
        userIdToUsername.delete(currentUserId);
      }
    }

    _scheduleUserList();
    if (socket.currentRoom) _scheduleRoomList(socket.currentRoom);
    // Broadcast offline presence
    if (currentUserId) {
      io.emit('presence_update', { userId: currentUserId, username: currentUsername, isOnline: false });
    }
  });

  // ── Game handlers ─────────────────────────────────────────────────────────
  gameHandlers(io, socket);

  // ─────────────────────────────────────────────────────────────────────────
  function getPrivateRoomId(id1, id2) {
    return [id1, id2].sort().join('_');
  }
};
