import { admin, db } from '../config/firebase.js';

// get requests to retrieve all goals
const getGoals = async (req, res) => {
    try {
        const uid = req.user.uid;

        // this here it looks at the uid making that request and checks db makes sure they match (userId field in db for this goal)
        const snapshot = await db.collection('goals')
            .where('userId', '==', uid)
            .get();

        // cleanup goals and put them in a map
        const goals = snapshot.docs.map(doc => ({
            goalId: doc.id,
            ...doc.data()
        }));

        res.json(goals);

    } catch (err) {
        console.error('Get goals error:', err.message);
        res.status(500).json({ error: 'Failed to fetch goals' });
    }
};


// post request to create a new goals
const createGoal = async (req, res) => {
    try {
        const { color, tasks, title } = req.body;
        const uid = req.user.uid;

        if (!title || title.trim() === '') {  // at least needs a title for a goal
            return res.status(400).json({
                error: 'Title is required and cannot be empty'
            });
        }

        const docRef = await db.collection('goals').add({
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            color: color || '#A58F1C',
            longestStreak: 0,
            streak: 0,
            tasks: tasks || {},
            title: title.trim(),
            userId: uid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // if successful send back the new goal created so it updates in real time
        res.status(201).json({
            createdAt: new Date().toISOString(),
            color: color,
            goalId: docRef.id,
            longestStreak: 0,
            streak: 0,
            tasks: tasks || {},
            title: title.trim(),
            userId: uid,
            updatedAt: new Date().toISOString()
        });


    } catch (err) {
        console.error('Create goal error:', err);
        res.status(500).json({
            error: 'Failed to create goal',
            message: err.message
        });
    }
};



// patch to update an existing goal
const updateGoal = async (req, res) => {
    try {
        const { goalId } = req.params;
        const uid = req.user.uid;
        const { color, longestStreak, streak, tasks, title } = req.body;

        // Get the goal document
        const docRef = db.collection('goals').doc(goalId);
        const doc = await docRef.get();

        // Check if goal exists
        if (!doc.exists) {
            return res.status(404).json({ error: 'Goal not found' });
        }

        // Check if user owns this goal
        if (doc.data().userId !== uid) {
            return res.status(403).json({
                error: 'Not authorized to update this goal'
            });
        }

        // Build update object with only provided fields
        const updateData = {};

        if (color !== undefined) {
            updateData.color = color;
        }

        if (longestStreak !== undefined) {  // if the longestStreak is not undefined then add 1 to longest streak
            updateData.longestStreak = admin.firestore.FieldValue.increment(1);
        }

        if (streak !== undefined) {  // add 1 to the streak if updated
            updateData.streak = admin.firestore.FieldValue.increment(1);
        }

        if (tasks !== undefined) {
            const currentTasks = doc.data().tasks || {};

            // Handle removals first
            if (tasks.remove && tasks.remove.length > 0) {
                tasks.remove.forEach(title => {
                    delete currentTasks[title];
                });
            }

            // Then handle additions
            if (tasks.add && Object.keys(tasks.add).length > 0) {
                Object.assign(currentTasks, tasks.add);
            }

            updateData.tasks = currentTasks;
        }

        if (title !== undefined) {
            updateData.title = title;
        }

        updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

        // Update the goal in Firestore
        await docRef.update(updateData);

        // Get the updated events to return
        const updatedDoc = await docRef.get();

        const data = updatedDoc.data();
        res.json({
            goalId: updatedDoc.id,
            ...data,
            createdAt: data.createdAt?.toDate().toISOString() || null,
            updatedAt: data.updatedAt?.toDate().toISOString() || null,
            message: 'Goal updated successfully'
        });

    } catch (err) {
        console.error('Update goal error:', err);
        res.status(500).json({
            error: 'Failed to update goal',
            message: err.message
        });
    }
};


// remove a goal from db
const deleteGoal = async (req, res) => {
    try {
        const { goalId } = req.params;
        const uid = req.user.uid;

        const docRef = db.collection('goals').doc(goalId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Goal not found' });
        }

        // Check if user owns this goal
        if (doc.data().userId !== uid) {
            return res.status(403).json({ error: 'Not authorized to delete this goal' });
        }

        // Delete the event
        await docRef.delete();

        res.json({
            goalId: goalId,
            deleted: true,
            message: 'Goal deleted successfully'
        });
    } catch (err) {
        console.error('Delete goal error:', err);
        res.status(500).json({ error: 'Failed to delete goal' });
    }
};

export {
    createGoal,
    getGoals,
    updateGoal,
    deleteGoal
};