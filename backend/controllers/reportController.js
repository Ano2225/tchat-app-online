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
      const currentUser = await User.findById(currentUserId);

      if (currentUserId === userId) {
        return res.status(400).json({ message: 'Vous ne pouvez pas vous bloquer vous-même' });
      }

      const targetUser = await User.findById(userId);
      if (!targetUser) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      // Si c'est un admin qui bloque
      if (currentUser.role === 'admin') {
        // Blocage complet de la plateforme
        targetUser.isBlocked = true;
        await targetUser.save();
        
        // Créer une alerte
        await Alert.create({
          type: 'user_blocked',
          title: 'Utilisateur bloqué par admin',
          message: `${currentUser.username} (admin) a bloqué ${targetUser.username}`,
          severity: 'high',
          relatedUserId: userId
        });
        
        return res.json({ message: 'Utilisateur bloqué de la plateforme avec succès' });
      } else {
        // Blocage utilisateur normal (messages privés seulement)
        if (!currentUser.blockedUsers) {
          currentUser.blockedUsers = [];
        }

        if (currentUser.blockedUsers.includes(userId)) {
          return res.status(400).json({ message: 'Utilisateur déjà bloqué' });
        }

        currentUser.blockedUsers.push(userId);
        await currentUser.save();
        
        return res.json({ message: 'Utilisateur bloqué pour les messages privés' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  }

  // Débloquer un utilisateur
  async unblockUser(req, res) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user.id;
      const currentUser = await User.findById(currentUserId);
      const targetUser = await User.findById(userId);

      if (!targetUser) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      // Si c'est un admin qui débloque
      if (currentUser.role === 'admin') {
        targetUser.isBlocked = false;
        await targetUser.save();
        
        await Alert.create({
          type: 'user_unblocked',
          title: 'Utilisateur débloqué par admin',
          message: `${currentUser.username} (admin) a débloqué ${targetUser.username}`,
          severity: 'low',
          relatedUserId: userId
        });
        
        return res.json({ message: 'Utilisateur débloqué de la plateforme avec succès' });
      } else {
        // Déblocage utilisateur normal
        if (!currentUser.blockedUsers || !currentUser.blockedUsers.includes(userId)) {
          return res.status(400).json({ message: 'Utilisateur non bloqué' });
        }

        currentUser.blockedUsers = currentUser.blockedUsers.filter(id => id.toString() !== userId);
        await currentUser.save();

        return res.json({ message: 'Utilisateur débloqué pour les messages privés' });
      }
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