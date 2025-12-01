import { extractAssignmentsFromText, replanTasks } from '../services/aiService.js';
import { db } from '../config/firebase.js';

export async function extractAssignments(req, res) {
  try {
    const { text } = req.body;
    const result = await extractAssignmentsFromText(text);
    res.json(result.assignments || []);
  } catch (err) {
    console.error('AI extract error:', err);
    res.status(500).json({ error: 'Failed to extract assignments' });
  }
}

export async function replan(req, res) {
  try {
    const uid = req.user.uid;
    const snap = await db.collection('tasks').where('userId', '==', uid).get();
    const tasks = snap.docs.map(d => ({ taskId: d.id, ...d.data() }));
    const planned = replanTasks(tasks, req.body || {});
    res.json(planned);
  } catch (err) {
    console.error('AI replan error:', err);
    res.status(500).json({ error: 'Failed to replan tasks' });
  }
}
