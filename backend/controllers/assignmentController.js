import { db, admin } from '../config/firebase.js';

// get requests to retrieve all assignments (for this user)
const getAssignments = async (req, res) => {
    try {
        const uid = req.user.uid;
        const { courseId } = req.query;  // allow to filter by courseId as well

        // this here it looks at the uid making that request and checks db makes sure they match (userId field in db for this assignment)
        let query = await db.collection('assignments')
            .where('userId', '==', uid)

        if (courseId) {
            query = query.where('courseId', '==', courseId);
        } // if there's a courseId in the get request also filter this

        const snapshot = await query.get();


        // cleanup assignments and put them in a map
        const assignments = snapshot.docs.map(doc => ({
            assignmentId: doc.id,
            ...doc.data()
        }));

        res.json(assignments);

    } catch (err) {
        console.error('Get assignments error:', err.message);
        res.status(500).json({ error: 'Failed to fetch assignments' });
    }
};


// post request to create a new assignment
const createAssignment = async (req, res) => {
    try {
        const { canvasUrl, completed, courseCode, courseId, description, dueDate, title, totalPoints, xpValue } = req.body;
        const uid = req.user.uid;

        if (!title || title.trim() === '') {  // at least needs a title for an assignment
            return res.status(400).json({
                error: 'Title is required and cannot be empty'
            });
        }

        const courseRef = db.collection('courses').doc(courseId);
        const courseDoc = await courseRef.get();
        if (!courseDoc.exists) {  // check if the course exists
            return res.status(404).json({ error: 'Course not found' });
        }

        const docRef = await db.collection('assignments').add({
            canvasUrl: canvasUrl || '',
            completed: completed || false,
            courseCode: courseCode,
            courseId: courseDoc.id,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            description: description || '',
            dueDate: dueDate || '',
            title: title.trim(),
            totalPoints: totalPoints || 0,
            userId: uid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            xpValue: xpValue || 0,
        });

        // if successful send back the new assignment created so it updates in real time
        res.status(201).json({
            assignmentId: docRef.id,
            canvasUrl: canvasUrl || '',
            completed: completed || false,
            courseCode: courseCode,
            courseId: courseDoc.id,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            description: description || '',
            dueDate: dueDate || '',
            title: title.trim(),
            totalPoints: totalPoints || 0,
            userId: uid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            xpValue: xpValue || 0,
        });


    } catch (err) {
        console.error('Create assignment error:', err);
        res.status(500).json({
            error: 'Failed to create assignment',
            message: err.message
        });
    }
};


// patch to update an existing assignment
const updateAssignment = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const uid = req.user.uid;
        const { canvasUrl, completed, courseCode, description, dueDate, title, totalPoints, xpValue } = req.body;

        // Get the assignment document
        const docRef = db.collection('assignments').doc(assignmentId);
        const doc = await docRef.get();

        // Check if assignment exists
        if (!doc.exists) {
            return res.status(404).json({ error: 'Assignment not found' });
        }

        // Check if user owns this assignment
        if (doc.data().userId !== uid) {
            return res.status(403).json({
                error: 'Not authorized to update this assignment'
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

        if (canvasUrl !== undefined) {
            updateData.canvasUrl = canvasUrl || '';
        }

        if (completed !== undefined) {
            updateData.completed = completed;
        }

        if (courseCode !== undefined) {
            updateData.courseCode = courseCode;
        }

        if (description !== undefined) {
            updateData.description = description.trim();
        }

        if (dueDate !== undefined) {
            updateData.dueDate = dueDate;
        }

        if (totalPoints !== undefined) {
            updateData.totalPoints = totalPoints || 0;
        }

        if (xpValue !== undefined) {
            updateData.xpValue = xpValue || 0;
        }

        updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

        // Update the assignment in Firestore
        await docRef.update(updateData);

        // Get the updated assignment to return
        const updatedDoc = await docRef.get();

        res.json({
            assignmentId: updatedDoc.id,
            ...updatedDoc.data(),
            message: 'Course updated successfully'
        });

    } catch (err) {
        console.error('Update assignment error:', err);
        res.status(500).json({
            error: 'Failed to update assignment',
            message: err.message
        });
    }
};


// remove an assignment from db
const deleteAssignment = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const uid = req.user.uid;

        const docRef = db.collection('assignment').doc(assignmentId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Assignment not found' });
        }

        // Check if user owns this assignment
        if (doc.data().userId !== uid) {
            return res.status(403).json({ error: 'Not authorized to delete this assignment' });
        }

        // Delete the assignment
        await docRef.delete();

        res.json({
            assignmentId: assignmentId,
            deleted: true,
            message: 'Assignment deleted successfully'
        });
    } catch (err) {
        console.error('Delete assignment error:', err);
        res.status(500).json({ error: 'Failed to delete assignment' });
    }
};

export {
    createAssignment,
    getAssignments,
    updateAssignment,
    deleteAssignment
};