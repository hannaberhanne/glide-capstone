import express from 'express';
const router = express.Router();
import verifyToken from '../middleware/authMiddleware.js';

import {
    getTasks,
    createTask,
    updateTask,
    deleteTask,
    completeTask
} from '../controllers/taskController.js';

router.use(verifyToken);

// GET /api/tasks - return list of all task
router.get('/', getTasks);

// POST /api/tasks - Create new task
router.post('/', createTask);

// PATCH /api/tasks/:taskId - Update task
router.patch('/:taskId', updateTask);

// PATCH /api/tasks/:taskId/complete - mark complete + award XP
router.patch('/:taskId/complete', completeTask);

// DELETE /api/tasks/:taskId - Delete task
router.delete('/:taskId', deleteTask);

export default router;
