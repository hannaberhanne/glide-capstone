//import { db } from './config/firebase.js';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import aiRoutes from './routes/aiRoutes.js';


// Load .env variables
dotenv.config();

const app = express();

// Get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CORS Configuration ---
const allowlist = new Set([
  'http://localhost:5173',  // frontend dev server
  'http://localhost:8080',  // backend serving frontend
  // add Vercel URL here when deployed or whatever we use
  // 'https://glide-plus.vercel.app',
]);

/*
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, or same-origin)
    if (!origin || allowlist.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies/auth headers
};
*/

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;  // can prob delete 8080 when everyone's .env is made

// Route imports are right below
import assignmentRoutes from './routes/assignmentRoutes.js';
import authRoutes from './routes/authRoutes.js';
import canvasRoutes from './routes/canvasRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import habitRoutes from './routes/habitRoutes.js';
import userRoutes from './routes/userRoutes.js';


// ---------- The api routes go below ----------
app.use('/api/assignments', assignmentRoutes);
app.use('/api/canvas', canvasRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/tasks', taskRoutes);  // so example in taskRoutes.js default things get routed by /api/tasks
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);  // signup thing again
app.use('/api/ai', aiRoutes);

// Health check endpoint to make sure stuff is running
app.get('/api/health', (req, res) => {
  res.json({
    message: 'Glide API+ running',
<<<<<<< HEAD
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      endpoints: {
      assignments: '/api/assignments',
      courses: '/api/courses',
=======
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      assignments: 'api/assignments',
      canvas: 'api/canvas',
      courses: 'api/courses',
>>>>>>> c3c128b4d611698a9b27a07387b4f367704be05b
      events: '/api/events',
      habits: '/api/habits',
      tasks: '/api/tasks',
      users: '/api/users',
      auth: '/api/auth',
      ai: '/api/ai',
      health: '/api/health',
    }
  });
});



if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));

  // Handle React routing - serve index.html for all non-API routes
  app.use((req, res, next) => {
    // Skip if it's an API route
    if (req.path.startsWith('/api')) {
      return next();
    }
    // Serve index.html for all other routes
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
} else {
  // Development mode - just show API info at root
  app.get('/', (req, res) => {
    res.json({
      message: 'Glide API+ running in DEVELOPMENT mode',
      note: 'Frontend dev server should run separately on http://localhost:5173',
      endpoints: {
<<<<<<< HEAD
        assignments: '/api/assignments',
        courses: '/api/courses',
=======
        assignments: 'api/assignments',
        canvas: 'api/canvas',
        courses: 'api/courses',
>>>>>>> c3c128b4d611698a9b27a07387b4f367704be05b
        events: '/api/events',
        habits: '/api/habits',
        tasks: '/api/tasks',
        users: '/api/users',
        auth: '/api/auth',
        health: '/api/health',
        ai: '/api/ai',
      }
      
    });
  });
}


// --- Error Handlers ---
// 404 handler (only for API routes in development)
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// General error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong!'
  });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 Server running on: http://localhost:${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`🎨 Serving frontend from /dist`);
  } else {
    console.log(`🎨 Frontend dev server should run separately on http://localhost:5173`);
  }
});
