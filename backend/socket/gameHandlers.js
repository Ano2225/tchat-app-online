const Game = require('../models/Game');
const { getRandomQuestion } = require('../services/questionService');

const activeGames = new Map();
const gameTimers = new Map();

const QUESTION_DURATION = 10000; // 10 secondes
const PAUSE_BETWEEN_QUESTIONS = 2000; // 2 secondes pour voir l'explication

const handleChatMessage = async (socket, data, io) => {
  const { room: channel, message } = data;
  const game = activeGames.get(channel);
  
  console.log(`[GAME] Message received in channel ${channel}: "${message}"`);
  console.log(`[GAME] Game exists: ${!!game}, isActive: ${game?.isActive}, hasQuestion: ${!!game?.currentQuestion}`);
  
  if (!game || !game.isActive || !game.currentQuestion) {
    console.log(`[GAME] Ignoring message - game not ready`);
    return;
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
    return;
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
      io.to(`game_${channel}`).emit('winner_announced', {
        winner: socket.username,
        points,
        correctAnswer: game.currentQuestion.correctAnswerText
      });
      
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
      
      // Terminer la question immédiatement
      const currentTimer = gameTimers.get(channel);
      if (currentTimer) {
        clearTimeout(currentTimer);
        gameTimers.delete(channel);
      }
      setTimeout(() => {
        endQuestion(channel, io);
      }, 2000); // 2 secondes pour voir le gagnant
    }
  }
  
  // Sauvegarder avec gestion d'erreur de concurrence
  try {
    await game.save();
  } catch (error) {
    if (error.name === 'VersionError') {
      console.log('Version conflict detected, reloading game state');
      // Recharger le jeu depuis la base de données
      const freshGame = await Game.findOne({ channel });
      if (freshGame) {
        activeGames.set(channel, freshGame);
      }
    } else {
      console.error('Error saving game:', error);
    }
  }
};

module.exports = (io, socket) => {
  console.log('Game handlers initialized for socket:', socket.id);
  
  socket.on('join_game_channel', async (channel) => {
    console.log(`User joining game channel: ${channel}`);
    socket.join(`game_${channel}`);
    
    let game = activeGames.get(channel);
    if (!game) {
      try {
        game = await Game.findOne({ channel }) || await Game.create({ channel });
        activeGames.set(channel, game);
        console.log(`Game created/loaded for channel: ${channel}`);
      } catch (error) {
        console.error('Error creating/loading game:', error);
        // Créer un jeu temporaire en mémoire
        game = {
          channel,
          isActive: false,
          leaderboard: [],
          questionHistory: [],
          save: async () => {}
        };
        activeGames.set(channel, game);
      }
    }
    
    // Ajouter le joueur au leaderboard s'il n'y est pas déjà
    if (socket.userId && socket.username) {
      const existingPlayer = game.leaderboard.find(p => p.userId?.toString() === socket.userId);
      if (!existingPlayer) {
        game.leaderboard.push({
          userId: socket.userId,
          username: socket.username,
          score: 0
        });
        try {
          await game.save();
        } catch (error) {
          if (error.name === 'VersionError') {
            console.log('Version conflict when adding player, reloading game');
            const freshGame = await Game.findOne({ channel });
            if (freshGame) {
              activeGames.set(channel, freshGame);
              game = freshGame;
            }
          } else {
            console.error('Error saving game when adding player:', error);
          }
        }
      }
    }
    
    // Démarrer le jeu automatiquement
    console.log(`Game status for ${channel}: isActive=${game.isActive}`);
    if (!game.isActive) {
      console.log(`Starting game for channel: ${channel}`);
      startGame(channel, io);
    } else {
      console.log(`Game already active for channel: ${channel}, checking current question`);
      if (!game.currentQuestion) {
        console.log(`No current question, starting new question`);
        nextQuestion(channel, io);
      }
    }
    
    // Envoyer l'état actuel
    socket.emit('game_state', {
      isActive: game.isActive,
      currentQuestion: game.currentQuestion,
      leaderboard: (game.leaderboard || []).sort((a, b) => (b.score || 0) - (a.score || 0))
    });
  });



  socket.on('start_game', async (channel) => {
    const game = activeGames.get(channel);
    if (game && !game.isActive) {
      startGame(channel, io);
    }
  });

  socket.on('leave_game_channel', (channel) => {
    socket.leave(`game_${channel}`);
  });
};

