const Game = require('../models/Game');
const User = require('../models/User');
const { getRandomQuestion } = require('../services/questionService');

const activeGames = new Map();
const gameTimers = new Map();
const userActionTimestamps = new Map(); // Track user actions for rate limiting

const QUESTION_DURATION = 15000; // 15 secondes
const PAUSE_BETWEEN_QUESTIONS = 10000; // 10 secondes pour lire l'explication
const NEXT_QUESTION_DELAY = 3000; // 3 secondes avant la prochaine question
const RATE_LIMIT_WINDOW = 1000; // 1 second
const MAX_ACTIONS_PER_WINDOW = 5; // Max 5 actions per second per user

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
  
  // Si le jeu n'est pas en mémoire, le charger depuis la DB
  if (!game && channel === 'Game') {
    try {
      game = await Game.findOne({ channel });
      if (game) {
        activeGames.set(channel, game);
        console.log(`[GAME] Game loaded from DB for channel: ${channel}`);
      }
    } catch (error) {
      console.error('Error loading game from DB:', error);
    }
  }
  
  console.log(`[GAME] Message received in channel ${channel}: "${message}"`);
  console.log(`[GAME] Game exists: ${!!game}, isActive: ${game?.isActive}, hasQuestion: ${!!game?.currentQuestion}`);
  
  if (!game || !game.isActive || !game.currentQuestion) {
    console.log(`[GAME] No active game, allowing normal chat`);
    return false; // Allow normal chat message processing
  }
  
  // Vérifier si c'est une réponse à la question
  const userAnswer = message.trim().toLowerCase();
  const correctAnswer = game.currentQuestion.correctAnswerText?.toLowerCase() || '';
  
  console.log(`[GAME] User answer: "${userAnswer}", Correct answer: "${correctAnswer}"`);
  
  // Vérifier si l'utilisateur a déjà répondu
  if (!game.currentQuestion.answers) {
    game.currentQuestion.answers = [];
  }
  
  const existingAnswer = game.currentQuestion.answers.find(a => a.userId?.toString() === socket.userId);
  if (existingAnswer) {
    console.log(`[GAME] User ${socket.username} already answered`);
    return false; // Allow normal chat since user already answered
  }
  
  const responseTime = Date.now() - game.currentQuestion.startTime.getTime();
  
  // Améliorer la comparaison des réponses
  const normalizeText = (text) => text.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const normalizedUserAnswer = normalizeText(userAnswer);
  const normalizedCorrectAnswer = normalizeText(correctAnswer);
  
  const isCorrect = normalizedUserAnswer === normalizedCorrectAnswer || 
                   normalizedUserAnswer.includes(normalizedCorrectAnswer) ||
                   normalizedCorrectAnswer.includes(normalizedUserAnswer);
  
  console.log(`[GAME] Answer comparison - User: "${normalizedUserAnswer}", Correct: "${normalizedCorrectAnswer}", IsCorrect: ${isCorrect}`);
  
  // Enregistrer la réponse
  game.currentQuestion.answers.push({
    userId: socket.userId,
    username: socket.username,
    answer: userAnswer,
    isCorrect,
    responseTime
  });
  
  let points = 0;
  let isWinner = false;
  
  // Si c'est la première bonne réponse, ce joueur gagne le point
  if (isCorrect) {
    const correctAnswers = game.currentQuestion.answers.filter(a => a.isCorrect);
    if (correctAnswers.length === 1) { // Premier à répondre correctement
      points = 10;
      isWinner = true;
      
      // S'assurer que le joueur existe dans le leaderboard
      let player = game.leaderboard.find(p => p.userId?.toString() === socket.userId);
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
      
      // Envoyer un message dans le chat
      io.to(channel).emit('receive_message', {
        _id: `game_${Date.now()}`,
        sender: {
          _id: 'system',
          username: 'Quiz Bot'
        },
        content: `🏆 ${socket.username} a gagné cette manche ! (+${points} points)\nRéponse correcte: ${game.currentQuestion.correctAnswerText}`,
        createdAt: new Date().toISOString(),
        room: channel
      });
      
      // Terminer la question après un court délai
      const currentTimer = gameTimers.get(channel);
      if (currentTimer) {
        clearTimeout(currentTimer);
        gameTimers.delete(channel);
      }
      
      const endTimer = setTimeout(() => {
        endQuestion(channel, io);
      }, 5000); // 5 secondes pour voir le gagnant
      
      gameTimers.set(channel, endTimer);
    }
  }
  
  // Sauvegarder avec findOneAndUpdate pour éviter les conflits
  try {
    const updatedGame = await Game.findOneAndUpdate(
      { channel },
      { 
        'currentQuestion.answers': game.currentQuestion.answers,
        leaderboard: game.leaderboard
      },
      { new: true }
    );
    
    if (updatedGame) {
      activeGames.set(channel, updatedGame);
    }
  } catch (error) {
    console.error('Error saving game:', error);
  }
  
  return false; // Allow all messages to appear in chat for better multiplayer experience
};

