import { admin, db } from '../config/firebase.js';
import { buildTaskCompletionOutcome, normalizeXpValue } from '../domain/completion.js';
import { getXpFromAI } from '../domain/taskXp.js';
import { FieldValue } from 'firebase-admin/firestore';

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

// get all tasks for the current user.
const getTasks = async (req, res) => {
    try {
        const userId = req.user.uid;

        const snapshot = await db
            .collection('tasks')
            .where('userId', '==', userId)
            .get();

        const now = new Date();
        const cutoff = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago

        const batch = db.batch();
        const tasks = [];
        let staleCount = 0;

        snapshot.forEach((doc) => {
            const task = { taskId: doc.id, ...doc.data() };
            const dueAt = task.dueAt ? new Date(task.dueAt) : null;

            if (dueAt && dueAt < cutoff) {
                // Queue for deletion, don't include in response
                batch.delete(doc.ref);
                staleCount++;
            } else {
                tasks.push(task);
            }
        });

        if (staleCount > 0) {
            await batch.commit();
            console.log(`Cleaned up ${staleCount} stale task(s) for user ${userId}`);
        }

        return res.status(200).json({ tasks });
    } catch (error) {
        console.error('getTasks error:', error);
        return res.status(500).json({ error: 'Failed to fetch tasks' });
    }
};


// create a task.
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


// update task fields that are not the completion flow.
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


// complete a task and only pay xp once per day.
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
            const outcome = buildTaskCompletionOutcome({
                task,
                userData,
                todayKey: today,
                generatedXp,
            });

            if (outcome.already) {
                return outcome;
            }

            const taskUpdate = {
                isComplete: true,
                lastCompleted: today,
                completedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            if (normalizeXpValue(task.xpValue) === null) {
                taskUpdate.xpValue = outcome.taskXpValue;
            }

            t.update(taskRef, taskUpdate);

            t.update(userRef, {
                totalXP: outcome.newTotalXP,
                level: outcome.newLevel,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            return outcome;
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


// delete a task.
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