async function startGame(channel, io) {
  console.log(`Starting game for channel: ${channel}`);
  const game = activeGames.get(channel);
  if (!game) {
    console.log(`No game found for channel: ${channel}`);
    return;
  }
  
  game.isActive = true;
  try {
    await game.save();
    console.log(`Game activated for channel: ${channel}`);
  } catch (error) {
    if (error.name === 'VersionError') {
      console.log('Version conflict when starting game, reloading');
      const freshGame = await Game.findOne({ channel });
      if (freshGame) {
        freshGame.isActive = true;
        await freshGame.save();
        activeGames.set(channel, freshGame);
      }
    } else {
      console.error('Error starting game:', error);
    }
  }
  
  io.to(`game_${channel}`).emit('game_started');
  
  // Démarrer immédiatement la première question
  nextQuestion(channel, io);
}

async function nextQuestion(channel, io) {
  console.log(`Next question for channel: ${channel}`);
  const game = activeGames.get(channel);
  if (!game) {
    console.log(`No game found for next question in channel: ${channel}`);
    return;
  }
  
  const question = getRandomQuestion();
  console.log(`Generated question: ${question.question}`);
  game.currentQuestion = {
    ...question,
    startTime: new Date(),
    answers: []
  };
  
  try {
    await game.save();
  } catch (error) {
    if (error.name === 'VersionError') {
      console.log('Version conflict when setting question, reloading');
      const freshGame = await Game.findOne({ channel });
      if (freshGame) {
        freshGame.currentQuestion = {
          ...question,
          startTime: new Date(),
          answers: []
        };
        await freshGame.save();
        activeGames.set(channel, freshGame);
      }
    } else {
      console.error('Error saving question:', error);
    }
  }
  
  // Envoyer la nouvelle question
  io.to(`game_${channel}`).emit('new_question', {
    question: question.question,
    duration: QUESTION_DURATION
  });
  console.log(`Question sent to game_${channel}`);
  
  // Annoncer la nouvelle question dans le chat
  io.to(channel).emit('receive_message', {
    _id: `game_question_${Date.now()}`,
    sender: {
      _id: 'system',
      username: 'Quiz Bot'
    },
    content: `❓ **QUESTION QUIZ**\n${question.question}\n\n💬 Tapez votre réponse dans le chat !`,
    createdAt: new Date().toISOString(),
    room: channel
  });
  
  // Timer pour la fin de la question
  const timer = setTimeout(() => {
    console.log(`Timer expired for question in channel: ${channel}`);
    endQuestion(channel, io);
  }, QUESTION_DURATION);
  
  gameTimers.set(channel, timer);
}

async function endQuestion(channel, io) {
  const game = activeGames.get(channel);
  if (!game || !game.currentQuestion) return;
  
  // Ajouter à l'historique
  game.questionHistory.push({
    question: game.currentQuestion.question,
    correctAnswer: game.currentQuestion.correctAnswerText,
    explanation: game.currentQuestion.explanation,
    answers: game.currentQuestion.answers || []
  });
  
  try {
    await game.save();
  } catch (error) {
    if (error.name === 'VersionError') {
      console.log('Version conflict when ending question, reloading');
      const freshGame = await Game.findOne({ channel });
      if (freshGame) {
        activeGames.set(channel, freshGame);
      }
    } else {
      console.error('Error saving question history:', error);
    }
  }
  
  // Envoyer les résultats avec explication
  io.to(`game_${channel}`).emit('question_ended', {
    correctAnswer: game.currentQuestion.correctAnswerText,
    explanation: game.currentQuestion.explanation,
    leaderboard: game.leaderboard.sort((a, b) => (b.score || 0) - (a.score || 0)),
    answers: game.currentQuestion.answers || []
  });
  
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
  
  // Programmer la prochaine question
  console.log(`Scheduling next question in ${PAUSE_BETWEEN_QUESTIONS}ms for channel: ${channel}`);
  setTimeout(() => {
    nextQuestion(channel, io);
  }, PAUSE_BETWEEN_QUESTIONS);
}

// Exporter la fonction pour l'utiliser dans socketHandlers
module.exports.handleChatMessage = handleChatMessage;

console.log('Game handlers module loaded');