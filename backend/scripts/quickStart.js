const mongoose = require('mongoose');
const Game = require('../models/Game');
const { getRandomQuestion } = require('../services/questionService');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function quickStart() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Nettoyer et redémarrer le jeu Game
    const question = getRandomQuestion();
    
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

    console.log('🎮 Game restarted with question:', question.question);
    console.log('⏰ Question will expire in 15 seconds');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Done - Go to Game channel now!');
  }
}

quickStart();