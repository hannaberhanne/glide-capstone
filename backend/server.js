//import { db } from './config/firebase.js';  // delete admin when done
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

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;  // can prob delete 8080 when everyone's .env is made

// Route imports are right below
import taskRoutes from './routes/taskRoutes.js';
import authRoutes from './routes/authRoutes.js';


// ---------- The api routes go below ----------
app.use('/api/tasks', taskRoutes);  // so in taskRoutes.js default things get routed by /api/tasks
app.use('/api/auth', authRoutes);  // signup thing again


// GET: Return events
app.get('/api/events', async (req, res) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;

    const snapshot = await db.collection('events')
      .where('userid', '==', uid)
      .get();

    const events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(events);
  } catch (err) {
    console.error('Auth error:', err.message);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// POST: Create new event
app.post('/api/events', async (req, res) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const { date, time, text } = req.body;

    const docRef = await db.collection('events').add({
      date,
      time,
      text,
      userid: decoded.uid,
      createdAt: new Date()
    });

    res.json({ id: docRef.id, date, time, text, userid: decoded.uid });
  } catch (err) {
    console.error('Create error:', err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// DELETE: Remove an event
app.delete('/api/events/:id', async (req, res) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const { id } = req.params;

    const docRef = db.collection('events').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (doc.data().userid !== decoded.uid) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await docRef.delete();
    res.json({ id, deleted: true });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});




// Health check endpoint to make sure stuff is running
app.get('/api/health', (req, res) => {
  res.json({
    message: 'Glide API+ running',
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      tasks: '/api/tasks',
      events: '/api/events',
      auth: '/api/auth',
    }
  });
});

// --- Serve Frontend (only in production mode) ---
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));

  // Handle React routing - send all non-API requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
} else {
  // Development mode - just show API info at root
  app.get('/', (req, res) => {
    res.json({
      message: 'Glide API+ running in DEVELOPMENT mode',
      note: 'Frontend dev server should run separately on http://localhost:5173',
      endpoints: {
        tasks: '/api/tasks',
        events: '/api/events',
        auth: '/api/auth',
        health: '/api/health',
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