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

// PATCH /api/courses/:courseId - Update course
router.patch('/:courseId', updateCourse);

// DELETE /api/courses/:courseId  - Delete course
router.delete('/:courseId', deleteCourse);

export default router;