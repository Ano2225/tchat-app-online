const mongoose = require('mongoose');
const Game = require('../models/Game');
const { getRandomQuestion } = require('../services/questionService');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function forceQuestion() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const question = await getRandomQuestion();
    console.log('Generated question:', question.question);

    // Créer ou mettre à jour le jeu Game
    const game = await Game.findOneAndUpdate(
      { channel: 'Game' },
      {
        channel: 'Game',
        isActive: true,
        currentQuestion: {
          ...question,
          startTime: new Date(),
          answers: []
        },
        $setOnInsert: {
          leaderboard: [],
          questionHistory: []
        }
      },
      { upsert: true, new: true }
    );

    console.log('Game updated:', {
      channel: game.channel,
      isActive: game.isActive,
      hasQuestion: !!game.currentQuestion,
      question: game.currentQuestion?.question
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

forceQuestion();