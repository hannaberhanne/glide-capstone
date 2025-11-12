const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');

const {
    getTasks,
    createTask,
    updateTask,
    deleteTask
} = require('../controllers/taskController');

router.use(verifyToken);

router.get('/', getTasks);

// POST /api/tasks - Create new task
router.post('/', createTask);

// PATCH /api/tasks/:id - Update task (toggle completion)
router.patch('/:id', updateTask);

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', deleteTask);

module.exports = router;