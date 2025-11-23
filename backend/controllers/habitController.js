import { admin, db } from '../config/firebase.js';

// get requests to retrieve all habits
const getHabits = async (req, res) => {
    try {
        const uid = req.user.uid;

        // this here it looks at the uid making that request and checks db makes sure they match (userId field in db for this habit)
        const snapshot = await db.collection('habits')
            .where('userId', '==', uid)
            .get();

        // cleanup habits and put them in a map
        const habits = snapshot.docs.map(doc => ({
            habitId: doc.id,
            ...doc.data()
        }));

        res.json(habits);

    } catch (err) {
        console.error('Get habits error:', err.message);
        res.status(500).json({ error: 'Failed to fetch habits' });
    }
};


// post request to create a new habit
const createHabit = async (req, res) => {
    try {
        const { completionHistory, currentStreak, description, estimatedTime, frequency, icon, isComplete,
            longestStreak, targetDays, title, totalCompletions, xpValue } = req.body;

        const uid = req.user.uid;

        if (!title || title.trim() === '') {  // at least needs a title for a habit
            return res.status(400).json({
                error: 'Title is required and cannot be empty'
            });
        }

        const docRef = await db.collection('habits').add({
            completionHistory: completionHistory || [],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            currentStreak: currentStreak || 0,
            description: description || '',
            estimatedTime: estimatedTime || 0,
            frequency: frequency || 0,
            icon: icon || '',  // replace '' with a default icon
            isComplete: isComplete || false,
            longestStreak: longestStreak || 0,
            targetDays: targetDays || [],
            title: title.trim(),
            totalCompletions: totalCompletions || 0,
            userId: uid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            xpValue: xpValue || 0
        });

        // if successful send back the new habit created so it updates in real time
        res.status(201).json({
            completionHistory: completionHistory || [],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            currentStreak: currentStreak || 0,
            description: description || '',
            estimatedTime: estimatedTime || 0,
            frequency: frequency || 0,
            habitId: docRef.id,
            icon: icon || '',  // replace '' with a default icon
            isComplete: isComplete || false,
            longestStreak: longestStreak || 0,
            targetDays: targetDays || [],
            title: title.trim(),
            totalCompletions: totalCompletions || 0,
            userId: uid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            xpValue: xpValue || 0
        });

    } catch (err) {
        console.error('Create habit error:', err);
        res.status(500).json({
            error: 'Failed to create habit',
            message: err.message
        });
    }
};


// patch to update an existing habit
const updateHabit = async (req, res) => {
    try {
        const { habitId } = req.params;
        const uid = req.user.uid;
        const { description, estimatedTime, frequency, icon, isComplete, targetDays, title } = req.body;

        // Get the habit document
        const docRef = db.collection('habits').doc(habitId);
        const doc = await docRef.get();

        // Check if habit exists
        if (!doc.exists) {
            return res.status(404).json({ error: 'Habit not found' });
        }

        // Check if user owns this habit
        if (doc.data().userId !== uid) {
            return res.status(403).json({
                error: 'Not authorized to update this habit'
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

        if (estimatedTime !== undefined) {
            updateData.estimatedTime = estimatedTime;
        }

        if (frequency !== undefined) {
            updateData.frequency = frequency;
        }

        if (icon !== undefined) {
            updateData.icon = icon;
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

        if (targetDays !== undefined) {
            updateData.targetDays = targetDays;
        }

        updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

        // Update the task in Firestore
        await docRef.update(updateData);

        // Get the updated task to return
        const updatedDoc = await docRef.get();

        res.json({
            habitId: updatedDoc.id,
            ...updatedDoc.data(),
            message: 'habit updated successfully'
        });

    } catch (err) {
        console.error('Update habit error:', err);
        res.status(500).json({
            error: 'Failed to update habit',
            message: err.message
        });
    }
};


// remove a habit from db
const deleteHabit = async (req, res) => {
    try {
        const { habitId } = req.params;
        const uid = req.user.uid;

        const docRef = db.collection('habits').doc(habitId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Habit not found' });
        }

        // Check if user owns this task
        if (doc.data().userId !== uid) {
            return res.status(403).json({ error: 'Not authorized to delete this habit' });
        }

        // Delete the task
        await docRef.delete();

        res.json({
            habitId: habitId,
            deleted: true,
            message: 'Habit deleted successfully'
        });
    } catch (err) {
        console.error('Delete habit error:', err);
        res.status(500).json({ error: 'Failed to delete habit' });
    }
};

export {
    createHabit,
    getHabits,
    updateHabit,
    deleteHabit
};