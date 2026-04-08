/**
 * BotService — Profils d'engagement automatiques pour BabiChat
 *
 * 3 profils ivoiriens qui animent les canaux quand des vrais users sont connectés.
 * Les bots injectent des messages directement via io.to(room).emit() côté serveur
 * sans passer par l'authentification socket — ils sauvegardent aussi en DB.
 */

const Message = require('../models/Message');
const User    = require('../models/User');
const { BOT_PROFILES } = require('../socket/botProfiles');

// ─── Messages par canal ───────────────────────────────────────────────────────
const MESSAGES = {
  General: {
    greetings: [
      'Salut tout le monde 👋',
      'Eh les amis ! Comment ça go ?',
      'Coucou 🙂 y\'a du monde ici ?',
      'Salut la famille ! On est là 💪',
      'Djô ! Ça fait plaisir de vous voir ici',
      'Bonsoir les gars, on est là oh 😄',
    ],
    messages: [
      'Quelqu\'un a regardé le match hier ? C\'était chaud !',
      'La chaleur à Abidjan c\'est trop là 😅 vous faites comment ?',
      'Qui connaît un bon endroit pour manger à Plateau ?',
      'Franchement les Ivoiriens sont trop forts en musique 🎵',
      'La vie en Côte d\'Ivoire c\'est unique, nulle part ailleurs c\'est comme ça 🇨🇮',
      'Wê wê wê, on est trop bien ici !',
      'Quelqu\'un a des nouvelles du match des Éléphants ?',
      'La semaine a été longue mais on tient bon 💪',
      'C\'est quoi les plans pour le weekend ?',
      'Abidjan by night c\'est une autre vibe 🌙',
      'Vous utilisez quoi comme app pour écouter de la musique ?',
      'Le maquis du coin c\'est toujours bondé le vendredi hein 😂',
    ],
    reactions: [
      '😂😂 trop vrai !',
      'Hein ! C\'est pas faux ça',
      '💯 exactement ce que je pensais',
      'Ahh on va faire comment 😄',
      'Vraiment ! Je suis d\'accord',
      '🔥🔥 c\'est ça !',
      'Lol tu m\'as fait rire là',
      'Mais c\'est vrai hein !',
    ],
  },
  Music: {
    greetings: [
      'Salut les mélomanes ! 🎵',
      'Eh les amis, on parle musique ici ?',
      'Coucou ! Qu\'est-ce que vous écoutez en ce moment ?',
    ],
    messages: [
      'Alpha Blondy reste une légende africaine, aucune discussion 🎸',
      'Le coupé-décalé ça ne mourra jamais 💃',
      'DJ Arafat était vraiment unique dans son style RIP 🕊️',
      'Qui suit Magic System depuis les débuts ?',
      'La musique ivoirienne mérite plus de visibilité internationale',
      'Didi B est sous-coté là, l\'mec est trop fort',
      'Ça fait plaisir que l\'afrobeats ivoirien commence à cartonner dehors 🔥',
      'Vous connaissez Josey ? Sa voix c\'est quelque chose 😍',
      'Le Zouglou c\'est notre patrimoine, faut jamais l\'oublier',
      'Quelqu\'un a écouté le dernier album de Fally Ipupa ?',
    ],
    reactions: [
      '🎵🎵 trop bon choix !',
      'Ah oui je connais ! C\'est une tuerie',
      'Bonne musique ça 🔥',
      'Je valide complètement 💯',
    ],
  },
  Sport: {
    greetings: [
      'Salut les sportifs ! ⚽',
      'Eh les fans, on parle sport ici ?',
      'Coucou ! Vous avez vu les résultats ?',
    ],
    messages: [
      'Les Éléphants de Côte d\'Ivoire vont encore faire des merveilles 🐘⚽',
      'Didier Drogba restera à jamais une légende 🏆',
      'Le prochain match c\'est quand ? J\'attends ça avec impatience',
      'L\'ASEC Mimosas c\'est la vraie institution du foot ivoirien',
      'Le basket prend de plus en plus de place en Côte d\'Ivoire, bonne évolution',
      'Qui suit le championnat de Ligue 1 ivoirienne ?',
      'Les Ivoiriens au niveau mondial ça cartonne 💪',
      'La CAN 2023 c\'était historique pour nous 🏆🇨🇮',
      'Combien parmi vous pratiquent du sport régulièrement ?',
    ],
    reactions: [
      '⚽⚽ c\'est ça !',
      'Ah oui ! Je suis d\'accord',
      '💪 les Éléphants !',
      'Vrai ça 🔥',
    ],
  },
};

