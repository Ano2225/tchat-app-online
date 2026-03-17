const Game = require('../models/Game');
const User = require('../models/User');
const { ObjectId } = require('mongodb');
const { getRandomQuestion } = require('../services/questionService');

function buildIdQuery(id) {
  const str = String(id);
  return /^[0-9a-f]{24}$/i.test(str)
    ? { $or: [{ _id: str }, { _id: new ObjectId(str) }] }
    : { _id: str };
}
const memoryCleanup = require('../utils/memoryCleanup');

const activeGames = new Map();
const gameTimers = new Map();
const userActionTimestamps = new Map();
const gameCache = new Map(); // Cache pour éviter les requêtes DB répétées

const QUESTION_DURATION = 15000;
const PAUSE_BETWEEN_QUESTIONS = 5000;
const RATE_LIMIT_WINDOW = 2000; // Augmenté à 2 secondes
const MAX_ACTIONS_PER_WINDOW = 8; // Plus permissif pour les actions légitimes
const MAX_LEADERBOARD_SIZE = 100; // Limiter la taille du leaderboard
const CACHE_TTL = 30000; // 30 secondes de cache

const handleChatMessage = async (socket, data, io) => {
  // Validate authentication for game messages
  if (!socket.userId || !socket.username) {
    console.log(`[SECURITY] Unauthorized game message attempt from socket: ${socket.id}`);
    return false;
  }
  
  // Check rate limiting for game messages
  const now = Date.now();
  const userActions = userActionTimestamps.get(socket.userId) || [];
  const recentActions = userActions.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
  
  if (recentActions.length >= MAX_ACTIONS_PER_WINDOW) {
    console.log(`[SECURITY] Rate limit exceeded for game message from user: ${socket.username}`);
    return true; // Suppress the message
  }
  
  recentActions.push(now);
  userActionTimestamps.set(socket.userId, recentActions);
  
  const { room: channel, message } = data;
  
  // Validate input parameters
  if (!channel || typeof channel !== 'string' || !message || typeof message !== 'string') {
    console.log(`[SECURITY] Invalid parameters in game message from user: ${socket.username}`);
    return false;
  }
  
  // Sanitize message length
  if (message.length > 500) {
    console.log(`[SECURITY] Message too long from user: ${socket.username}`);
    return false;
  }
  
  let game = activeGames.get(channel);
  
  // Utiliser le cache pour éviter les requêtes DB répétées
  if (!game && channel === 'Game') {
    const cached = gameCache.get(channel);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      game = cached.data;
      activeGames.set(channel, game);
    } else {
      try {
        game = await Game.findOne({ channel }).lean(); // .lean() pour de meilleures performances
        if (game) {
          activeGames.set(channel, game);
          gameCache.set(channel, { data: game, timestamp: Date.now() });
        }
      } catch (error) {
        console.error('Error loading game from DB:', error);
      }
    }
  }
  
  console.log(`[GAME] Message received in channel ${channel}: "${message}"`);
  console.log(`[GAME] Game exists: ${!!game}, isActive: ${game?.isActive}, hasQuestion: ${!!game?.currentQuestion}`);
  
  if (!game || !game.isActive || !game.currentQuestion) {
    console.log(`[GAME] No active game, allowing normal chat`);
    return false; // Allow normal chat message processing
  }
  
  // Vérifier si c'est une réponse à la question
  const userAnswerRaw = message.trim().toLowerCase();
  const correctAnswer = game.currentQuestion.correctAnswerText?.toLowerCase() || '';

  // Vérifier si l'utilisateur a déjà répondu
  if (!game.currentQuestion.answers) {
    game.currentQuestion.answers = [];
  }

  const existingAnswer = game.currentQuestion.answers.find(a => String(a.userId) === String(socket.userId));
  if (existingAnswer) {
    socket.emit('answer_result', { userId: socket.userId, isCorrect: existingAnswer.isCorrect, alreadyAnswered: true });
    return false;
  }

  const responseTime = Date.now() - game.currentQuestion.startTime.getTime();

  // Server-side deadline: reject answers submitted after question expired (+ 1s grace)
  if (responseTime > QUESTION_DURATION + 1000) {
    console.log(`[SECURITY] Late answer rejected from ${socket.username}, response time: ${responseTime}ms`);
    socket.emit('answer_result', { userId: socket.userId, isCorrect: false, late: true, alreadyAnswered: false });
    return false;
  }

  const normalizeText = (text) => text.toLowerCase().trim().replace(/[^a-z0-9]/g, '');

  // Support letter answers: A → options[0], B → options[1], etc.
  const letterToIndex = { a: 0, b: 1, c: 2, d: 3 };
  let resolvedAnswer = userAnswerRaw;
  if (letterToIndex[userAnswerRaw] !== undefined && game.currentQuestion.options?.length) {
    const opt = game.currentQuestion.options[letterToIndex[userAnswerRaw]];
    if (opt) resolvedAnswer = opt.toLowerCase();
  }

  const normalizedUserAnswer = normalizeText(resolvedAnswer);
  const normalizedCorrectAnswer = normalizeText(correctAnswer);

  const isCorrect = normalizedUserAnswer === normalizedCorrectAnswer ||
                   normalizedUserAnswer.includes(normalizedCorrectAnswer) ||
                   normalizedCorrectAnswer.includes(normalizedUserAnswer);
  
  console.log(`[GAME] Answer comparison - User: "${normalizedUserAnswer}", Correct: "${normalizedCorrectAnswer}", IsCorrect: ${isCorrect}`);
  
  // Enregistrer la réponse
  game.currentQuestion.answers.push({
    userId: socket.userId,
    username: socket.username,
    answer: resolvedAnswer,
    isCorrect,
    responseTime
  });

  // Notifier l'expéditeur du résultat de sa réponse
  socket.emit('answer_result', { userId: socket.userId, isCorrect, alreadyAnswered: false });

  let points = 0;
  let isWinner = false;
  
  // Si c'est la première bonne réponse, ce joueur gagne le point
  if (isCorrect) {
    const correctAnswers = game.currentQuestion.answers.filter(a => a.isCorrect);
    if (correctAnswers.length === 1) { // Premier à répondre correctement
      points = 10;
      isWinner = true;
      
      // S'assurer que le joueur existe dans le leaderboard
      let player = game.leaderboard.find(p => String(p.userId) === String(socket.userId));
      if (!player) {
        player = {
          userId: socket.userId,
          username: socket.username,
          score: 0
        };
        game.leaderboard.push(player);
      }
      
      // Mettre à jour le score du joueur
      player.score += points;
      
      // Annoncer le gagnant à tous
      const winnerData = {
        winner: socket.username,
        points,
        correctAnswer: game.currentQuestion.correctAnswerText
      };
      
      console.log(`[GAME] Announcing winner:`, winnerData);
      io.to(`game_${channel}`).emit('winner_announced', winnerData);
      
      // Délai plus long pour s'assurer que le message utilisateur arrive en premier
      setTimeout(() => {
        const topPlayers = game.leaderboard
          .sort((a, b) => (b.score || 0) - (a.score || 0))
          .slice(0, 3)
          .map((p, i) => `${['🥇', '🥈', '🥉'][i]} ${p.username}: ${p.score} pts`)
          .join('\n');
        
        io.to(channel).emit('receive_message', {
          _id: `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          sender: { _id: 'system', username: 'Quiz Bot' },
          content: `🎉 **BONNE RÉPONSE !**\n🏆 ${socket.username} remporte cette manche ! (+${points} points)\n\n✅ Réponse: ${game.currentQuestion.correctAnswerText}\n\n🏅 **TOP 3:**\n${topPlayers}`,
          createdAt: new Date().toISOString(),
          room: channel,
          isGameMessage: true
        });
      }, 800);
      
      // Terminer la question après un court délai
      const timersToClean = [`next_${channel}`, `transition_${channel}`, channel];
      timersToClean.forEach(timerKey => {
        const timer = gameTimers.get(timerKey);
        if (timer) {
          clearTimeout(timer);
          gameTimers.delete(timerKey);
        }
      });
      
      const endTimer = setTimeout(() => {
        endQuestion(channel, io);
      }, 3000); // 3s pour voir le gagnant puis question suivante
      
      gameTimers.set(`winner_${channel}`, endTimer);
    }
  }
  
  // Sauvegarder de manière asynchrone pour ne pas bloquer
  setImmediate(async () => {
    try {
      // Limiter la taille du leaderboard pour les performances
      const trimmedLeaderboard = game.leaderboard
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, MAX_LEADERBOARD_SIZE);
      
      await Game.findOneAndUpdate(
        { channel },
        { 
          'currentQuestion.answers': game.currentQuestion.answers,
          leaderboard: trimmedLeaderboard
        },
        { new: false } // Pas besoin de retourner le document
      );
      
      // Mettre à jour le cache
      game.leaderboard = trimmedLeaderboard;
      gameCache.set(channel, { data: game, timestamp: Date.now() });
    } catch (error) {
      console.error('Error saving game:', error);
    }
  });
  
  return false; // Allow all messages to appear in chat for better multiplayer experience
};

module.exports = (io, socket) => {
  console.log('Game handlers initialized for socket:', socket.id);
  
  // Helper function to validate authenticated user
  const validateAuthenticatedUser = (socket) => {
    if (!socket.userId || !socket.username) {
      console.log(`[SECURITY] Unauthorized game action attempt from socket: ${socket.id}`);
      const errorMessage = 'Authentication required for game actions';
      console.error(`[GAME_ERROR] ${errorMessage}`);
      socket.emit('game_error', { message: errorMessage });
      return false;
    }
    return true;
  };
  
  // Rate limiting optimisé avec différenciation par type d'action
  const checkRateLimit = (userId, actionType = 'default') => {
    const now = Date.now();
    const userKey = `${userId}_${actionType}`;
    const userActions = userActionTimestamps.get(userKey) || [];
    
    // Nettoyage efficace des anciens timestamps
    const recentActions = userActions.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
    
    // Limites différentes selon le type d'action
    const maxActions = actionType === 'join' ? 2 : MAX_ACTIONS_PER_WINDOW;
    
    if (recentActions.length >= maxActions) {
      console.log(`[RATE_LIMIT] User ${userId} exceeded limit for ${actionType}: ${recentActions.length}/${maxActions}`);
      return false;
    }
    
    recentActions.push(now);
    userActionTimestamps.set(userKey, recentActions);
    
    // Nettoyage périodique de la mémoire
    if (Math.random() < 0.01) { // 1% de chance
      for (const [key, actions] of userActionTimestamps.entries()) {
        const validActions = actions.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
        if (validActions.length === 0) {
          userActionTimestamps.delete(key);
        } else {
          userActionTimestamps.set(key, validActions);
        }
      }
    }
    
    return true;
  };
  
  socket.on('join_game_channel', async (channel) => {
    // Only allow game functionality for the 'Game' channel
    if (channel !== 'Game') {
      return;
    }

    // Validate authentication
    if (!validateAuthenticatedUser(socket)) {
      return;
    }
    
    // Vérifier que l'utilisateur est inscrit (pas anonyme)
    try {
      const user = await User.collection.findOne(buildIdQuery(socket.userId), { projection: { isAnonymous: 1 } });
      if (!user || user.isAnonymous) {
        socket.emit('game_error', { message: 'Le quiz est réservé aux utilisateurs inscrits' });
        return;
      }
    } catch (error) {
      const errorMessage = 'Erreur de vérification utilisateur';
      console.error('Error checking user registration:', error);
      console.error(`[GAME_ERROR] ${errorMessage}`);
      socket.emit('game_error', { message: errorMessage });
      return;
    }

    // Check rate limiting spécifique pour join
    if (!checkRateLimit(socket.userId, 'join')) {
      console.log(`[RATE_LIMIT] Join game channel blocked for user: ${socket.username}`);
      socket.emit('game_error', { message: 'Trop de tentatives de connexion. Attendez un moment.' });
      return;
    }

    // Validate channel parameter
    if (!channel || typeof channel !== 'string' || channel.length > 50) {
      socket.emit('game_error', { message: 'Invalid channel parameter' });
      return;
    }

    console.log(`User ${socket.username} joining game channel: ${channel}`);
    socket.join(`game_${channel}`);

    let game = activeGames.get(channel);
    if (!game) {
      try {
        game = await Game.findOne({ channel }).lean();
        if (!game) {
          game = await Game.create({
            channel,
            isActive: false,
            leaderboard: [],
            questionHistory: []
          });
        }
        activeGames.set(channel, game);
        console.log(`Game created/loaded for channel: ${channel}`);
      } catch (error) {
        const errorMessage = 'Erreur lors du chargement du jeu';
        console.error('Error creating/loading game:', error);
        console.error(`[GAME_ERROR] ${errorMessage}`);
        socket.emit('game_error', { message: errorMessage });
        return;
      }
    }

    // Ajouter le joueur au leaderboard s'il n'y est pas déjà (une seule fois)
    if (socket.userId && socket.username) {
      const existingPlayer = game.leaderboard.find(p => String(p.userId) === String(socket.userId));
      if (!existingPlayer) {
        try {
          // Optimiser l'ajout au leaderboard
          game.leaderboard.push({ userId: socket.userId, username: socket.username, score: 0 });
          activeGames.set(channel, game);
          
          // Sauvegarder de manière asynchrone
          setImmediate(async () => {
            try {
              await Game.findOneAndUpdate(
                { channel, 'leaderboard.userId': { $ne: socket.userId } },
                { $push: { leaderboard: { userId: socket.userId, username: socket.username, score: 0 } } },
                { new: false }
              );
              console.log(`[GAME] Added ${socket.username} to leaderboard`);
            } catch (error) {
              console.error('Error adding player to leaderboard:', error);
            }
          });
        } catch (error) {
          console.error('Error adding player to leaderboard:', error);
        }
      }
    }

    // Démarrer le jeu automatiquement avec un délai
    console.log(`Game status for ${channel}: isActive=${game.isActive}`);
    if (!game.isActive && !gameTimers.has(`start_${channel}`)) {
      console.log(`Starting game for channel: ${channel}`);
      const startTimer = setTimeout(() => {
        gameTimers.delete(`start_${channel}`);
        startGame(channel, io);
      }, 1000);
      gameTimers.set(`start_${channel}`, startTimer);
    } else {
      console.log(`Game already active for channel: ${channel}`);
      // Vérifier si une question est en cours
      if (game.currentQuestion) {
        const timeElapsed = Date.now() - new Date(game.currentQuestion.startTime).getTime();
        const timeLeft = Math.max(0, Math.floor((QUESTION_DURATION - timeElapsed) / 1000));

        console.log(`[GAME] Sending current question to new player, time left: ${timeLeft}s`);
        
        if (timeLeft > 0) {
          // Send full question data so late joiners have all fields
          socket.emit('new_question', {
            question: game.currentQuestion.question,
            options: game.currentQuestion.options || [],
            duration: QUESTION_DURATION,
            startTime: game.currentQuestion.startTime,
            category: game.currentQuestion.category || 'Quiz',
            categoryEmoji: game.currentQuestion.categoryEmoji || '❓',
            difficulty: game.currentQuestion.difficulty || 'Moyen',
            explanation: game.currentQuestion.explanation || ''
          });
        } else {
          console.log(`[GAME] Question expired, ending it`);
          endQuestion(channel, io);
        }
      } else {
        console.log(`[GAME] No current question, starting new one in 2s`);
        setTimeout(() => nextQuestion(channel, io), 2000);
      }
    }

    // Envoyer l'état actuel
    const gameState = {
      isActive: game.isActive,
      currentQuestion: game.currentQuestion,
      leaderboard: (game.leaderboard || []).sort((a, b) => (b.score || 0) - (a.score || 0))
    };
    
    console.log(`[GAME] Sending initial game state to ${socket.username}:`, gameState);
    socket.emit('game_state', gameState);
  });

  socket.on('start_game', async (channel) => {
    // Only allow for 'Game' channel
    if (channel !== 'Game') {
      return;
    }

    // Validate authentication
    if (!validateAuthenticatedUser(socket)) {
      return;
    }

    // Check rate limiting pour start_game
    if (!checkRateLimit(socket.userId, 'start')) {
      console.log(`[RATE_LIMIT] Start game blocked for user: ${socket.username}`);
      socket.emit('game_error', { message: 'Trop de tentatives de démarrage. Attendez un moment.' });
      return;
    }

    // Validate channel parameter
    if (!channel || typeof channel !== 'string' || channel.length > 50) {
      socket.emit('game_error', { message: 'Invalid channel parameter' });
      return;
    }

    const game = activeGames.get(channel);
    if (game && !game.isActive) {
      startGame(channel, io);
    }
  });

  socket.on('leave_game_channel', (channel) => {
    // Only allow for 'Game' channel
    if (channel !== 'Game') {
      return;
    }

    // Validate authentication
    if (!validateAuthenticatedUser(socket)) {
      return;
    }

    // Check rate limiting pour leave (ne pas bloquer la déconnexion)
    if (!checkRateLimit(socket.userId, 'leave')) {
      console.log(`[RATE_LIMIT] Leave game channel rate limited for user: ${socket.username}`);
      // Ne pas bloquer la déconnexion, juste logger
    }

    // Validate channel parameter
    if (!channel || typeof channel !== 'string' || channel.length > 50) {
      socket.emit('game_error', { message: 'Invalid channel parameter' });
      return;
    }

    socket.leave(`game_${channel}`);
  });
  
  // Alias: frontend may emit 'submit_answer' instead of 'game_answer'
  socket.on('submit_answer', async (data) => {
    if (!validateAuthenticatedUser(socket)) return;
    if (!checkRateLimit(socket.userId, 'answer')) {
      socket.emit('game_error', { message: 'Trop de réponses envoyées. Ralentissez.' });
      return;
    }
    const raw = data?.answer;
    if (raw === undefined || raw === null || String(raw).length > 500) {
      socket.emit('game_error', { message: 'Invalid answer format' });
      return;
    }
    await handleChatMessage(socket, { room: 'Game', message: String(raw).trim() }, io);
  });

  // Gérer les réponses du jeu
  socket.on('game_answer', async (data) => {
    // Validate authentication
    if (!validateAuthenticatedUser(socket)) {
      return;
    }

    // Check rate limiting pour les réponses
    if (!checkRateLimit(socket.userId, 'answer')) {
      console.log(`[RATE_LIMIT] Game answer blocked for user: ${socket.username}`);
      socket.emit('game_error', { message: 'Trop de réponses envoyées. Ralentissez.' });
      return;
    }
    
    const { answer } = data;
    
    // Validate input
    if (!answer || typeof answer !== 'string' || answer.length > 500) {
      socket.emit('game_error', { message: 'Invalid answer format' });
      return;
    }
    
    // Traiter la réponse comme un message de chat dans le canal Game
    const messageData = {
      room: 'Game',
      message: answer.trim()
    };
    
    await handleChatMessage(socket, messageData, io);
  });
};

async function startGame(channel, io) {
  console.log(`[START_GAME] Starting game for channel: ${channel}`);
  
  try {
    const updatedGame = await Game.findOneAndUpdate(
      { channel, isActive: false },
      { isActive: true },
      { new: true }
    );
    
    if (!updatedGame) {
      console.log(`[START_GAME] Game already active or not found for channel: ${channel}`);
      return;
    }
    
    activeGames.set(channel, updatedGame);
    console.log(`Game activated for channel: ${channel}`);
    
    io.to(`game_${channel}`).emit('game_started');
    
    // Démarrer la première question après un délai
    setTimeout(() => nextQuestion(channel, io), 2000);
  } catch (error) {
    console.error('Error starting game:', error);
  }
}

async function nextQuestion(channel, io) {
  try {
    const question = await getRandomQuestion();
    const game = activeGames.get(channel);
    
    if (!game || !game.isActive) {
      return;
    }
    
    // Mettre à jour en mémoire d'abord
    game.currentQuestion = {
      question: question.question,
      options: question.options,
      correctAnswer: question.correctAnswer,
      correctAnswerText: question.correctAnswerText,
      category: question.category,
      categoryEmoji: question.categoryEmoji,
      difficulty: question.difficulty,
      explanation: question.explanation,
      source: question.source,
      startTime: new Date(),
      answers: []
    };
    
    activeGames.set(channel, game);
    
    // Sauvegarder en base de manière asynchrone
    setImmediate(async () => {
      try {
        await Game.findOneAndUpdate(
          { channel, isActive: true },
          { currentQuestion: game.currentQuestion },
          { new: false }
        );
        gameCache.set(channel, { data: game, timestamp: Date.now() });
      } catch (error) {
        console.error('Error saving question:', error);
      }
    });
    
    // Envoyer la question de manière optimisée
    const questionData = {
      question: game.currentQuestion.question,
      options: game.currentQuestion.options || [],
      duration: QUESTION_DURATION,
      startTime: game.currentQuestion.startTime,
      category: game.currentQuestion.category || 'Quiz',
      categoryEmoji: game.currentQuestion.categoryEmoji || '❓',
      difficulty: game.currentQuestion.difficulty || 'Moyen'
    };
    
    io.to(`game_${channel}`).emit('new_question', questionData);
    
    // État du jeu optimisé
    io.to(`game_${channel}`).emit('game_state', {
      isActive: game.isActive,
      currentQuestion: game.currentQuestion,
      leaderboard: game.leaderboard.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 20)
    });
    
    // La question est affichée uniquement dans le GamePanel
    
    // Timer optimisé
    const timer = setTimeout(() => endQuestion(channel, io), QUESTION_DURATION);
    gameTimers.set(channel, timer);
    
  } catch (error) {
    console.error('Error generating question:', error);
    setTimeout(() => nextQuestion(channel, io), 5000);
  }
}

async function endQuestion(channel, io) {
  console.log(`Ending question for channel: ${channel}`);
  const game = activeGames.get(channel);
  if (!game || !game.currentQuestion) {
    console.log(`No game or question to end for channel: ${channel}`);
    return;
  }
  
  // Envoyer les résultats avec explication
  const endData = {
    correctAnswer: game.currentQuestion.correctAnswerText,
    explanation: game.currentQuestion.explanation,
    leaderboard: game.leaderboard.sort((a, b) => (b.score || 0) - (a.score || 0)),
    answers: game.currentQuestion.answers || []
  };
  
  console.log(`[GAME] Sending question ended data:`, endData);
  io.to(`game_${channel}`).emit('question_ended', endData);
  
  // Optimiser l'envoi des résultats
  const hasWinner = game.currentQuestion.answers?.some(a => a.isCorrect) || false;
  
  if (!hasWinner) {
    const finalLeaderboard = game.leaderboard
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5)
      .map((p, i) => `${i + 1}. ${p.username}: ${p.score} pts`)
      .join('\n');
    
    const explanation = game.currentQuestion.explanation || 'Aucune explication disponible.';
    
    io.to(channel).emit('receive_message', {
      _id: `explanation_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      sender: { _id: 'system', username: 'Quiz Bot' },
      content: `⏰ **TEMPS ÉCOULÉ !**\n\n✅ Réponse: ${game.currentQuestion.correctAnswerText}\n\n💡 **EXPLICATION**\n${explanation}\n\n🏆 **TOP 5:**\n${finalLeaderboard}`,
      createdAt: new Date().toISOString(),
      room: channel,
      isGameMessage: true
    });
  }
  
  // Nettoyer tous les timers pour ce canal
  const timersToClean = [`next_${channel}`, `transition_${channel}`, channel];
  timersToClean.forEach(timerKey => {
    const timer = gameTimers.get(timerKey);
    if (timer) {
      clearTimeout(timer);
      gameTimers.delete(timerKey);
    }
  });
  
  // Nettoyer la question de manière asynchrone
  delete game.currentQuestion;
  activeGames.set(channel, game);
  
  setImmediate(async () => {
    try {
      await Game.findOneAndUpdate(
        { channel },
        { $unset: { currentQuestion: 1 } },
        { new: false }
      );
      gameCache.set(channel, { data: game, timestamp: Date.now() });
    } catch (error) {
      console.error('Error clearing current question:', error);
    }
  });
  
  // Message de transition optimisé
  const transitionTimer = setTimeout(() => {
    io.to(channel).emit('receive_message', {
      _id: `transition_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      sender: { _id: 'system', username: 'Quiz Bot' },
      content: `⏳ **Prochaine question dans 3 secondes...**\n🎯 Préparez-vous !`,
      createdAt: new Date().toISOString(),
      room: channel,
      isGameMessage: true
    });
  }, 5000); // Réduit à 5 secondes
  
  gameTimers.set(`transition_${channel}`, transitionTimer);
  
  // Programmer la prochaine question de manière optimisée
  const nextQuestionTimer = setTimeout(() => {
    const transTimer = gameTimers.get(`transition_${channel}`);
    if (transTimer) {
      clearTimeout(transTimer);
      gameTimers.delete(`transition_${channel}`);
    }
    nextQuestion(channel, io);
  }, PAUSE_BETWEEN_QUESTIONS);
  
  gameTimers.set(`next_${channel}`, nextQuestionTimer);
}

// Démarrer le nettoyage automatique de la mémoire
memoryCleanup.start(activeGames, gameTimers, userActionTimestamps);

// Exporter les fonctions
module.exports.handleChatMessage = handleChatMessage;
module.exports.activeGames = activeGames;
module.exports.gameTimers = gameTimers;

console.log('Game handlers module loaded with memory optimization');