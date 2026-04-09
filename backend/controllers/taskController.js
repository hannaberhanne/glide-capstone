import { admin, db } from '../config/firebase.js';
import OpenAI from 'openai';


function computeLevel(totalXP) {
  let level = 0;
  let accumulated = 0;
  while (totalXP >= accumulated + 100 * (level + 1)) {
    accumulated += 100 * (level + 1);
    level++;
  }
  return level;
}

// get requests to retrieve all tasks for a user
const getTasks = async (req, res) => {
    try {
        const uid = req.user.uid;

        // this here it looks at the uix making that request and checks db makes sure they match (userId field in db for this task)
        const snapshot = await db.collection('tasks')
            .where('userId', '==', uid)
            .get();

        // cleanup tasks and put them in a map
        const tasks = snapshot.docs.map(doc => ({
            taskId: doc.id,
            ...doc.data()
        }));

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

        if (!title || title.trim() === '') {  // at least needs a title for a task
            return res.status(400).json({
                error: 'Title is required and cannot be empty'
            });
        }

        const docRef = await db.collection('tasks').add({
            color: color || '#A58F1C',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            goalId: goalId,
            lastCompleted: '',
            title: title.trim(),
            userId: uid,
            xpValue: xpValue || 5
        });

        // if successful send back the new tasks created so it updates in real time
        res.status(201).json({
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            goalId: goalId,
            lastCompleted: '',
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

        // Get the task document
        const docRef = db.collection('tasks').doc(taskId);
        const doc = await docRef.get();

        // Check if task exists
        if (!doc.exists) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Check if user owns this task
        if (doc.data().userId !== uid) {
            return res.status(403).json({
                error: 'Not authorized to update this task'
            });
        }

        // Build update object with only provided fields
        const updateData = {};

        if (title !== undefined) {
            if (title.trim() === '') {
                return res.status(400).json({
                    error: 'Title cannot be empty'
                });
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

        // Update the task in Firestore
        await docRef.update(updateData);

        // Get the updated task to return
        const updatedDoc = await docRef.get();

        res.json({
            taskId: updatedDoc.id,
            ...updatedDoc.data(),
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

// Mark task complete and award XP (idempotent)
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

            // idempotent check — don't award XP twice
            if (task.completedToday) {
                return { already: true, xpGained: 0, newTotalXP: userData.totalXP || 0 };
            }

            const xpGained = await getXpFromAI(task);
            const newTotalXP = (userData.totalXP || 0) + xpGained;
            const newLevel = computeLevel(newTotalXP);

            t.update(taskRef, {
                completedToday: true,
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

        // Check if user owns this task
        if (doc.data().userId !== uid) {
            return res.status(403).json({ error: 'Not authorized to delete this task' });
        }

        // Delete the task
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
