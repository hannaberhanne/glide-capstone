const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
});

const db = admin.firestore();
const app = express();
app.use(cors());
app.use(express.json());

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

app.listen(5001, () => {
  console.log('Backend LIVE on 5001');
  console.log('Project ID:', process.env.FIREBASE_PROJECT_ID);
});