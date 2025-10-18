const mongoose = require('mongoose');
const Game = require('../models/Game');

// Configuration de la base de données
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tchat_online';

async function cleanGames() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connecté à MongoDB');

    // Supprimer tous les jeux actifs pour éviter les conflits
    const result = await Game.deleteMany({});
    console.log(`${result.deletedCount} jeux supprimés`);

    console.log('Nettoyage terminé');
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors du nettoyage:', error);
    process.exit(1);
  }
}

cleanGames();