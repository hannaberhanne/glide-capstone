import express from 'express';
const router = express.Router();
import verifyToken from '../middleware/authMiddleware.js';

import {
    getHabits,
    createHabit,
    updateHabit,
    deleteHabit
} from '../controllers/habitController.js';

router.use(verifyToken);

// GET /api/Habits - return list of all Habit
router.get('/', getHabits);

// POST /api/Habits - Create new Habit
router.post('/', createHabit);

// PATCH /api/Habits/:habitId - Update Habit (toggle completion)
router.patch('/:habitId', updateHabit);

// DELETE /api/Habits/:habitId - Delete Habit
router.delete('/:habitId', deleteHabit);

export default router;