// ─── État interne ─────────────────────────────────────────────────────────────
// botId → Map<room, timeoutId>
const botTimers   = new Map();
// botId → Map<room, lastMessageTime>
const botLastMsg  = new Map();

const MIN_BOT_INTERVAL_MS = 90_000; // 1.5 min min entre 2 messages d'un même bot dans un room
const MAX_REAL_USERS_FOR_BOTS = 10; // bots se taisent au-delà de ce seuil

// ─── Helpers ─────────────────────────────────────────────────────────────────
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function countRealUsersInRoom(io, room) {
  const roomSockets = io.sockets.adapter.rooms.get(room);
  if (!roomSockets) return 0;
  let count = 0;
  for (const sid of roomSockets) {
    const s = io.sockets.sockets.get(sid);
    // Only count authenticated non-bot sockets
    if (s && s.userId && !s.userId.startsWith('bot_')) count++;
  }
  return count;
}

async function saveBotMessage(botProfile, content, room) {
  try {
    const msg = new Message({
      sender:         botProfile.id,
      senderUsername: botProfile.username,
      content,
      room,
      isAI:           true,
      aiCharacter:    botProfile.id,
    });
    await msg.save();
    return msg;
  } catch (err) {
    console.error(`[BotService] saveBotMessage error (${botProfile.id}):`, err.message);
    return null;
  }
}

function broadcastBotMessage(io, botProfile, content, room, messageId) {
  io.to(room).emit('receive_message', {
    _id:       messageId?.toString() || `bot_${Date.now()}`,
    sender: {
      _id:      botProfile.id,
      username: botProfile.username,
      avatarUrl: botProfile.avatarUrl,
      sexe:     botProfile.sexe,
      isBot:    true,
    },
    content,
    room,
    isAI:        true,
    aiCharacter: botProfile.id,
    reactions:   [],
    createdAt:   new Date().toISOString(),
  });
}

async function sendBotMessage(io, botProfile, content, room) {
  // Guard: don't spam same room too fast
  if (!botLastMsg.has(botProfile.id)) botLastMsg.set(botProfile.id, new Map());
  const lastMap = botLastMsg.get(botProfile.id);
  const last = lastMap.get(room) || 0;
  if (Date.now() - last < MIN_BOT_INTERVAL_MS) return;
  lastMap.set(room, Date.now());

  const msg = await saveBotMessage(botProfile, content, room);
  if (msg) broadcastBotMessage(io, botProfile, content, room, msg._id);
}

