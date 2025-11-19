import express from 'express';
const router = express.Router();
import verifyToken from '../middleware/authMiddleware.js';
import signUp from '../controllers/authController.js';

router.post('/signup', verifyToken, signUp);  // this means post request for creating a new user at '/api/auth/signup'

export default router;