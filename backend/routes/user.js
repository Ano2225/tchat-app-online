const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const UserController = require('../controllers/userController');


router.put('/', authMiddleware, UserController.updateUserInfo)

module.exports = router;
