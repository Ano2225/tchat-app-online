const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { validateUserRegistration } = require('../middleware/validation');

const router = express.Router();


router.post('/register', authLimiter, validateUserRegistration, authController.register);

router.post('/login', authLimiter, authController.login);

// Anonymous login
router.post('/anonymous', authLimiter, authController.anonymousLogin);

router.post('/logout', authController.logout)

// test user authentification
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
