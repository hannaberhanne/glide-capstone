import express from 'express';
const router = express.Router();
import verifyToken from '../middleware/authMiddleware.js';

import {
    getTasks,
    createTask,
    updateTask,
    deleteTask
} from '../controllers/taskController.js';

router.use(verifyToken);

// GET /api/tasks - return list of all task
router.get('/', getTasks);

// POST /api/tasks - Create new task
router.post('/', createTask);

// PATCH /api/tasks/:taskId - Update task (toggle completion)
router.patch('/:taskId', updateTask);

// DELETE /api/tasks/:taskId - Delete task
router.delete('/:taskId', deleteTask);

export default router;