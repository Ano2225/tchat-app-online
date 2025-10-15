const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const auth = require('../middleware/auth');

// Middleware d'authentification pour toutes les routes
router.use(auth);

// Signaler un utilisateur
router.post('/report', reportController.reportUser);

// Bloquer/débloquer un utilisateur
router.post('/block/:userId', reportController.blockUser);
router.delete('/block/:userId', reportController.unblockUser);

// Récupérer les utilisateurs bloqués
router.get('/blocked', reportController.getBlockedUsers);

module.exports = router;