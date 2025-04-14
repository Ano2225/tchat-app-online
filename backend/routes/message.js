const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const MessageController = require('../controllers/messageController')


// Exemple de route protégée pour les messages
/*router.get('/messages', authMiddleware, (req, res) => {
  // Logique pour récupérer les messages
  res.json({ message: 'Liste des messages' });
});*/

//Show Message By Chanel
router.get('/:room',authMiddleware, MessageController.getMessagesByChanel);

router.post('/',authMiddleware, MessageController.createMessage)

module.exports = router;