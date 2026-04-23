import express from 'express';
import verifyToken from '../middleware/authMiddleware.js';
import { signUp, login } from '../controllers/authController.js';

const router = express.Router();

router.post('/signup', verifyToken, signUp);
router.post('/login', verifyToken, login);

export default router;