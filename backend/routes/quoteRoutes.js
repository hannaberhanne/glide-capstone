import express from 'express';
const router = express.Router();
import verifyToken from '../middleware/authMiddleware.js';
import { getQuote } from "../controllers/quotesController.js";

router.use(verifyToken);

// /api/quotes
router.get('/', getQuote);

export default router;