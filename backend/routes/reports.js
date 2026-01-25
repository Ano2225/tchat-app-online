const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authMiddleware } = require('../middleware/authBetter');
const { csrfProtection } = require('../middleware/csrf');

// Middleware d'authentification pour toutes les routes
router.use(authMiddleware);

// Signaler un utilisateur
router.post('/report', csrfProtection, reportController.reportUser);

// Bloquer/débloquer un utilisateur
router.post('/block/:userId', csrfProtection, reportController.blockUser);
router.delete('/block/:userId', csrfProtection, reportController.unblockUser);

// Récupérer les utilisateurs bloqués
router.get('/blocked', reportController.getBlockedUsers);

module.exports = router;