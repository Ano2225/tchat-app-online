const User = require("../models/User");
const { ObjectId } = require('mongodb');

function buildIdQuery(id) {
  const str = String(id);
  return /^[0-9a-f]{24}$/i.test(str)
    ? { $or: [{ _id: str }, { _id: new ObjectId(str) }] }
    : { _id: str };
}

class UserController {

  async updateUserInfo(req, res) {
    try {
      const { username, age, sexe, ville, avatarUrl, bgColor } = req.body;

      const updateData = { username, age, ville };
      if (sexe !== undefined) updateData.sexe = sexe;
      if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
      if (bgColor) updateData.bgColor = bgColor;

      const result = await User.collection.findOneAndUpdate(
        buildIdQuery(req.user.id),
        { $set: updateData },
        { returnDocument: 'after', projection: { password: 0 } }
      );

      if (!result) {
        return res.status(404).json({ message: "Utilisateur introuvable" });
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('❌ Erreur updateUserInfo :', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  async getCurrentUserProfile(req, res) {
    try {
      const user = await User.collection.findOne(
        buildIdQuery(req.user.id),
        { projection: { password: 0, __v: 0 } }
      );

      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      res.status(200).json(user);
    } catch (error) {
      console.error('❌ Erreur getCurrentUserProfile :', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }

  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await User.collection.findOne(
        buildIdQuery(id),
        { projection: { password: 0, email: 0, createdAt: 0, updatedAt: 0 } }
      );

      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      res.status(200).json(user);
    } catch (error) {
      console.error("❌ Erreur getUserById :", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }

  async updateUserAvatar(req, res) {
    try {
      const { avatarUrl } = req.body;

      const result = await User.collection.findOneAndUpdate(
        buildIdQuery(req.user.id),
        { $set: { avatarUrl: avatarUrl || null } },
        { returnDocument: 'after', projection: { password: 0 } }
      );

      if (!result) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }

      res.json({ message: 'Avatar mis à jour avec succès', user: result });
    } catch (error) {
      console.error('❌ Erreur updateUserAvatar:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }
}

module.exports = new UserController();
