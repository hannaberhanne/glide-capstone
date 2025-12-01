import express from 'express';
import verifyToken from '../middleware/authMiddleware.js';
import { generateSchedule, getTodaySchedule, triggerReplan, completeBlock } from '../controllers/scheduleController.js';

const router = express.Router();

router.use(verifyToken);

router.post('/generate', generateSchedule);
router.get('/today', getTodaySchedule);
router.post('/replan', triggerReplan);
router.patch('/blocks/:blockId/complete', completeBlock);

export default router;
