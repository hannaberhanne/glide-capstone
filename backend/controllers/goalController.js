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
        const { deadline, description, goalStreak, isActive, longestStreak, priority, timesPerWeek, title, xpValue } = req.body;
        const uid = req.user.uid;

        if (!title || title.trim() === '') {  // at least needs a title for a goal
            return res.status(400).json({
                error: 'Title is required and cannot be empty'
            });
        }

        const docRef = await db.collection('goals').add({
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            deadline: deadline || '',
            description: description || '',
            goalStreak: goalStreak || '',
            isActive: isActive || true,
            longestStreak: longestStreak || '',
            priority: priority || 'medium',
            timesPerWeek: timesPerWeek || '',
            title: title.trim(),
            userId: uid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            xpValue: xpValue || 0
        });

        // if successful send back the new goal created so it updates in real time
        res.status(201).json({
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            deadline: deadline || '',
            description: description || '',
            goalId: docRef.id,
            goalStreak: goalStreak || '',
            isActive: isActive || true,
            longestStreak: longestStreak || '',
            priority: priority || 'medium',
            timesPerWeek: timesPerWeek || '',
            title: title.trim(),
            userId: uid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            xpValue: xpValue || 0
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
        const { deadline, description, goalStreak, isActive, longestStreak, priority, timesPerWeek, title, xpValue } = req.body;

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

        if (deadline !== undefined) {
            updateData.deadline = deadline;
        }

        if (description !== undefined) {
            updateData.description = description;
        }

        if (goalStreak !== undefined) {
            updateData.goalStreak = goalStreak;
        }

        if (isActive !== undefined) {
            updateData.isActive = isActive;
        }

        if (longestStreak !== undefined) {
            updateData.longestStreak = longestStreak;
        }

        if (priority !== undefined) {
            updateData.priority = priority;
        }

        if (timesPerWeek !== undefined) {
            updateData.timesPerWeek = timesPerWeek;
        }

        if (title !== undefined) {
            updateData.title = title;
        }

        if (xpValue !== undefined) {
            updateData.xpValue = xpValue;
        }

        updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

        // Update the goal in Firestore
        await docRef.update(updateData);

        // Get the updated events to return
        const updatedDoc = await docRef.get();

        res.json({
            goalId: updatedDoc.id,
            ...updatedDoc.data(),
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