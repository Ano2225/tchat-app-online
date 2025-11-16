const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminAuth = require('../middleware/adminAuth');
const adminRateLimit = require('../middleware/rateLimitAdmin');
const adminLogger = require('../middleware/adminLogger');
const csrf = require('../middleware/csrf');

// Middleware d'authentification, rate limiting, CSRF et logging admin
router.use(adminRateLimit);
router.use(adminAuth);
router.use(csrf);
router.use(adminLogger);

// Statistiques
router.get('/stats', adminController.getStats);
router.get('/recent-activity', adminController.getRecentActivity);
router.get('/analytics', adminController.getConnectionAnalytics);

// Messages
router.get('/messages', adminController.getAllMessages);

// Utilisateurs
router.get('/users', adminController.getUsers);
router.put('/users/:userId/block', csrf, adminController.toggleUserBlock);
router.delete('/users/:userId', csrf, adminController.deleteUser);

// Canaux
router.post('/channels', csrf, adminController.createChannel);
router.delete('/channels/:channelId', csrf, adminController.deleteChannel);

// Alertes
router.get('/alerts', adminController.getAlerts);
router.put('/alerts/:alertId/read', csrf, adminController.markAlertAsRead);
router.put('/alerts/read-all', csrf, adminController.markAllAlertsAsRead);

// Signalements
router.get('/reports', adminController.getReports);
router.put('/reports/:reportId', csrf, adminController.handleReport);

module.exports = router;