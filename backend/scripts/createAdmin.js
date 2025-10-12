require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const createAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tchat_online';
    await mongoose.connect(mongoUri);
    
    const adminEmail = 'admin@tchat.com';
    const adminPassword = 'admin123';
    
    // Vérifier si l'admin existe déjà
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('Admin déjà existant');
      process.exit(0);
    }
    
    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    // Créer l'admin
    const admin = new User({
      username: 'Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin'
    });
    
    await admin.save();
    console.log('Admin créé avec succès');
    console.log('Email:', adminEmail);
    console.log('Mot de passe:', adminPassword);
    
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
};

createAdmin();