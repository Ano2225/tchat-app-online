const User = require("../models/User");
const mongoose = require('mongoose');

class UserController  {

  async updateUserInfo(req, res) {
      try {
        const { username, age, ville, avatarUrl, bgColor } = req.body;
    
        const updateData = { username, age, ville };
        if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
        if (bgColor) updateData.bgColor = bgColor;
    
        const updatedUser = await User.findByIdAndUpdate(
          req.user.id, 
          updateData,
          { new: true }
        ).select('-password');
    
        if (!updatedUser) {
          return res.status(404).json({ message: "Utilisateur introuvable" });
        }
    
        res.status(200).json(updatedUser);
      } catch (error) {
        console.error('❌ Erreur updateUserInfo :', error);
        res.status(500).json({ message: 'Erreur serveur' });
      }
    }

    async getCurrentUserProfile(req, res) {
      try {
        const user = await User.findById(req.user.id).select('-password -__v');
        
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

        // Support both string IDs (better-auth 32-char) and legacy ObjectId (24-char hex)
        const orConditions = [{ _id: id }];
        if (mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
          orConditions.push({ _id: new mongoose.Types.ObjectId(id) });
        }

        const user = await User.collection.findOne(
          { $or: orConditions },
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

        const user = await User.findByIdAndUpdate(
          req.user.id,
          { avatarUrl: avatarUrl || null },
          { new: true }
        ).select('-password');

        if (!user) {
          return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        res.json({ message: 'Avatar mis à jour avec succès', user });
      } catch (error) {
        console.error('❌ Erreur updateUserAvatar:', error);
        res.status(500).json({ message: 'Erreur serveur' });
      }
    }
}

module.exports = new UserController();
