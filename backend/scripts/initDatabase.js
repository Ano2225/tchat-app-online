require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Channel = require('../models/Channel');
const Game = require('../models/Game');
const { getRandomQuestion } = require('../services/questionService');

const initDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tchat_online';
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté à MongoDB');

    // 1. Créer l'admin par défaut
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    const existingAdmin = await User.findOne({ username: adminUsername });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const admin = new User({
        username: adminUsername,
        email: process.env.ADMIN_EMAIL || 'admin@tchat.com',
        password: hashedPassword,
        role: 'admin',
        age: 25,
        sexe: 'autre',
        ville: 'Admin City',
        isAnonymous: false
      });
      
      await admin.save();
      console.log('✅ Admin créé - Username:', adminUsername, '| Password:', adminPassword);
    } else {
      console.log('ℹ️  Admin existe déjà');
    }

    // 2. Créer les canaux par défaut
    const defaultChannels = [
      'General',
      'Tech', 
      'Gaming',
      'Music',
      'Random',
      'Sport',
      'Cinema',
      'Game'
    ];

    for (const channelName of defaultChannels) {
      const existingChannel = await Channel.findOne({ name: channelName });
      if (!existingChannel) {
        await Channel.create({ name: channelName });
        console.log(`✅ Canal "${channelName}" créé`);
      } else {
        console.log(`ℹ️  Canal "${channelName}" existe déjà`);
      }
    }

    // 3. Initialiser le système de jeu
    const question = getRandomQuestion();
    const existingGame = await Game.findOne({ channel: 'Game' });
    
    if (!existingGame) {
      const game = new Game({
        channel: 'Game',
        isActive: true,
        currentQuestion: {
          ...question,
          startTime: new Date(),
          answers: []
        },
        leaderboard: [],
        questionHistory: []
      });
      
      await game.save();
      console.log('✅ Système de jeu initialisé avec la question:', question.question);
    } else {
      console.log('ℹ️  Système de jeu existe déjà');
    }

    console.log('\n🎉 Initialisation de la base de données terminée !');
    console.log('📋 Résumé:');
    console.log(`   - Admin: ${adminUsername} / ${adminPassword}`);
    console.log(`   - Canaux: ${defaultChannels.length} canaux créés`);
    console.log('   - Système de jeu: Activé');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    process.exit(1);
  }
};

initDatabase();