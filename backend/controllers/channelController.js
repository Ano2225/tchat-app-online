const Channel = require('../models/Channel');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Accès administrateur requis' });
      }

      const normalizedName = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      
      if (!normalizedName) {
        return res.status(400).json({ message: 'Le nom du canal est requis' });
      }

      if (normalizedName.length > 40) {
        return res.status(400).json({ message: 'Le nom du canal est trop long (40 caractères max)' });
      }

      const existingChannel = await Channel.findOne({
        name: { $regex: `^${escapeRegex(normalizedName)}$`, $options: 'i' },
      });
      if (existingChannel) {
        return res.status(400).json({ message: 'Ce canal existe déjà' });
      }

      const channel = new Channel({ name: normalizedName });
      await channel.save();

      res.status(201).json(channel);
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  }
}

module.exports = new ChannelController();
