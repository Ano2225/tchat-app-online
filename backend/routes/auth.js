const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Route d'inscription
router.post('/register', authController.register);

// Route de connexion
router.post('/login', authController.login);

// Route de connexion anonyme
router.post('/anonymous', authController.anonymousLogin);

router.post('/logout', authController.logout)

// Route de test pour vérifier l'authentification
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
