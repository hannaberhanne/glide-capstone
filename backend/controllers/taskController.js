const { db } = require('../config/firebase');

// get requests to retrieve all tasks
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
        const { canvasAssignmentId, courseId, description, dueAt, estimatedTime, priority, title, xpValue } = req.body;
        const uid = req.user.uid;

        if (!title || title.trim() === '') {  // at least needs a title for a task
            return res.status(400).json({
                error: 'Title is required and cannot be empty'
            });
        }

        const docRef = await db.collection('tasks').add({
            canvasAssignmentId: canvasAssignmentId || null,
            completedAt: null,
            courseId: courseId || null,
            createdAt: new Date(),
            description: description || '',
            dueAt: dueAt || null,
            estimatedTime: estimatedTime || 0,
            isComplete: false,
            priority: priority || "medium",
            title: title.trim(),
            userId: uid,
            xpValue: xpValue || 0
        });

        // if successful send back the new tasks created so it updates in real time
        res.status(201).json({
            canvasAssignmentId: canvasAssignmentId || null,
            completedAt: null,
            courseId: courseId || null,
            createdAt: new Date(),
            description: description || '',
            dueAt: dueAt || null,
            estimatedTime: estimatedTime || 0,
            isComplete: false,
            priority: priority || "low",
            taskId: docRef.id,
            title: title.trim(),
            userId: uid,
            xpValue: xpValue || 0
        });


    } catch (err) {
        console.error('Create task error:', err);
        res.status(500).json({
            error: 'Failed to create task',
            message: err.message
        });
    }
};


// patch to update an existing task
const updateTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const uid = req.user.uid;
        const { title, description, priority, isComplete } = req.body;

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

        if (description !== undefined) {
            updateData.description = description;
        }

        if (priority !== undefined) {
            updateData.priority = priority;
        }

        if (isComplete !== undefined) {
            updateData.isComplete = isComplete;

            // Set completedAt timestamp when task is marked complete
            if (isComplete === true) {
                updateData.completedAt = new Date();
            } else {
                // Clear completedAt if task is marked incomplete
                updateData.completedAt = null;
            }
        }

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


module.exports = { createTask, getTasks, updateTask, deleteTask };