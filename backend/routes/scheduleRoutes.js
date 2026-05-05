import express from 'express';
import verifyToken from '../middleware/authMiddleware.js';
import { generateSchedule, getTodaySchedule, triggerReplan, completeBlock, deleteBlock } from '../controllers/scheduleController.js';

const router = express.Router();

router.use(verifyToken);

router.post('/generate', generateSchedule);
router.get('/today', getTodaySchedule);
router.post('/replan', triggerReplan);
router.patch('/blocks/:blockId/complete', completeBlock);
router.delete('/blocks/:blockId', deleteBlock);

export default router;
