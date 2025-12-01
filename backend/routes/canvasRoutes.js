import express from 'express';
import { syncCanvas, getCanvasSyncStatus, disconnectCanvas } from '../controllers/canvasController.js';
import verifyToken from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/sync', verifyToken, syncCanvas);
router.get('/status', verifyToken, getCanvasSyncStatus);
router.post('/disconnect', verifyToken, disconnectCanvas);

export default router;