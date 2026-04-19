import express from 'express';
import verifyToken from '../middleware/authMiddleware.js';
import {
    getUser,
    updateUser,
    deleteUser,
} from '../controllers/userController.js';

const router = express.Router();

router.use(verifyToken);

// GET /api/users - return current user profile
router.get('/', getUser);

// GET /api/users/:userId - return specific user
router.get('/:userId', getUser);

// PATCH /api/users/:userId - Update user
router.patch('/:userId', updateUser);

// DELETE /api/users/:userId - Delete user
router.delete('/:userId', deleteUser);

export default router;