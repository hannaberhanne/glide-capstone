import express from 'express';
const router = express.Router();
import verifyToken from '../middleware/authMiddleware.js';

import {
    getUser,
    updateUser,
    deleteUser
} from '../controllers/userController.js';

router.use(verifyToken);

// GET /api/users - return current user profile
router.get('/', getUser);

// GET /api/users/:userId - return list of all users
router.get('/:userId', getUser);

// PATCH /api/users/:userId - Update user
router.patch('/:userId', updateUser);

// DELETE /api/users/:userId - Delete users
router.delete('/:userId', deleteUser);

export default router;
