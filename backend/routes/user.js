const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const UserController = require('../controllers/userController');

const router = express.Router();

router.put('/', authMiddleware, UserController.updateUserInfo)
router.get('/profile', authMiddleware, UserController.getCurrentUserProfile)
router.get('/:id', UserController.getUserById)

module.exports = router;
