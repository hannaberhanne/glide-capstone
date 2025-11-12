const { db } = require('../config/firebase');

// get requests to retrieve all tasks
const getTasks = async (req, res) => {
    try {
        const uid = req.user.uid;

        // this here it looks at the uix making that request and checks db makes sure they match (userId field in db for this task)
        const snapshot = await db.collection('tasks')
            .where('userid', '==', uid)
            .get();

        // cleanup tasks and put them in a map
        const tasks = snapshot.docs.map(doc => ({
            id: doc.id,
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
            courseId: courseId || null,
            createdAt: new Date(),
            description: description || '',
            dueAt: dueAt || null,
            estimatedTime: estimatedTime || 0,
            isComplete: false,
            priority: priority || "medium",
            title: title.trim(),
            xpValue: xpValue || 0,
            updatedAt: new Date(),
            userid: uid,
        });

        // if successful send back the new tasks created so it updates in real time
        res.status(201).json({
            canvasAssignmentId: canvasAssignmentId || null,
            courseId: courseId || null,
            createdAt: new Date(),
            description: description || '',
            dueAt: dueAt || null,
            estimatedTime: estimatedTime || 0,
            id: docRef.id,
            isComplete: false,
            priority: priority || "low",
            title: title.trim(),
            updatedAt: new Date(),
            userid: uid,
            xpValue: xpValue || 0
        });


    } catch (err) {
        console.error('Create task error:', err);
        res.status(500).json({
            error: 'Failed to create task',
            message: err.message  // ✅ Include error details for debugging
        });
    }
};

module.exports = { createTask };