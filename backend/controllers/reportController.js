const Report = require('../models/Report');
const User = require('../models/User');
const Alert = require('../models/Alert');
const { ObjectId } = require('mongodb');

function buildIdQuery(id) {
  const str = String(id);
  return /^[0-9a-f]{24}$/i.test(str)
    ? { $or: [{ _id: str }, { _id: new ObjectId(str) }] }
    : { _id: str };
}

class ReportController {
  async reportUser(req, res) {
    try {
      const { reportedUserId, reason, description } = req.body;
      const reportedBy = req.user.id;

      if (reportedBy === reportedUserId) {
        return res.status(400).json({ message: 'Vous ne pouvez pas vous signaler vous-même' });
      }

      const reportedUser = await User.collection.findOne(
        buildIdQuery(reportedUserId),
        { projection: { username: 1 } }
      );
      if (!reportedUser) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      const existingReport = await Report.findOne({
        reportedBy,
        reportedUser: reportedUserId,
        status: 'pending'
      });
      if (existingReport) {
        return res.status(400).json({ message: 'Vous avez déjà signalé cet utilisateur' });
      }

      const report = await Report.create({ reportedBy, reportedUser: reportedUserId, reason, description });

      const reporterUser = await User.collection.findOne(
        buildIdQuery(reportedBy),
        { projection: { username: 1 } }
      );

      await Alert.create({
        type: 'user_reported',
        title: 'Nouveau signalement',
        message: `${reporterUser?.username || reportedBy} a signalé ${reportedUser.username} pour: ${reason}`,
        severity: 'medium',
        relatedUserId: reportedUserId,
        relatedReportId: report._id
      });

      res.status(201).json({ message: 'Signalement envoyé avec succès' });
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
    }
  }

  async blockUser(req, res) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user.id;

      if (currentUserId === userId) {
        return res.status(400).json({ message: 'Vous ne pouvez pas vous bloquer vous-même' });
      }

      const currentUser = await User.collection.findOne(
        buildIdQuery(currentUserId),
        { projection: { username: 1, role: 1, blockedUsers: 1 } }
      );
      if (!currentUser) {
        return res.status(404).json({ message: 'Utilisateur courant introuvable' });
      }

      const targetUser = await User.collection.findOne(
        buildIdQuery(userId),
        { projection: { username: 1 } }
      );
      if (!targetUser) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      const blocked = (currentUser.blockedUsers || []).map(String);
      if (blocked.includes(String(userId))) {
        return res.status(400).json({ message: 'Utilisateur déjà bloqué' });
      }

      // Always push as plain string for consistency
      await User.collection.updateOne(
        buildIdQuery(currentUserId),
        { $push: { blockedUsers: String(userId) } }
      );

      if (currentUser.role === 'admin') {
        await User.collection.updateOne(
          buildIdQuery(userId),
          { $set: { isBlocked: true } }
        );
        await Alert.create({
          type: 'user_blocked',
          title: 'Utilisateur bloqué par admin',
          message: `${currentUser.username} (admin) a bloqué ${targetUser.username}`,
          severity: 'high',
          relatedUserId: userId
        });
      }

      const message = currentUser.role === 'admin'
        ? 'Utilisateur bloqué de la plateforme et personnellement'
        : 'Utilisateur bloqué pour les messages privés';

      return res.json({ message });
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
    }
  }

  async unblockUser(req, res) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user.id;

      const currentUser = await User.collection.findOne(
        buildIdQuery(currentUserId),
        { projection: { username: 1, role: 1, blockedUsers: 1 } }
      );
      if (!currentUser) {
        return res.status(404).json({ message: 'Utilisateur courant introuvable' });
      }

      // Build pull values covering both string and ObjectId forms of the same ID
      // (handles mixed legacy/better-auth data where the same ID may be stored as either type)
      const str = String(userId);
      const pullValues = /^[0-9a-f]{24}$/i.test(str)
        ? [str, new ObjectId(str)]
        : [str];

      await User.collection.updateOne(
        buildIdQuery(currentUserId),
        { $pull: { blockedUsers: { $in: pullValues } } }
      );

      if (currentUser.role === 'admin') {
        const targetUser = await User.collection.findOne(
          buildIdQuery(userId),
          { projection: { username: 1 } }
        );
        await User.collection.updateOne(
          buildIdQuery(userId),
          { $set: { isBlocked: false } }
        );
        await Alert.create({
          type: 'user_unblocked',
          title: 'Utilisateur débloqué par admin',
          message: `${currentUser.username} (admin) a débloqué ${targetUser?.username || userId}`,
          severity: 'low',
          relatedUserId: userId
        });
      }

      const message = currentUser.role === 'admin'
        ? 'Utilisateur débloqué de la plateforme et personnellement'
        : 'Utilisateur débloqué pour les messages privés';

      return res.json({ message });
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
    }
  }

  async getBlockedUsers(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.collection.findOne(
        buildIdQuery(userId),
        { projection: { blockedUsers: 1 } }
      );

      if (!user || !user.blockedUsers?.length) {
        return res.json([]);
      }

      const orClauses = user.blockedUsers.flatMap(id => {
        const str = String(id);
        return /^[0-9a-f]{24}$/i.test(str)
          ? [{ _id: str }, { _id: new ObjectId(str) }]
          : [{ _id: str }];
      });

      const users = await User.collection
        .find({ $or: orClauses }, { projection: { username: 1, avatarUrl: 1 } })
        .toArray();

      res.json(users.map(u => ({ _id: String(u._id), username: u.username, avatarUrl: u.avatarUrl || null })));
    } catch (error) {
      res.status(500).json({ message: 'Erreur serveur', ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
    }
  }
}

module.exports = new ReportController();
