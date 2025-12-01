import express from 'express';
import verifyToken from '../middleware/authMiddleware.js';
import { extractAssignments, replan } from '../controllers/aiController.js';

const router = express.Router();
router.use(verifyToken);

router.post('/extract', extractAssignments);
router.post('/replan', replan);

export default router;
