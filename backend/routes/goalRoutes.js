import express from 'express';
const router = express.Router();
import verifyToken from '../middleware/authMiddleware.js';

import {
    getGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    completeGoal,
    suggestTasks
} from '../controllers/goalController.js';

router.use(verifyToken);

// GET /api/goals - return list of all goals
router.get('/', getGoals);

// POST /api/Goals - Create new Goal
router.post('/', createGoal);


router.post("/suggest-tasks", verifyToken, suggestTasks);

// PATCH /api/Goals/:goalId - Update Goal
router.patch('/:goalId', updateGoal);

// DELETE /api/Goals/:goalId - Delete Goal
router.delete('/:goalId', deleteGoal);

// PATCH /api/goals/:goalId/complete - Complete Goal and award XP
router.patch('/:goalId/complete', completeGoal);


export default router;