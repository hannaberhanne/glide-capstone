const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');

const {
    getTasks,  // starts on line 4
    createTask,  // line 29
    updateTask,  // line 84
    deleteTask  // line 161
} = require('../controllers/taskController');

router.use(verifyToken);

// GET /api/tasks - return list of all task
router.get('/', getTasks);

// POST /api/tasks - Create new task
router.post('/', createTask);

// PATCH /api/tasks/:id - Update task (toggle completion)
router.patch('/:id', updateTask);

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', deleteTask);

module.exports = router;