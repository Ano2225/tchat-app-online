const Report = require('../models/Report');
const User = require('../models/User');
const Alert = require('../models/Alert');

class ReportController {
  // Signaler un utilisateur
  async reportUser(req, res) {
    try {
      const { reportedUserId, reason, description } = req.body;
      const reportedBy = req.user.id;

      // Vérifier que l'utilisateur signalé existe
      const reportedUser = await User.findById(reportedUserId);
      if (!reportedUser) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      // Vérifier qu'on ne se signale pas soi-même
      if (reportedBy === reportedUserId) {
        return res.status(400).json({ message: 'Vous ne pouvez pas vous signaler vous-même' });
      }

      // Vérifier si un signalement existe déjà
      const existingReport = await Report.findOne({
        reportedBy,
        reportedUser: reportedUserId,
        status: 'pending'
      });

      if (existingReport) {
        return res.status(400).json({ message: 'Vous avez déjà signalé cet utilisateur' });
      }

      const report = new Report({
        reportedBy,
        reportedUser: reportedUserId,
        reason,
        description
      });

      await report.save();
      
      // Créer une alerte pour le nouveau signalement
      const reportedByUser = await User.findById(reportedBy);
      const reportedUserData = await User.findById(reportedUserId);
      
      await Alert.create({
        type: 'user_reported',
        title: 'Nouveau signalement',
        message: `${reportedByUser.username} a signalé ${reportedUserData.username} pour: ${reason}`,
        severity: 'medium',
        relatedUserId: reportedUserId,
        relatedReportId: report._id
      });

      res.status(201).json({ message: 'Signalement envoyé avec succès' });
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  }

  // Bloquer un utilisateur
  async blockUser(req, res) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user.id;

      if (currentUserId === userId) {
        return res.status(400).json({ message: 'Vous ne pouvez pas vous bloquer vous-même' });
      }

      const user = await User.findById(currentUserId);
      if (!user.blockedUsers) {
        user.blockedUsers = [];
      }

      if (user.blockedUsers.includes(userId)) {
        return res.status(400).json({ message: 'Utilisateur déjà bloqué' });
      }

      user.blockedUsers.push(userId);
      await user.save();

      res.json({ message: 'Utilisateur bloqué avec succès' });
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  }

  // Débloquer un utilisateur
  async unblockUser(req, res) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user.id;

      const user = await User.findById(currentUserId);
      if (!user.blockedUsers || !user.blockedUsers.includes(userId)) {
        return res.status(400).json({ message: 'Utilisateur non bloqué' });
      }

      user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== userId);
      await user.save();

      res.json({ message: 'Utilisateur débloqué avec succès' });
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  }

  // Récupérer la liste des utilisateurs bloqués
  async getBlockedUsers(req, res) {
    try {
      const user = await User.findById(req.user.id).populate('blockedUsers', 'username');
      res.json(user.blockedUsers || []);
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  }
}

module.exports = new ReportController();