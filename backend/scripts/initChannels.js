const mongoose = require('mongoose');
const Channel = require('../models/Channel');
require('dotenv').config();

const defaultChannels = [
  'General',
  'Tech',
  'Gaming',
  'Music',
  'Random',
  'Sport',
  'Cinema'
];

async function initChannels() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connecté à MongoDB');

    for (const channelName of defaultChannels) {
      const existingChannel = await Channel.findOne({ name: channelName });
      if (!existingChannel) {
        await Channel.create({ name: channelName });
        console.log(`Canal "${channelName}" créé`);
      } else {
        console.log(`Canal "${channelName}" existe déjà`);
      }
    }

    console.log('Initialisation des canaux terminée');
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de l\'initialisation:', error);
    process.exit(1);
  }
}

initChannels();