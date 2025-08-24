const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

const channelController = require('../controllers/channelController')

router.get('/', channelController.getChannels);
router.post('/',authMiddleware, channelController.createChannel);


module.exports = router;