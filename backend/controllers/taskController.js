import { admin, db } from '../config/firebase.js';


function computeLevel(totalXP) {
  let level = 0;
  let accumulated = 0;
  while (totalXP >= accumulated + 100 * (level + 1)) {
    accumulated += 100 * (level + 1);
    level++;
  }
  return level;
}

// Returns today's date as a YYYY-MM-DD string in local time
function todayDateString() {
  const now = new Date();
  return now.toISOString().slice(0, 10); // "2025-04-21"
}

// A task counts as completed today if lastCompleted matches today's date string
function isCompletedToday(task) {
  return task.lastCompleted === todayDateString();
}

// get requests to retrieve all tasks for a user
const getTasks = async (req, res) => {
    try {
        const uid = req.user.uid;

        const snapshot = await db.collection('tasks')
            .where('userId', '==', uid)
            .get();

        const today = todayDateString();

        // Attach a virtual `completedToday` field so the frontend can use it
        const tasks = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                taskId: doc.id,
                ...data,
                completedToday: data.lastCompleted === today,
            };
        });

        res.json(tasks);

    } catch (err) {
        console.error('Get tasks error:', err.message);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
};


// post request to create a new task
const createTask = async (req, res) => {
    try {
        const { color, title, xpValue, goalId } = req.body;
        const uid = req.user.uid;

        if (!title || title.trim() === '') {
            return res.status(400).json({
                error: 'Title is required and cannot be empty'
            });
        }

        const docRef = await db.collection('tasks').add({
            color: color || '#A58F1C',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            goalId: goalId || null,
            lastCompleted: '',   // empty string = never completed
            title: title.trim(),
            userId: uid,
            xpValue: xpValue || 5
        });

        res.status(201).json({
            createdAt: new Date().toISOString(),
            goalId: goalId || null,
            lastCompleted: '',
            completedToday: false,
            taskId: docRef.id,
            title: title.trim(),
            userId: uid,
            xpValue: xpValue || 5
        });

    } catch (err) {
        console.error('Create task error:', err);
        res.status(500).json({
            error: 'Failed to create task',
            message: err.message
        });
    }
};


// patch to update an existing task (non-completion fields)
const updateTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const uid = req.user.uid;
        const { lastCompleted, title, xpValue } = req.body;

        const docRef = db.collection('tasks').doc(taskId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Task not found' });
        }

        if (doc.data().userId !== uid) {
            return res.status(403).json({
                error: 'Not authorized to update this task'
            });
        }

        const updateData = {};

        if (title !== undefined) {
            if (title.trim() === '') {
                return res.status(400).json({ error: 'Title cannot be empty' });
            }
            updateData.title = title.trim();
        }

        if (xpValue !== undefined) {
            updateData.xpValue = xpValue;
        }

        if (lastCompleted !== undefined) {
            updateData.lastCompleted = lastCompleted;
        }

        updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

        await docRef.update(updateData);

        const updatedDoc = await docRef.get();
        const data = updatedDoc.data();

        res.json({
            taskId: updatedDoc.id,
            ...data,
            completedToday: data.lastCompleted === todayDateString(),
            message: 'Task updated successfully'
        });

    } catch (err) {
        console.error('Update task error:', err);
        res.status(500).json({
            error: 'Failed to update task',
            message: err.message
        });
    }
};


// Mark task complete and award XP (idempotent — safe to call twice, won't double-award)
const completeTask = async (req, res) => {
    const { taskId } = req.params;
    const uid = req.user.uid;

    try {
        const result = await db.runTransaction(async (t) => {
            const taskRef = db.collection('tasks').doc(taskId);
            const userRef = db.collection('users').doc(uid);

            const taskSnap = await t.get(taskRef);
            const userSnap = await t.get(userRef);

            if (!taskSnap.exists || taskSnap.data().userId !== uid) {
                throw new Error('NOT_FOUND');
            }
            if (!userSnap.exists) {
                throw new Error('USER_NOT_FOUND');
            }

            const task = taskSnap.data();
            const userData = userSnap.data();
            const today = todayDateString();

            // Idempotent: if already completed today, return current XP without changes
            if (task.lastCompleted === today) {
                return { already: true, xpGained: 0, newTotalXP: userData.totalXP || 0 };
            }

            const xpGained = task.xpValue || 5;
            const newTotalXP = (userData.totalXP || 0) + xpGained;
            const newLevel = computeLevel(newTotalXP);

            // Store today's date string — this IS the daily reset mechanism.
            // Tomorrow this won't match todayDateString() so the task resets automatically.
            t.update(taskRef, {
                lastCompleted: today,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            t.update(userRef, {
                totalXP: newTotalXP,
                level: newLevel,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            return { already: false, xpGained, newTotalXP, newLevel };
        });

        if (result.already) {
            return res.json({
                success: true,
                xpGained: 0,
                newTotalXP: result.newTotalXP,
                message: 'Task already completed today'
            });
        }

        return res.json({
            success: true,
            xpGained: result.xpGained,
            newTotalXP: result.newTotalXP,
            newLevel: result.newLevel,
            message: 'Task completed'
        });

    } catch (err) {
        if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Task not found' });
        if (err.message === 'USER_NOT_FOUND') return res.status(404).json({ error: 'User not found' });
        console.error('Complete task error:', err);
        return res.status(500).json({ error: 'Failed to complete task' });
    }
};


// remove a task from db
const deleteTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const uid = req.user.uid;

        const docRef = db.collection('tasks').doc(taskId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Task not found' });
        }

        if (doc.data().userId !== uid) {
            return res.status(403).json({ error: 'Not authorized to delete this task' });
        }

        await docRef.delete();

        res.json({
            taskId: taskId,
            deleted: true,
            message: 'Task deleted successfully'
        });
    } catch (err) {
        console.error('Delete task error:', err);
        res.status(500).json({ error: 'Failed to delete task' });
    }
};

export {
    createTask,
    getTasks,
    updateTask,
    deleteTask,
    completeTask
};
