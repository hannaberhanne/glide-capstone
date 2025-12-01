import express from 'express';
const router = express.Router();
import verifyToken from '../middleware/authMiddleware.js';

import {
    getUser,
    updateUser,
    deleteUser
} from '../controllers/userController.js';

router.use(verifyToken);

// GET /api/users - return list of all users
router.get('/', getUser);

// PATCH /api/users/:id - Update user
router.patch('/:id', updateUser);

// DELETE /api/users/:id - Delete users
router.delete('/:id', deleteUser);

export default router;