module.exports = (io, socket) => {
  console.log('Game handlers initialized for socket:', socket.id);
  
  // Helper function to validate authenticated user
  const validateAuthenticatedUser = (socket) => {
    if (!socket.userId || !socket.username) {
      console.log(`[SECURITY] Unauthorized game action attempt from socket: ${socket.id}`);
      socket.emit('game_error', { message: 'Authentication required for game actions' });
      return false;
    }
    return true;
  };
  
  // Helper function to check rate limiting
  const checkRateLimit = (userId) => {
    const now = Date.now();
    const userActions = userActionTimestamps.get(userId) || [];
    
    // Remove old timestamps outside the window
    const recentActions = userActions.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
    
    if (recentActions.length >= MAX_ACTIONS_PER_WINDOW) {
      console.log(`[SECURITY] Rate limit exceeded for user: ${userId}`);
      return false;
    }
    
    // Add current timestamp
    recentActions.push(now);
    userActionTimestamps.set(userId, recentActions);
    
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
      const user = await User.findById(socket.userId);
      if (!user || user.isAnonymous) {
        socket.emit('game_error', { message: 'Le quiz est réservé aux utilisateurs inscrits' });
        return;
      }
    } catch (error) {
      console.error('Error checking user registration:', error);
      socket.emit('game_error', { message: 'Erreur de vérification utilisateur' });
      return;
    }

    // Check rate limiting
    if (!checkRateLimit(socket.userId)) {
      socket.emit('game_error', { message: 'Too many requests. Please slow down.' });
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
        game = await Game.findOne({ channel });
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
        console.error('Error creating/loading game:', error);
        socket.emit('game_error', { message: 'Erreur lors du chargement du jeu' });
        return;
      }
    }

    // Ajouter le joueur au leaderboard s'il n'y est pas déjà (une seule fois)
    if (socket.userId && socket.username) {
      const existingPlayer = game.leaderboard.find(p => p.userId?.toString() === socket.userId);
      if (!existingPlayer) {
        try {
          const updatedGame = await Game.findOneAndUpdate(
            { channel, 'leaderboard.userId': { $ne: socket.userId } },
            { $push: { leaderboard: { userId: socket.userId, username: socket.username, score: 0 } } },
            { new: true }
          );
          if (updatedGame) {
            activeGames.set(channel, updatedGame);
            game = updatedGame;
            console.log(`[GAME] Added ${socket.username} to leaderboard`);
          }
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
          socket.emit('new_question', {
            question: game.currentQuestion.question,
            duration: timeLeft * 1000,
            startTime: game.currentQuestion.startTime
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

    // Check rate limiting
    if (!checkRateLimit(socket.userId)) {
      socket.emit('game_error', { message: 'Too many requests. Please slow down.' });
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

    // Check rate limiting
    if (!checkRateLimit(socket.userId)) {
      socket.emit('game_error', { message: 'Too many requests. Please slow down.' });
      return;
    }

    // Validate channel parameter
    if (!channel || typeof channel !== 'string' || channel.length > 50) {
      socket.emit('game_error', { message: 'Invalid channel parameter' });
      return;
    }

    socket.leave(`game_${channel}`);
  });
  
  // Gérer les réponses du jeu
  socket.on('game_answer', async (data) => {
    // Validate authentication
    if (!validateAuthenticatedUser(socket)) {
      return;
    }

    // Check rate limiting
    if (!checkRateLimit(socket.userId)) {
      socket.emit('game_error', { message: 'Too many requests. Please slow down.' });
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
  console.log(`[NEXT_QUESTION] Starting for channel: ${channel}`);
  
  try {
    const question = await getRandomQuestion();
    console.log(`Generated question: ${question.question}`);
    
    const updatedGame = await Game.findOneAndUpdate(
      { channel, isActive: true },
      {
        currentQuestion: {
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
        }
      },
      { new: true }
    );
    
    if (!updatedGame) {
      console.log(`[NEXT_QUESTION] Game not found or not active for channel: ${channel}`);
      return;
    }
    
    activeGames.set(channel, updatedGame);
    
    // Envoyer la nouvelle question avec les options
    const questionData = {
      question: updatedGame.currentQuestion.question,
      options: updatedGame.currentQuestion.options || [],
      duration: QUESTION_DURATION,
      startTime: updatedGame.currentQuestion.startTime,
      category: updatedGame.currentQuestion.category || 'Quiz',
      categoryEmoji: updatedGame.currentQuestion.categoryEmoji || '❓',
      difficulty: updatedGame.currentQuestion.difficulty || 'Moyen',
      source: updatedGame.currentQuestion.source || 'Local'
    };
    
    console.log(`[NEXT_QUESTION] Sending question to game_${channel}:`, questionData);
    io.to(`game_${channel}`).emit('new_question', questionData);
    
    // Envoyer aussi l'état du jeu mis à jour
    io.to(`game_${channel}`).emit('game_state', {
      isActive: updatedGame.isActive,
      currentQuestion: updatedGame.currentQuestion,
      leaderboard: updatedGame.leaderboard.sort((a, b) => (b.score || 0) - (a.score || 0))
    });
    
    // Annoncer la nouvelle question dans le chat
    const categoryInfo = (updatedGame.currentQuestion?.categoryEmoji || '❓') + ' ' + (updatedGame.currentQuestion?.category || 'Quiz');
    const difficultyInfo = updatedGame.currentQuestion?.difficulty ? ` (${updatedGame.currentQuestion.difficulty})` : '';
    
    io.to(channel).emit('receive_message', {
      _id: `game_question_${Date.now()}`,
      sender: {
        _id: 'system',
        username: 'Quiz Bot'
      },
      content: `❓ **QUESTION ${categoryInfo.toUpperCase()}${difficultyInfo}**\n${updatedGame.currentQuestion.question}\n\n💬 Tapez votre réponse dans le chat !`,
      createdAt: new Date().toISOString(),
      room: channel
    });
    
    // Timer pour la fin de la question
    const timer = setTimeout(() => {
      console.log(`Timer expired for question in channel: ${channel}`);
      endQuestion(channel, io);
    }, QUESTION_DURATION);
    
    gameTimers.set(channel, timer);
  } catch (error) {
    console.error('Error generating or saving question:', error);
    // Réessayer dans 10 secondes
    setTimeout(() => nextQuestion(channel, io), 10000);
    return;
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
  
  // Envoyer l'explication dans le chat
  io.to(channel).emit('receive_message', {
    _id: `game_explanation_${Date.now()}`,
    sender: {
      _id: 'system',
      username: 'Quiz Bot'
    },
    content: `💡 **EXPLICATION**\n${game.currentQuestion.explanation}`,
    createdAt: new Date().toISOString(),
    room: channel
  });
  
  // Nettoyer le timer actuel
  const currentTimer = gameTimers.get(channel);
  if (currentTimer) {
    clearTimeout(currentTimer);
    gameTimers.delete(channel);
  }
  
  // Nettoyer la question actuelle en base
  try {
    const updatedGame = await Game.findOneAndUpdate(
      { channel },
      { $unset: { currentQuestion: 1 } },
      { new: true }
    );
    if (updatedGame) {
      activeGames.set(channel, updatedGame);
    }
  } catch (error) {
    console.error('Error clearing current question:', error);
  }
  
  // Envoyer un message de transition
  setTimeout(() => {
    io.to(channel).emit('receive_message', {
      _id: `game_next_${Date.now()}`,
      sender: {
        _id: 'system',
        username: 'Quiz Bot'
      },
      content: `⏳ **Prochaine question dans 3 secondes...**`,
      createdAt: new Date().toISOString(),
      room: channel
    });
  }, PAUSE_BETWEEN_QUESTIONS - NEXT_QUESTION_DELAY);
  
  // Programmer la prochaine question
  console.log(`Scheduling next question in ${PAUSE_BETWEEN_QUESTIONS}ms for channel: ${channel}`);
  const nextQuestionTimer = setTimeout(() => {
    nextQuestion(channel, io);
  }, PAUSE_BETWEEN_QUESTIONS);
  
  gameTimers.set(channel, nextQuestionTimer);
}

// Exporter les fonctions pour l'utiliser dans socketHandlers
module.exports.handleChatMessage = handleChatMessage;
module.exports.activeGames = activeGames;
module.exports.gameTimers = gameTimers;

console.log('Game handlers module loaded');