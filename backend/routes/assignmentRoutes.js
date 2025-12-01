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

// PATCH /api/Assignments/:assignmentId - Update Assignment
router.patch('/:assignmentId', updateAssignment);

// DELETE /api/Assignments/:assignmentId - Delete Assignment
router.delete('/:assignmentId', deleteAssignment);

export default router;