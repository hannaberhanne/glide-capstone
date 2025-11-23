import express from 'express';
const router = express.Router();
import verifyToken from '../middleware/authMiddleware.js';

import {
    getCourses,
    createCourse,
    updateCourse,
    deleteCourse
} from '../controllers/courseController.js';

router.use(verifyToken);

// GET /api/courses - return list of all courses
router.get('/', getCourses);

// POST /api/courses - Create new Course
router.post('/', createCourse);

// PATCH /api/courses/:id - Update course
router.patch('/:id', updateCourse);

// DELETE /api/courses/:id - Delete course
router.delete('/:id', deleteCourse);

export default router;