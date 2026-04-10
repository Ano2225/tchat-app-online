const User = require("../models/User");
const { ObjectId } = require('mongodb');

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const VALID_SEXES = new Set(['homme', 'femme', 'autre']);
const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

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
      const currentUser = await User.collection.findOne(
        buildIdQuery(req.user.id),
        { projection: { _id: 1 } }
      );

      if (!currentUser) {
        return res.status(404).json({ message: "Utilisateur introuvable" });
      }

      const updateData = {};

      if (username !== undefined) {
        const normalizedUsername = typeof username === 'string' ? username.trim() : '';
        if (!normalizedUsername) {
          return res.status(400).json({ message: 'Le nom d\'utilisateur est requis' });
        }
        if (!USERNAME_REGEX.test(normalizedUsername)) {
          return res.status(400).json({ message: 'Nom d\'utilisateur invalide (3-20 caractères, lettres/chiffres/underscore)' });
        }

        const existingUser = await User.collection.findOne(
          { username: normalizedUsername, _id: { $ne: currentUser._id } },
          { projection: { _id: 1 } }
        );
        if (existingUser) {
          return res.status(409).json({ message: 'Nom d\'utilisateur déjà utilisé' });
        }

        updateData.username = normalizedUsername;
      }

      if (age !== undefined) {
        if (age === null || age === '') {
          updateData.age = null;
        } else {
          const normalizedAge = Number(age);
          if (!Number.isInteger(normalizedAge) || normalizedAge < 18 || normalizedAge > 120) {
            return res.status(400).json({ message: 'Âge invalide (18 à 120 ans)' });
          }
          updateData.age = normalizedAge;
        }
      }

      if (sexe !== undefined) {
        const normalizedSexe = typeof sexe === 'string' ? sexe.trim().toLowerCase() : '';
        if (!VALID_SEXES.has(normalizedSexe)) {
          return res.status(400).json({ message: 'Sexe invalide' });
        }
        updateData.sexe = normalizedSexe;
      }

      if (ville !== undefined) {
        if (typeof ville !== 'string') {
          return res.status(400).json({ message: 'Ville invalide' });
        }
        const normalizedVille = ville.trim();
        if (normalizedVille.length > 80) {
          return res.status(400).json({ message: 'Ville trop longue (80 caractères max)' });
        }
        updateData.ville = normalizedVille;
      }

      if (avatarUrl !== undefined && avatarUrl !== null && avatarUrl !== '') {
        if (!/^https:\/\/res\.cloudinary\.com\//i.test(avatarUrl)) {
          return res.status(400).json({ message: 'URL avatar invalide. Seules les URLs Cloudinary sont acceptées.' });
        }
      }
      if (avatarUrl !== undefined) {
        updateData.avatarUrl = avatarUrl ? String(avatarUrl).trim() : null;
      }

      if (bgColor !== undefined) {
        if (bgColor === null || bgColor === '') {
          updateData.bgColor = null;
        } else {
          const normalizedBgColor = typeof bgColor === 'string' ? bgColor.trim() : '';
          if (!HEX_COLOR_REGEX.test(normalizedBgColor)) {
            return res.status(400).json({ message: 'Couleur de profil invalide' });
          }
          updateData.bgColor = normalizedBgColor;
        }
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'Aucune donnée valide à mettre à jour' });
      }

      updateData.updatedAt = new Date();

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
      if (error?.code === 11000) {
        return res.status(409).json({ message: 'Nom d\'utilisateur déjà utilisé' });
      }
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
      // Inclusion projection: only expose fields the UI actually needs
      const user = await User.collection.findOne(
        buildIdQuery(id),
        { projection: { username: 1, avatarUrl: 1, sexe: 1, role: 1, isOnline: 1, isAnonymous: 1 } }
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

      if (avatarUrl && !/^https:\/\/res\.cloudinary\.com\//i.test(avatarUrl)) {
        return res.status(400).json({ message: 'URL avatar invalide. Seules les URLs Cloudinary sont acceptées.' });
      }

      const result = await User.collection.findOneAndUpdate(
        buildIdQuery(req.user.id),
        { $set: { avatarUrl: avatarUrl || null, updatedAt: new Date() } },
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
