const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
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
