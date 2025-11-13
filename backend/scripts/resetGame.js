const mongoose = require('mongoose');
const Game = require('../models/Game');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function resetGame() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Supprimer le jeu existant
    await Game.deleteOne({ channel: 'Game' });
    console.log('✅ Game deleted');

    // Créer un nouveau jeu inactif
    const game = await Game.create({
      channel: 'Game',
      isActive: false,
      leaderboard: [],
      questionHistory: []
    });

    console.log('✅ New game created:', {
      channel: game.channel,
      isActive: game.isActive
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

resetGame();