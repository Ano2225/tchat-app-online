const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connecté avec succès');
  } catch (error) {
    console.error('Échec de connexion à MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;