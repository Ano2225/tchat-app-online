const express = require('express');
const User = require('../models/User');
const Channel = require('../models/Channel');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Middleware pour vérifier les droits admin
const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès refusé - Admin requis' });
  }
  next();
};

// Récupérer tous les utilisateurs
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Bloquer/débloquer un utilisateur
router.put('/users/:id/block', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { isBlocked } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Supprimer un utilisateur
router.delete('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Créer un canal
router.post('/channels', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Le nom du canal est requis' });
    }

    const existingChannel = await Channel.findOne({ name: name.trim() });
    if (existingChannel) {
      return res.status(400).json({ message: 'Ce canal existe déjà' });
    }

    const channel = new Channel({ name: name.trim() });
    await channel.save();
    
    res.status(201).json(channel);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Supprimer un canal
router.delete('/channels/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const channel = await Channel.findByIdAndDelete(req.params.id);
    if (!channel) {
      return res.status(404).json({ message: 'Canal non trouvé' });
    }
    res.json({ message: 'Canal supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

module.exports = router;