const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { signUp } = require('../controllers/authController');

router.post('/signup', verifyToken, signUp);  // this means post request for creating a new user at '/api/auth/signup

module.exports = router;