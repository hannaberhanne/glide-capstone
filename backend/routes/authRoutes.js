import express from 'express';
import { signUp, login } from '../controllers/authController.js';

const router = express.Router();


router.post('/signup', signUp);  // this means post request for creating a new user at '/api/auth/signup'

router.post('/login', login)  // /api/auth/login

export default router;