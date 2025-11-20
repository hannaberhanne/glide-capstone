import express from 'express';
const router = express.Router();
import verifyToken from '../middleware/authMiddleware.js';

import {
    getEvent,  
    createEvent, 
    updateEvent,
    deleteEvent  
} from '../controllers/eventController.js';