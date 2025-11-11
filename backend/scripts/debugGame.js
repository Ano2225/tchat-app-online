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

    // Supprimer tous les jeux qui ne sont pas dans le canal 'Game'
    const deleteResult = await Game.deleteMany({ channel: { $ne: 'Game' } });
    console.log(`\nDeleted ${deleteResult.deletedCount} non-Game games`);

    // Nettoyer les jeux bloqués dans le canal Game
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

    console.log(`Cleaned ${result.modifiedCount} Game channel games`);

    // Forcer la réinitialisation du jeu Game
    await Game.findOneAndUpdate(
      { channel: 'Game' },
      {
        isActive: false,
        currentQuestion: null,
        leaderboard: [],
        questionHistory: []
      },
      { upsert: true }
    );

    console.log('Game channel fully reset - restart server to reactivate');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

debugGame();