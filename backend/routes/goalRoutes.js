import express from 'express';
const router = express.Router();
import verifyToken from '../middleware/authMiddleware.js';

import {
    getGoals,
    createGoal,
    updateGoal,
    deleteGoal
} from '../controllers/goalController.js';

router.use(verifyToken);

// GET /api/goals - return list of all goals
router.get('/', getGoals);

// POST /api/Goals - Create new Goal
router.post('/', createGoal);

// PATCH /api/Goals/:id - Update Goal
router.patch('/:id', updateGoal);

// DELETE /api/Goals/:id - Delete Goal
router.delete('/:id', deleteGoal);


export default router;