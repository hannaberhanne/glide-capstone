//import { db } from './config/firebase.js';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

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

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

// Route imports
import aiRoutes from './routes/aiRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import authRoutes from './routes/authRoutes.js';
import canvasRoutes from './routes/canvasRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import scheduleRoutes from './routes/scheduleRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import habitRoutes from './routes/habitRoutes.js';
import userRoutes from './routes/userRoutes.js';

// Routes
app.use('/api/assignments', assignmentRoutes);
app.use('/api/canvas', canvasRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    message: 'Glide API+ running',
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      assignments: '/api/assignments',
      canvas: '/api/canvas',
      courses: '/api/courses',
      events: '/api/events',
      schedule: '/api/schedule',
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
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      message: 'Glide API+ running in DEVELOPMENT mode',
      note: 'Frontend dev server should run separately on http://localhost:5173',
      endpoints: {
        assignments: '/api/assignments',
        canvas: '/api/canvas',
        courses: '/api/courses',
        events: '/api/events',
        schedule: '/api/schedule',
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

// Errors
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: `Cannot ${req.method} ${req.path}` });
});
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message || 'Something went wrong!' });
});

// Start
app.listen(PORT, () => {
  console.log(`Server running on: http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV === 'production') {
    console.log('Serving frontend from /dist');
  } else {
    console.log('Frontend dev server should run separately on http://localhost:5173');
  }
});
