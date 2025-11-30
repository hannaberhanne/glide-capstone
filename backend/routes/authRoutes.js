import express from 'express';
const router = express.Router();
import verifyToken from '../middleware/authMiddleware.js';
import { signUp, login } from '../controllers/authController.js';

router.post('/signup', verifyToken, signUp);  // this means post request for creating a new user at '/api/auth/signup'

router.post('/login', verifyToken, login)  // /api/auth/login

export default router;