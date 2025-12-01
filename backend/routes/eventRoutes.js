import express from 'express';
const router = express.Router();
import verifyToken from '../middleware/authMiddleware.js';

import {
    getEvents,
    createEvent, 
    updateEvent,
    deleteEvent  
} from '../controllers/eventController.js';

router.use(verifyToken);

// GET /api/events - return list of all events
router.get('/', getEvents);

// POST /api/events - Create new event
router.post('/', createEvent);

// PATCH /api/events/:id - Update event
router.patch('/:id', updateEvent);

// DELETE /api/events/:id - Delete event
router.delete('/:id', deleteEvent);


export default router;