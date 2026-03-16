const User = require('../models/User');
const Message = require('../models/Message');
const Report = require('../models/Report');
const Channel = require('../models/Channel');
const Alert = require('../models/Alert');
const { ObjectId } = require('mongodb');

function buildIdQuery(id) {
  const str = String(id);
  return /^[0-9a-f]{24}$/i.test(str)
    ? { $or: [{ _id: str }, { _id: new ObjectId(str) }] }
    : { _id: str };
}

class AdminController {
  // Statistiques du dashboard
  async getStats(req, res) {
    try {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [
        totalUsers,
        registeredUsers,
        activeUsers,
        onlineUsers,
        totalMessages,
        newUsersLast7d,
        newRegisteredUsersLast7d,
        messagesLast24h,
        totalReports
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isAnonymous: false }),
        User.countDocuments({ 
          $and: [
            { isAnonymous: false },
            { lastSeen: { $gte: last24h } }
          ]
        }),
        User.countDocuments({ isOnline: true }),
        Message.countDocuments(),
        User.countDocuments({ createdAt: { $gte: last7d } }),
        User.countDocuments({ 
          $and: [
            { isAnonymous: false },
            { createdAt: { $gte: last7d } }
          ]
        }),
        Message.countDocuments({ createdAt: { $gte: last24h } }),
        Report.countDocuments({ status: 'pending' })
      ]);

      res.json({
        totalUsers,
        registeredUsers,
        activeUsers,
        onlineUsers,
        totalMessages,
        newUsersLast7d,
        newRegisteredUsersLast7d,
        messagesLast24h,
        totalReports
      });
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  }

  // Récupérer tous les messages
  async getAllMessages(req, res) {
    try {
      const messages = await Message.find()
        .populate('sender', 'username isAnonymous')
        .populate('recipient', 'username')
        .sort({ createdAt: -1 })
        .limit(1000);

      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  }

  // Récupérer les activités récentes
  async getRecentActivity(req, res) {
    try {
      const activities = [];
      
      // Nouveaux utilisateurs (dernières 24h)
      const newUsers = await User.find({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }).sort({ createdAt: -1 }).limit(5);
      
      newUsers.forEach(user => {
        activities.push({
          _id: String(user._id),
          type: 'user_join',
          description: `${user.username} ${user.isAnonymous ? '(anonyme)' : ''} a rejoint la plateforme`,
          timestamp: user.createdAt,
          userId: String(user._id),
          username: user.username
        });
      });
      
      // Messages récents
      const recentMessages = await Message.find()
        .populate('sender', 'username')
        .populate('recipient', 'username')
        .sort({ createdAt: -1 })
        .limit(5);
        
      recentMessages.forEach(message => {
        if (!message.sender) return; // skip if sender was deleted
        const location = message.recipient ? `en privé à ${message.recipient?.username ?? '?'}` : `dans ${message.room || 'général'}`;
        activities.push({
          _id: String(message._id),
          type: 'message_sent',
          description: `${message.sender.username} a envoyé un message ${location}`,
          timestamp: message.createdAt,
          userId: String(message.sender._id),
          username: message.sender.username
        });
      });

      // Signalements récents
      const recentReports = await Report.find()
        .populate('reportedBy', 'username')
        .populate('reportedUser', 'username')
        .sort({ createdAt: -1 })
        .limit(3);

      recentReports.forEach(report => {
        if (!report.reportedBy || !report.reportedUser) return; // skip if user was deleted
        activities.push({
          _id: String(report._id),
          type: 'user_reported',
          description: `${report.reportedBy.username} a signalé ${report.reportedUser.username}`,
          timestamp: report.createdAt,
          userId: String(report.reportedBy._id),
          username: report.reportedBy.username
        });
      });
      
      // Trier par date décroissante et limiter à 10
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      res.json(activities.slice(0, 10));
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  }

  // Récupérer tous les signalements
  async getReports(req, res) {
    try {
      const reports = await Report.find()
        .populate('reportedBy', 'username')
        .populate('reportedUser', 'username')
        .sort({ createdAt: -1 });

      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  }

  // Récupérer tous les utilisateurs avec pagination
  async getUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const search = req.query.search || '';
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Construire le filtre de recherche
      const filter = escapedSearch ? {
        $or: [
          { username: { $regex: escapedSearch, $options: 'i' } },
          { email: { $regex: escapedSearch, $options: 'i' } }
        ]
      } : {};
      
      const [users, total] = await Promise.all([
        User.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        User.countDocuments(filter)
      ]);
      
      res.json({
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  }

  // Bloquer/débloquer un utilisateur
  async toggleUserBlock(req, res) {
    try {
      const { userId } = req.params;
      const { isBlocked } = req.body;

      await User.collection.updateOne(buildIdQuery(userId), { $set: { isBlocked } });
      res.json({ message: 'Statut utilisateur mis à jour' });
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  }

  // Supprimer un utilisateur
  async deleteUser(req, res) {
    try {
      const { userId } = req.params;
      await User.collection.deleteOne(buildIdQuery(userId));
      res.json({ message: 'Utilisateur supprimé' });
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  }

  // Créer un canal
  async createChannel(req, res) {
    try {
      const { name } = req.body;
      const channel = new Channel({ name });
      await channel.save();
      res.status(201).json(channel);
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  }

  // Supprimer un canal
  async deleteChannel(req, res) {
    try {
      const { channelId } = req.params;
      await Channel.findByIdAndDelete(channelId);
      res.json({ message: 'Canal supprimé' });
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  }

  // Analytics de connexion
  async getConnectionAnalytics(req, res) {
    try {
      const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [dailyStats, hourlyStats, dailyNewUsers, dailyMessages] = await Promise.all([
        // Utilisateurs actifs par jour (7 derniers jours)
        User.aggregate([
          { $match: { lastSeen: { $gte: last7Days } } },
          {
            $group: {
              _id: {
                day: { $dayOfWeek: '$lastSeen' },
                date: { $dateToString: { format: '%Y-%m-%d', date: '$lastSeen' } }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.date': 1 } }
        ]),
        // Connexions par heure (24h)
        User.aggregate([
          { $match: { lastSeen: { $gte: last24h } } },
          { $group: { _id: { $hour: '$lastSeen' }, count: { $sum: 1 } } },
          { $sort: { '_id': 1 } }
        ]),
        // Nouveaux inscrits par jour (7 derniers jours)
        User.aggregate([
          { $match: { createdAt: { $gte: last7Days }, isAnonymous: false } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id': 1 } }
        ]),
        // Messages envoyés par jour (7 derniers jours)
        Message.aggregate([
          { $match: { createdAt: { $gte: last7Days } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id': 1 } }
        ])
      ]);

      // Heure de pic
      const peakHour = hourlyStats.reduce((max, cur) => cur.count > max.count ? cur : max, { _id: 0, count: 0 });

      // Jour de pic
      const peakDay = dailyStats.reduce((max, cur) => cur.count > max.count ? cur : max, { _id: { day: 0 }, count: 0 });

      const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

      // Construire une timeline commune sur 7 jours
      const timeline = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString('fr-FR', { weekday: 'short', month: 'short', day: 'numeric' });
        const activeEntry = dailyStats.find(s => s._id.date === dateStr);
        const newUsersEntry = dailyNewUsers.find(s => s._id === dateStr);
        const messagesEntry = dailyMessages.find(s => s._id === dateStr);
        timeline.push({
          date: dateStr,
          label,
          activeUsers: activeEntry?.count ?? 0,
          newUsers: newUsersEntry?.count ?? 0,
          messages: messagesEntry?.count ?? 0,
        });
      }

      res.json({
        timeline,
        hourlyStats,
        peakHour: { hour: peakHour._id, count: peakHour.count },
        peakDay: { day: dayNames[peakDay._id.day - 1] || 'N/A', count: peakDay.count }
      });
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  }

  // Récupérer les alertes récentes
  async getAlerts(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      
      const [alerts, total, unreadCount] = await Promise.all([
        Alert.find()
          .populate('relatedUserId', 'username')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Alert.countDocuments(),
        Alert.countDocuments({ isRead: false })
      ]);
      
      res.json({
        alerts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        unreadCount
      });
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  }

  // Marquer une alerte comme lue
  async markAlertAsRead(req, res) {
    try {
      const { alertId } = req.params;
      await Alert.findByIdAndUpdate(alertId, { isRead: true });
      res.json({ message: 'Alerte marquée comme lue' });
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  }

  // Marquer toutes les alertes comme lues
  async markAllAlertsAsRead(req, res) {
    try {
      await Alert.updateMany({ isRead: false }, { isRead: true });
      res.json({ message: 'Toutes les alertes marquées comme lues' });
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  }

  // Traiter un signalement
  async handleReport(req, res) {
    try {
      const { reportId } = req.params;
      const { status, action } = req.body;

      const report = await Report.findById(reportId)
        .populate('reportedBy', 'username')
        .populate('reportedUser', 'username');
        
      if (!report) {
        return res.status(404).json({ message: 'Signalement non trouvé' });
      }

      report.status = status;
      await report.save();

      // Si action de blocage
      if (action === 'block') {
        const reportedUserId = String(report.reportedUser?._id || report.reportedUser);
        await User.collection.updateOne(buildIdQuery(reportedUserId), { $set: { isBlocked: true } });
        
        // Créer une alerte
        await Alert.create({
          type: 'user_blocked',
          title: 'Utilisateur bloqué',
          message: `L'utilisateur ${report.reportedUser.username} a été bloqué suite au signalement de ${report.reportedBy.username}`,
          severity: 'high',
          relatedUserId: report.reportedUser._id,
          relatedReportId: report._id
        });
      }

      res.json({ message: 'Signalement traité avec succès' });
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  }
}

module.exports = new AdminController();