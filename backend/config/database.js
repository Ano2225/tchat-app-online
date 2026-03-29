const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env'), override: true });

const connectDB = async () => {
  try {
    const rawUri = process.env.MONGODB_URI || '';
    if (rawUri) {
      const maskedUri = rawUri.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:****@');
      console.log(`MongoDB URI: ${maskedUri}`);
    } else {
      console.warn('MongoDB URI non défini');
    }
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 50,          // support 100 concurrent users with headroom
      minPoolSize: 5,           // keep 5 connections warm
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });
    console.log('MongoDB connecté avec succès');
    await removeLegacyUserIdIndex();
  } catch (error) {
    console.error('Échec de connexion à MongoDB:', error.message.replace(/[\r\n\t]/g, ' '));
    process.exit(1);
  }
};

const removeLegacyUserIdIndex = async () => {
  const db = mongoose.connection?.db;
  if (!db) return;

  const collections = await db.listCollections({ name: 'user' }).toArray();
  if (collections.length === 0) return;

  const userCollection = db.collection('user');
  const indexes = await userCollection.indexes();
  const legacyIndex = indexes.find((index) => index.key?.id === 1);
  if (!legacyIndex) return;

  try {
    await userCollection.dropIndex(legacyIndex.name);
    console.log('✅ Index legacy "id_1" supprimé de la collection user');
  } catch (error) {
    console.warn('⚠️  Suppression index legacy "id_1" ignorée:', error.message);
  }
};

module.exports = connectDB;
