
`const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
});

const db = admin.firestore();
const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/test', (req, res) => res.json({ message: 'Backend live' }));

app.get('/api/tasks', async (req, res) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const snap = await db.collection('tasks').where('uid', '==', decoded.uid).get();
    const tasks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(tasks);
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.listen(5000, () => console.log('Backend on port 5000'));`
