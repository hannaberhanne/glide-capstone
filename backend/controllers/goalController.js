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
        const { deadline, description, goalStreak, isActive, longestStreak, priority, timesPerWeek, title } = req.body;
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
        const { eventId } = req.params;
        const uid = req.user.uid;
        const { allDay, description, endTime, isRecurring, location, recurrenceRate, startTime, title } = req.body;

        // Get the event document
        const docRef = db.collection('events').doc(eventId);
        const doc = await docRef.get();

        // Check if event exists
        if (!doc.exists) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Check if user owns this event
        if (doc.data().userId !== uid) {
            return res.status(403).json({
                error: 'Not authorized to update this event'
            });
        }

        // Build update object with only provided fields
        const updateData = {};

        if (allDay !== undefined) {
            updateData.allDay = allDay;
        }

        if (description !== undefined) {
            updateData.description = description;
        }

        if (endTime !== undefined) {  // go back to this maybe we'll have to do some more updating if the end date passes
            updateData.endTime = endTime;
        }

        if (isRecurring !== undefined) {
            updateData.isRecurring = isRecurring || false;
        }

        if (location !== undefined) {
            updateData.location = location;
        }

        if (recurrenceRate !== undefined) {
            updateData.recurrenceRate = recurrenceRate;
        }

        if (startTime !== undefined) {
            updateData.startTime = startTime;
        }

        if (title !== undefined) {
            if (title.trim() === '') {
                return res.status(400).json({
                    error: 'Title cannot be empty'
                });
            }
            updateData.title = title.trim();
        }

        updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

        // Update the events in Firestore
        await docRef.update(updateData);

        // Get the updated events to return
        const updatedDoc = await docRef.get();

        res.json({
            eventId: updatedDoc.id,
            ...updatedDoc.data(),
            message: 'Event updated successfully'
        });

    } catch (err) {
        console.error('Update event error:', err);
        res.status(500).json({
            error: 'Failed to update event',
            message: err.message
        });
    }
};


// remove a event from db
const deleteEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const uid = req.user.uid;

        const docRef = db.collection('events').doc(eventId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Check if user owns this event
        if (doc.data().userId !== uid) {
            return res.status(403).json({ error: 'Not authorized to delete this event' });
        }

        // Delete the event
        await docRef.delete();

        res.json({
            eventId: eventId,
            deleted: true,
            message: 'Event deleted successfully'
        });
    } catch (err) {
        console.error('Delete event error:', err);
        res.status(500).json({ error: 'Failed to delete event' });
    }
};

export {
    createEvent,
    getEvents,
    updateEvent,
    deleteEvent
};