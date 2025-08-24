const Channel = require('../models/Channel');

class ChannelController {
  // Récupérer tous les canaux
  async getChannels(req, res) {
    try {
      const channels = await Channel.find().sort({ createdAt: 1 });
      res.json(channels);
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  }

  // Créer un nouveau canal (admin seulement)
  async createChannel(req, res) {
    try {
      const { name } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: 'Le nom du canal est requis' });
      }

      const existingChannel = await Channel.findOne({ name });
      if (existingChannel) {
        return res.status(400).json({ message: 'Ce canal existe déjà' });
      }

      const channel = new Channel({ name });
      await channel.save();

      res.status(201).json(channel);
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  }
}

module.exports = new ChannelController();