require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const resetAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tchat_online';
    await mongoose.connect(mongoUri);
    
    // Supprimer tous les admins existants
    await User.deleteMany({ role: 'admin' });
    console.log('Anciens admins supprimés');
    
    const adminUsername = 'admin';
    const adminPassword = 'admin123';
    
    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    // Créer le nouvel admin
    const admin = new User({
      username: adminUsername,
      email: 'admin@tchat.com',
      password: hashedPassword,
      role: 'admin',
      age: 25,
      isAnonymous: false
    });
    
    await admin.save();
    console.log('Nouvel admin créé avec succès');
    console.log('Username:', adminUsername);
    console.log('Mot de passe:', adminPassword);
    
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
};

resetAdmin();