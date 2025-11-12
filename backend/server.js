const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();

// check config.js
require('./config/firebase');


app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 8080;  // can prob delete 8080 when everyone's .env is made

// Route imports are right below
const taskRoutes = require('./routes/tasks');



// ---------- The routes go below ----------
app.use('/api/tasks', taskRoutes);  // so in taskRoutes.js default things get routed by /api/tasks




// GET: Return tasks where userid == Firebase UID
app.get('/api/tasks', async (req, res) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;

    const snapshot = await db.collection('tasks')
      .where('userid', '==', uid)
      .get();

    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(tasks);
  } catch (err) {
    console.error('Auth error:', err.message);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// POST: Create new task
app.post('/api/tasks', async (req, res) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const { title } = req.body;

    const docRef = await db.collection('tasks').add({
      title,
      userid: decoded.uid,
      isComplete: false,
      dueDate: new Date(),
      Category: "General"
    });

    res.json({ id: docRef.id, title, userid: decoded.uid });
  } catch (err) {
    console.error('Create error:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PATCH: Toggle task completion
app.patch('/api/tasks/:id', async (req, res) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const { id } = req.params;
    const { isComplete } = req.body;

    const docRef = db.collection('tasks').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (doc.data().userid !== decoded.uid) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await docRef.update({ isComplete });
    res.json({ id, isComplete });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE: Remove a task
app.delete('/api/tasks/:id', async (req, res) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const { id } = req.params;

    const docRef = db.collection('tasks').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (doc.data().userid !== decoded.uid) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await docRef.delete();
    res.json({ id, deleted: true });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

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



app.get('/', (req, res) => {
  res.json({
    message: 'check for Glide API+ ruinning',
    endpoints: {
      tasks: '/api/tasks',
      events: '/api/events',
    }
  });
});

// error message for 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// server issue error messages
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went wrong!'
  });
});

app.listen(PORT, () => {
    console.log(`Server is running on: http://localhost:${PORT}`);
    console.log(`The environment: ${process.env.PORT || 'dev'}`);
})