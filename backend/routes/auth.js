const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');


router.post('/register', authController.register);

router.post('/login', authController.login);

// Anonymous login
router.post('/anonymous', authController.anonymousLogin);

router.post('/logout', authController.logout)

// test user authentification
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
