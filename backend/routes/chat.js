const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Exemple de route protégée pour les messages
router.get('/messages', authMiddleware, (req, res) => {
  // Logique pour récupérer les messages
  res.json({ message: 'Liste des messages' });
});

module.exports = router;