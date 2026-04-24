import { admin, db } from '../config/firebase.js';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

function computeLevel(totalXP) {
  let level = 0;
  let accumulated = 0;
  while (totalXP >= accumulated + 100 * (level + 1)) {
    accumulated += 100 * (level + 1);
    level++;
  }
  return level;
}

function todayDateString() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

function isCompletedToday(task) {
  return task.lastCompleted === todayDateString();
}

function normalizeDueAt(dueAt) {
    if (dueAt === undefined) {
        return { provided: false };
    }
    if (!dueAt) {
        return { provided: true, value: null };
    }
    const parsed = new Date(dueAt);
    if (Number.isNaN(parsed.getTime())) {
        return { provided: true, error: 'Invalid due date/time' };
    }
    return { provided: true, value: parsed.toISOString() };
}

function normalizeEstimatedMinutes({ estimatedMinutes, estimatedTime }) {
    if (estimatedMinutes !== undefined && estimatedMinutes !== null && estimatedMinutes !== '') {
        return Math.max(0, Number(estimatedMinutes) || 0);
    }
    if (estimatedTime !== undefined && estimatedTime !== null && estimatedTime !== '') {
        const val = Number(estimatedTime) || 0;
        return val <= 12 ? val * 60 : val;
    }
    return 0;
}

function normalizeXpValue(value) {
    if (value === undefined || value === null || value === '') {
        return null;
    }
    const xp = Number(value);
    if (!Number.isFinite(xp)) {
        return null;
    }
    return Math.max(0, Math.round(xp));
}

async function getXpFromAI(task) {
  try {
    if (!openai) return 50;
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Assign an XP reward for this student productivity task.
Task: "${task.title}"
Category: ${task.category || 'general'}
Estimated minutes: ${task.estimatedMinutes || 0}

Return only one number from 10 to 150.`
      }],
      max_tokens: 5,
    });
    const xp = parseInt(resp.choices[0]?.message?.content?.trim(), 10);
    return Number.isNaN(xp) ? 50 : Math.min(Math.max(xp, 10), 150);
  } catch (err) {
    console.error('AI XP error, fallback to 50:', err.message);
    return 50;
  }
}

// get requests to retrieve all tasks for a user
const getTasks = async (req, res) => {
    try {
        const uid = req.user.uid;

        const snapshot = await db.collection('tasks')
            .where('userId', '==', uid)
            .get();

        const today = todayDateString();

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
        const {
            color,
            title,
            xpValue,
            goalId,
            category,
            priority,
            dueAt,
            description,
            estimatedMinutes,
            estimatedTime
        } = req.body;
        const uid = req.user.uid;

        if (!title || title.trim() === '') {
            return res.status(400).json({
                error: 'Title is required and cannot be empty'
            });
        }

        const normalizedEstimatedMinutes = normalizeEstimatedMinutes({ estimatedMinutes, estimatedTime });

        const taskData = {
            color: color || '#A58F1C',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            isComplete: false,
            lastCompleted: '',
            title: title.trim(),
            userId: uid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (goalId !== undefined && goalId !== null && goalId !== '') {
            taskData.goalId = goalId;
        }
        if (category !== undefined && category !== null && category !== '') {
            taskData.category = String(category).toLowerCase();
        }
        if (priority !== undefined && priority !== null && priority !== '') {
            taskData.priority = String(priority).toLowerCase();
        }
        if (description !== undefined && description !== null) {
            taskData.description = String(description);
        }
        if (dueAt !== undefined) {
            const normalizedDueAt = normalizeDueAt(dueAt);
            if (normalizedDueAt.error) {
                return res.status(400).json({ error: normalizedDueAt.error });
            }
            taskData.dueAt = normalizedDueAt.value;
        }
        if (normalizedEstimatedMinutes > 0) {
            taskData.estimatedMinutes = normalizedEstimatedMinutes;
        }

        const explicitXp = normalizeXpValue(xpValue);
        taskData.xpValue = explicitXp ?? await getXpFromAI(taskData);

        const docRef = await db.collection('tasks').add(taskData);
        const createdDoc = await docRef.get();
        const data = createdDoc.data();

        res.status(201).json({
            taskId: docRef.id,
            ...data,
            completedToday: false
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
        const {
            completedToday,
            isComplete,
            lastCompleted,
            title,
            xpValue,
            category,
            priority,
            dueAt,
            description,
            estimatedMinutes,
            estimatedTime
        } = req.body;

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
            const normalizedXp = normalizeXpValue(xpValue);
            updateData.xpValue = normalizedXp ?? 0;
        }

        if (lastCompleted !== undefined) {
            updateData.lastCompleted = lastCompleted;
        }

        if (completedToday !== undefined) {
            updateData.lastCompleted = completedToday ? todayDateString() : '';
        }

        if (isComplete !== undefined) {
            updateData.isComplete = Boolean(isComplete);
        }

        if (category !== undefined && category !== null) {
            updateData.category = category === '' ? null : String(category).toLowerCase();
        }
        if (priority !== undefined && priority !== null) {
            updateData.priority = priority === '' ? null : String(priority).toLowerCase();
        }
        if (description !== undefined) {
            updateData.description = description === null ? null : String(description);
        }
        if (dueAt !== undefined) {
            const normalizedDueAt = normalizeDueAt(dueAt);
            if (normalizedDueAt.error) {
                return res.status(400).json({ error: normalizedDueAt.error });
            }
            updateData.dueAt = normalizedDueAt.value;
        }
        if (
            estimatedMinutes !== undefined ||
            estimatedTime !== undefined
        ) {
            updateData.estimatedMinutes = normalizeEstimatedMinutes({ estimatedMinutes, estimatedTime });
        }

        updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

        await docRef.update(updateData);

        const updatedDoc = await docRef.get();
        const data = updatedDoc.data();

        res.json({
            taskId: updatedDoc.id,
            ...data,
            completedToday: isCompletedToday(data),
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


// Mark task complete and award XP once per day.
const completeTask = async (req, res) => {
    const { taskId } = req.params;
    const uid = req.user.uid;

    try {
        const taskRef = db.collection('tasks').doc(taskId);
        const taskPreview = await taskRef.get();

        if (!taskPreview.exists || taskPreview.data().userId !== uid) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const previewData = taskPreview.data();
        const previewXp = normalizeXpValue(previewData.xpValue);
        const generatedXp = previewXp === null ? await getXpFromAI(previewData) : null;

        const result = await db.runTransaction(async (t) => {
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

            if (task.lastCompleted === today) {
                return { already: true, xpGained: 0, newTotalXP: userData.totalXP || 0 };
            }

            const storedXp = normalizeXpValue(task.xpValue);
            const xpGained = storedXp ?? generatedXp ?? 50;
            const newTotalXP = (userData.totalXP || 0) + xpGained;
            const newLevel = computeLevel(newTotalXP);

            const taskUpdate = {
                lastCompleted: today,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            if (storedXp === null) {
                taskUpdate.xpValue = xpGained;
            }

            t.update(taskRef, taskUpdate);

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