// ─── Scheduling ───────────────────────────────────────────────────────────────
function scheduleNextMessage(io, botProfile, room) {
  // Clear existing timer
  if (!botTimers.has(botProfile.id)) botTimers.set(botProfile.id, new Map());
  const timers = botTimers.get(botProfile.id);
  if (timers.has(room)) clearTimeout(timers.get(room));

  const delay = rand(botProfile.minDelay, botProfile.maxDelay);

  const tid = setTimeout(async () => {
    const realCount = countRealUsersInRoom(io, room);
    // Only send if real users are present and below the threshold
    if (realCount === 0 || realCount >= MAX_REAL_USERS_FOR_BOTS) {
      scheduleNextMessage(io, botProfile, room); // reschedule, check again later
      return;
    }

    const pool = MESSAGES[room];
    if (!pool) return;

    // 70% chance regular message, 30% reaction-style
    const content = Math.random() < 0.7
      ? pickRandom(pool.messages)
      : pickRandom(pool.reactions);

    await sendBotMessage(io, botProfile, content, room);
    scheduleNextMessage(io, botProfile, room);
  }, delay);

  timers.set(room, tid);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialize the bot system. Call once after io is ready.
 */
async function init(io) {
  // Ensure bot user records exist in DB
  for (const bot of BOT_PROFILES) {
    const exists = await User.collection.findOne({ _id: bot.id });
    if (!exists) {
      await User.collection.insertOne({
        _id:       bot.id,
        email:     `${bot.id}@babichat.internal`,
        username:  bot.username,
        name:      bot.username,
        sexe:      bot.sexe,
        age:       bot.age,
        ville:     bot.ville,
        role:      'user',
        isBot:     true,
        isAnonymous: false,
        isOnline:  true,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`✅ Bot créé : ${bot.username}`);
    }
  }

  // Start scheduling for each bot/channel pair
  for (const bot of BOT_PROFILES) {
    for (const room of bot.channels) {
      // Stagger initial delays so bots don't all fire at once
      const initialDelay = rand(30_000, 120_000);
      setTimeout(() => {
        scheduleNextMessage(io, bot, room);
      }, initialDelay);
    }
  }

  console.log(`🤖 BotService initialisé (${BOT_PROFILES.length} profils)`);
}

/**
 * Called when a real user joins a room — bot may greet them.
 * @param {object} io
 * @param {string} room
 * @param {string} joiningUsername
 */
async function onUserJoined(io, room, joiningUsername) {
  const userCount = countRealUsersInRoom(io, room);
  // Don't greet if too many users (bots se taisent au-delà du seuil)
  if (userCount === 0 || userCount >= MAX_REAL_USERS_FOR_BOTS) return;

  // Pick a bot that covers this room
  const eligible = BOT_PROFILES.filter(b => b.channels.includes(room));
  if (!eligible.length) return;

  // 50% chance to greet (avoid greeting every single join)
  if (Math.random() < 0.5) return;

  const bot = pickRandom(eligible);
  const pool = MESSAGES[room];
  if (!pool) return;

  // Random delay 4-12s to feel natural
  const delay = rand(4_000, 12_000);
  setTimeout(async () => {
    // Re-check user still in room
    if (countRealUsersInRoom(io, room) === 0) return;

    // 60% greeting, 40% regular message
    const content = Math.random() < 0.6
      ? pickRandom(pool.greetings)
      : pickRandom(pool.messages);

    await sendBotMessage(io, bot, content, room);
  }, delay);
}

/**
 * Called when a user message mentions a bot name — bot responds.
 * @param {object} io
 * @param {string} room
 * @param {string} messageContent
 */
async function onUserMessage(io, room, messageContent, replyPreview) {
  if (countRealUsersInRoom(io, room) >= MAX_REAL_USERS_FOR_BOTS) return;
  const lower = messageContent.toLowerCase();

  // Check if the user replied to a bot message
  const repliedToBotId = replyPreview?.sender?._id?.startsWith('bot_')
    ? replyPreview.sender._id
    : null;

  for (const bot of BOT_PROFILES) {
    if (!bot.channels.includes(room)) continue;

    const firstName = bot.username.split('_')[0].toLowerCase();
    const isMentioned = lower.includes(`@${firstName}`) || lower.includes(firstName);
    const isReplyToThisBot = repliedToBotId === bot.id;

    if (!isMentioned && !isReplyToThisBot) continue;

    const pool = MESSAGES[room];
    if (!pool) continue;

    const delay = rand(2_000, 6_000);
    setTimeout(async () => {
      if (countRealUsersInRoom(io, room) === 0) return;
      const content = pickRandom([...pool.reactions, ...pool.messages.slice(0, 5)]);
      await sendBotMessage(io, bot, content, room);
    }, delay);

    break; // only one bot responds at a time
  }
}

module.exports = { init, onUserJoined, onUserMessage };
