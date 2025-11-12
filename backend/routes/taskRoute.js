const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
    getTasks,
    createTask,
    updateTask,
    deleteTask
} = require('../controllers/taskController');