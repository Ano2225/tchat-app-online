const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const UserController = require('../controllers/userController');

const router = express.Router();

// Mettre à jour l'avatar de l'utilisateur
router.put('/avatar', authMiddleware, async (req, res) => {
  try {
    const { avatar, bgColor } = req.body;
    const userId = req.user.id;

    // Vérifier que l'utilisateur n'est pas anonyme
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    if (currentUser.isAnonymous || currentUser.email?.includes('anon_')) {
      return res.status(403).json({ message: 'Action non autorisée pour les utilisateurs anonymes' });
    }

    const updateData = { avatarUrl: avatar };
    if (bgColor) updateData.bgColor = bgColor;
    
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

router.put('/', authMiddleware, UserController.updateUserInfo)
router.get('/:id', UserController.getUserById)

module.exports = router;
