const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authBetter');
const { csrfProtection } = require('../middleware/csrf');

const channelController = require('../controllers/channelController')

router.get('/', channelController.getChannels);
router.post('/', authMiddleware, csrfProtection, channelController.createChannel);


module.exports = router;