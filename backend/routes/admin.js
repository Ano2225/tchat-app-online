const express = require('express');
const User = require('../models/User');
const Channel = require('../models/Channel');
const Message = require('../models/Message');
const authMiddleware = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting pour les routes admin
const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limite de 100 requêtes par fenêtre
  message: 'Trop de requêtes admin, réessayez plus tard'
});

// Middleware pour vérifier les droits admin
const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès refusé - Admin requis' });
  }
  next();
};

// Appliquer le rate limiting à toutes les routes admin
router.use(adminRateLimit);

// Dashboard - Statistiques générales
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      totalMessages,
      totalChannels,
      blockedUsers,
      messagesLast24h,
      newUsersLast7d
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isOnline: true }),
      Message.countDocuments(),
      Channel.countDocuments(),
      User.countDocuments({ isBlocked: true }),
      Message.countDocuments({ createdAt: { $gte: last24h } }),
      User.countDocuments({ createdAt: { $gte: last7d } })
    ]);

    res.json({
      totalUsers,
      activeUsers,
      totalMessages,
      totalChannels,
      blockedUsers,
      messagesLast24h,
      newUsersLast7d,
      reportedMessages: 0 // À implémenter avec le système de signalement
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Activité récente
router.get('/recent-activity', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('username createdAt');

    const recentMessages = await Message.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('sender', 'username')
      .select('sender createdAt');

    const activities = [];

    recentUsers.forEach(user => {
      activities.push({
        _id: `user_${user._id}`,
        type: 'user_join',
        description: `${user.username} a rejoint la plateforme`,
        timestamp: user.createdAt,
        userId: user._id,
        username: user.username
      });
    });

    recentMessages.forEach(message => {
      activities.push({
        _id: `message_${message._id}`,
        type: 'message_sent',
        description: `${message.sender?.username || 'Utilisateur'} a envoyé un message`,
        timestamp: message.createdAt,
        userId: message.sender?._id,
        username: message.sender?.username
      });
    });

    // Trier par timestamp décroissant
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(activities.slice(0, 10));
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Récupérer tous les utilisateurs avec pagination
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const status = req.query.status; // 'active', 'blocked', 'all'

    const skip = (page - 1) * limit;
    
    let query = {};
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (status === 'blocked') {
      query.isBlocked = true;
    } else if (status === 'active') {
      query.isBlocked = false;
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query)
    ]);

    res.json({
      users,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Bloquer/débloquer un utilisateur
router.put('/users/:id/block', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { isBlocked, reason } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        isBlocked,
        blockReason: reason || null,
        blockedAt: isBlocked ? new Date() : null,
        blockedBy: isBlocked ? req.user.id : null
      },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    // Log de l'action admin
    console.log(`Admin ${req.user.username} ${isBlocked ? 'bloqué' : 'débloqué'} l'utilisateur ${user.username}`);
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Supprimer un utilisateur
router.delete('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Supprimer tous les messages de l'utilisateur
    await Message.deleteMany({ sender: req.params.id });
    
    // Supprimer l'utilisateur
    await User.findByIdAndDelete(req.params.id);
    
    // Log de l'action admin
    console.log(`Admin ${req.user.username} a supprimé l'utilisateur ${user.username}`);
    
    res.json({ message: 'Utilisateur et ses messages supprimés avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Créer un canal
router.post('/channels', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Le nom du canal est requis' });
    }

    const existingChannel = await Channel.findOne({ name: name.trim() });
    if (existingChannel) {
      return res.status(400).json({ message: 'Ce canal existe déjà' });
    }

    const channel = new Channel({ 
      name: name.trim(),
      description: description?.trim() || '',
      createdBy: req.user.id
    });
    await channel.save();
    
    res.status(201).json(channel);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Supprimer un canal
router.delete('/channels/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ message: 'Canal non trouvé' });
    }

    // Supprimer tous les messages du canal
    await Message.deleteMany({ channel: req.params.id });
    
    // Supprimer le canal
    await Channel.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Canal et ses messages supprimés avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Obtenir les messages signalés (à implémenter)
router.get('/reported-messages', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // À implémenter avec le système de signalement
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Analytiques détaillées
router.get('/analytics', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    let startDate;
    const now = new Date();
    
    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const [userGrowth, messageStats, channelStats] = await Promise.all([
      User.aggregate([
        {
          $match: { createdAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Message.aggregate([
        {
          $match: { createdAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Channel.aggregate([
        {
          $lookup: {
            from: 'messages',
            localField: '_id',
            foreignField: 'channel',
            as: 'messages'
          }
        },
        {
          $project: {
            name: 1,
            messageCount: { $size: '$messages' },
            createdAt: 1
          }
        },
        { $sort: { messageCount: -1 } },
        { $limit: 10 }
      ])
    ]);

    res.json({
      userGrowth,
      messageStats,
      topChannels: channelStats
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

module.exports = router;