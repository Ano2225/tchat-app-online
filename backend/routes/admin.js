const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminAuth = require('../middleware/adminAuth');
const adminRateLimit = require('../middleware/rateLimitAdmin');
const adminLogger = require('../middleware/adminLogger');

// Middleware d'authentification, rate limiting et logging admin
router.use(adminRateLimit);
router.use(adminAuth);
router.use(adminLogger);

// Statistiques
router.get('/stats', adminController.getStats);
router.get('/recent-activity', adminController.getRecentActivity);
router.get('/analytics', adminController.getConnectionAnalytics);

// Messages
router.get('/messages', adminController.getAllMessages);

// Utilisateurs
router.get('/users', adminController.getUsers);
router.put('/users/:userId/block', adminController.toggleUserBlock);
router.delete('/users/:userId', adminController.deleteUser);

// Canaux
router.post('/channels', adminController.createChannel);
router.delete('/channels/:channelId', adminController.deleteChannel);

// Alertes
router.get('/alerts', adminController.getAlerts);
router.put('/alerts/:alertId/read', adminController.markAlertAsRead);
router.put('/alerts/read-all', adminController.markAllAlertsAsRead);

// Signalements
router.get('/reports', adminController.getReports);
router.put('/reports/:reportId', adminController.handleReport);

module.exports = router;