const express = require('express');
const { authMiddleware } = require('../middleware/authBetter');
const { csrfProtection } = require('../middleware/csrf');
const UserController = require('../controllers/userController');

const router = express.Router();

router.put('/', authMiddleware, csrfProtection, UserController.updateUserInfo);
router.get('/profile', authMiddleware, UserController.getCurrentUserProfile);
router.put('/avatar', authMiddleware, csrfProtection, UserController.updateUserAvatar);
router.get('/:id', authMiddleware, UserController.getUserById);

module.exports = router;
