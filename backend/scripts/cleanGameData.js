const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Game = require('../models/Game');

async function cleanGameData() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chat_application';
    await mongoose.connect(mongoUri);
    console.log('🔗 Connected to MongoDB');
    
    // Clear all current questions to avoid null reference issues
    const result = await Game.updateMany(
      {},
      { 
        $unset: { currentQuestion: 1 },
        $set: { isActive: false }
      }
    );
    
    console.log(`✅ Cleaned ${result.modifiedCount} game records`);
    console.log('🎮 All games reset and ready for new questions');
    
    await mongoose.disconnect();
    console.log('📴 Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error cleaning game data:', error);
    process.exit(1);
  }
}

cleanGameData();