const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
const Game = require('../models/Game');

async function forceNewQuestion() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const game = await Game.findOne({ channel: 'Game' });
    if (game) {
      // Nettoyer la question actuelle
      game.currentQuestion = null;
      await game.save();
      console.log('✅ Question actuelle supprimée - Une nouvelle va être générée');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

forceNewQuestion();