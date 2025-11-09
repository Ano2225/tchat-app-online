const mongoose = require('mongoose');
require('dotenv').config();

const Game = require('../models/Game');

async function resetGame() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔄 Connexion à MongoDB...');
    
    // Supprimer ou réinitialiser le jeu Game
    await Game.deleteOne({ channel: 'Game' });
    console.log('✅ Jeu Game réinitialisé');
    
    // Créer un nouveau jeu
    const newGame = await Game.create({
      channel: 'Game',
      isActive: false,
      leaderboard: [],
      questionHistory: []
    });
    
    console.log('✅ Nouveau jeu créé');
    console.log('🎮 Le jeu va redémarrer automatiquement quand quelqu\'un rejoindra le canal');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

resetGame();