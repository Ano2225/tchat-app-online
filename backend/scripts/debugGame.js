const mongoose = require('mongoose');
const Game = require('../models/Game');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function debugGame() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Vérifier l'état actuel des jeux
    const games = await Game.find({});
    console.log('Current games:', games.length);

    for (const game of games) {
      console.log(`\nGame Channel: ${game.channel}`);
      console.log(`Is Active: ${game.isActive}`);
      console.log(`Current Question: ${game.currentQuestion ? 'Yes' : 'No'}`);
      console.log(`Leaderboard: ${game.leaderboard.length} players`);
      
      if (game.currentQuestion) {
        console.log(`Question: ${game.currentQuestion.question}`);
        console.log(`Started: ${game.currentQuestion.startTime}`);
        console.log(`Answers: ${game.currentQuestion.answers?.length || 0}`);
      }
    }

    // Nettoyer les jeux bloqués
    const result = await Game.updateMany(
      { 
        $or: [
          { 'currentQuestion.startTime': { $lt: new Date(Date.now() - 60000) } }, // Questions de plus d'1 minute
          { isActive: false }
        ]
      },
      { 
        $unset: { currentQuestion: 1 },
        $set: { isActive: false }
      }
    );

    console.log(`\nCleaned ${result.modifiedCount} games`);

    // Réactiver le jeu Game
    await Game.findOneAndUpdate(
      { channel: 'Game' },
      { 
        isActive: false,
        $unset: { currentQuestion: 1 }
      },
      { upsert: true }
    );

    console.log('Game channel reset - restart server to reactivate');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

debugGame();