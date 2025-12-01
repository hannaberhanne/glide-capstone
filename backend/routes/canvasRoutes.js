import express from 'express';
import { syncCanvas, getCanvasSyncStatus, disconnectCanvas } from '../controllers/canvasController.js';
import verifyToken from '../middleware/authMiddleware.js';

const router = express.Router();

// uses /api/canvas/sync
router.post('/sync', verifyToken, syncCanvas);

// uses api/canvas/status
router.get('/status', verifyToken, getCanvasSyncStatus);

// uses api/canvas/disconnect
router.post('/disconnect', verifyToken, disconnectCanvas);

export default router;