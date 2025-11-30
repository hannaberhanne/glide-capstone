import express from 'express';
const router = express.Router();
import verifyToken from '../middleware/authMiddleware.js';

import {
    getAssignments,
    createAssignment,
    updateAssignment,
    deleteAssignment
} from '../controllers/assignmentController.js';

router.use(verifyToken);

// GET /api/assignments - return list of all assignments
router.get('/', getAssignments);

// POST /api/Assignments - Create new Assignment
router.post('/', createAssignment);

// PATCH /api/Assignments/:id - Update Assignment
router.patch('/:id', updateAssignment);

// DELETE /api/Assignments/:id - Delete Assignment
router.delete('/:id', deleteAssignment);

export default router;