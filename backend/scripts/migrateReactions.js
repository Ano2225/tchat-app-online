const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');

// Configuration de la base de données
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tchat_online';

async function migrateReactions() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Trouver tous les messages avec des réactions
    const messages = await Message.find({ 'reactions.0': { $exists: true } });
    console.log(`📊 ${messages.length} messages avec réactions trouvés`);

    let migrated = 0;
    let skipped = 0;

    for (const message of messages) {
      let needsUpdate = false;
      
      for (const reaction of message.reactions) {
        // Vérifier si la réaction utilise l'ancienne structure (ObjectId)
        if (reaction.users.length > 0 && typeof reaction.users[0] === 'string' && reaction.users[0].length === 24) {
          needsUpdate = true;
          
          // Convertir les ObjectId en objets avec id et username
          const newUsers = [];
          for (const userId of reaction.users) {
            try {
              const user = await User.findById(userId).select('username');
              if (user) {
                newUsers.push({
                  id: userId.toString(),
                  username: user.username
                });
              }
            } catch (error) {
              console.warn(`⚠️ Utilisateur ${userId} non trouvé`);
            }
          }
          
          reaction.users = newUsers;
          reaction.count = newUsers.length;
        }
      }
      
      if (needsUpdate) {
        await message.save();
        migrated++;
        console.log(`✅ Message ${message._id} migré`);
      } else {
        skipped++;
      }
    }

    console.log(`\n🎉 Migration terminée:`);
    console.log(`   - ${migrated} messages migrés`);
    console.log(`   - ${skipped} messages ignorés (déjà au bon format)`);

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnecté de MongoDB');
  }
}

// Exécuter la migration
if (require.main === module) {
  migrateReactions();
}

module.exports = migrateReactions;