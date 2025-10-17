require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const createAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tchat_online';
    await mongoose.connect(mongoUri);
    
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || (() => {
      console.error('❌ ADMIN_PASSWORD environment variable is required');
      process.exit(1);
    })();
    
    // Vérifier si l'admin existe déjà
    const existingAdmin = await User.findOne({ username: adminUsername });
    if (existingAdmin) {
      console.log('Admin déjà existant');
      console.log('Username:', adminUsername);
      console.log('Mot de passe:', adminPassword);
      process.exit(0);
    }
    
    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    // Créer l'admin
    const admin = new User({
      username: adminUsername,
      email: process.env.ADMIN_EMAIL || 'admin@tchat.com',
      password: hashedPassword,
      role: 'admin',
      age: 25,
      isAnonymous: false
    });
    
    await admin.save();
    console.log('Admin créé avec succès');
    console.log('Username:', adminUsername);
    console.log('Mot de passe:', adminPassword);
    
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
};

createAdmin();