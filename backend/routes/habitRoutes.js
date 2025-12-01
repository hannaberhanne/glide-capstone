import express from 'express';
const router = express.Router();
import verifyToken from '../middleware/authMiddleware.js';
import { createHabit, getHabits, completeHabit } from '../controllers/habitController.js';

router.use(verifyToken);

// POST /api/habits - create habit
router.post('/', createHabit);

// GET /api/habits - list habits
router.get('/', getHabits);

// PATCH /api/habits/:habitId/complete - complete habit today
router.patch('/:habitId/complete', completeHabit);

export default router;
