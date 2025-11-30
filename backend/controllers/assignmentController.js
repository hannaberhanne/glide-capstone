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
        const { canvasUrl, courseCode, grade, instructor, isActive, meetingTimes, semester, syllabus, targetGrade, title } = req.body;
        const uid = req.user.uid;

        if (!title || title.trim() === '') {  // at least needs a title for a course
            return res.status(400).json({
                error: 'Title is required and cannot be empty'
            });
        }

        const docRef = await db.collection('assignments').add({
            canvasUrl: canvasUrl || '',
            courseCode: courseCode,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            grade: grade || 0,
            instructor: instructor || '',
            isActive: isActive || true,
            lastCanvasSync: admin.firestore.FieldValue.serverTimestamp(),
            meetingTimes: meetingTimes || '',
            semester: semester || '',
            syllabus: syllabus || '',
            targetGrade: targetGrade || 100,
            title: title.trim(),
            userId: uid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // if successful send back the new course created so it updates in real time
        res.status(201).json({
            canvasUrl: canvasUrl || '',
            courseCode: courseCode,
            courseId: docRef.id,  // course ID for the db (not the course code)
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            grade: grade || 0,
            instructor: instructor || '',
            isActive: isActive || true,
            lastCanvasSync: admin.firestore.FieldValue.serverTimestamp(),
            meetingTimes: meetingTimes || '',
            semester: semester || '',
            syllabus: syllabus || '',
            targetGrade: targetGrade || 100,
            title: title.trim(),
            userId: uid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });


    } catch (err) {
        console.error('Create course error:', err);
        res.status(500).json({
            error: 'Failed to create course',
            message: err.message
        });
    }
};


// patch to update an existing course
const updateCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const uid = req.user.uid;
        const { canvasUrl, courseCode, grade, instructor, isActive, lastCanvasSync, meetingTimes, semester, syllabus, targetGrade, title } = req.body;

        // Get the course document
        const docRef = db.collection('courses').doc(courseId);
        const doc = await docRef.get();

        // Check if course exists
        if (!doc.exists) {
            return res.status(404).json({ error: 'Course not found' });
        }

        // Check if user owns this course
        if (doc.data().userId !== uid) {
            return res.status(403).json({
                error: 'Not authorized to update this course'
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

        if (courseCode !== undefined) {
            updateData.courseCode = courseCode;
        }

        if (grade !== undefined) {
            updateData.grade = grade;
        }

        if (instructor !== undefined) {
            updateData.instructor = instructor;
        }

        if (isActive !== undefined) {
            updateData.isActive = isActive;
        }

        if (lastCanvasSync !== undefined) {
            updateData.lastCanvasSync = lastCanvasSync;
        }

        if (meetingTimes !== undefined) {
            updateData.meetingTimes = meetingTimes;
        }

        if (semester !== undefined) {
            updateData.semester = semester;
        }

        if (syllabus !== undefined) {
            updateData.syllabus = syllabus;
        }

        if (targetGrade !== undefined) {
            updateData.targetGrade = targetGrade;
        }

        updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

        // Update the task in Firestore
        await docRef.update(updateData);

        // Get the updated task to return
        const updatedDoc = await docRef.get();

        res.json({
            courseId: updatedDoc.id,
            ...updatedDoc.data(),
            message: 'Course updated successfully'
        });

    } catch (err) {
        console.error('Update course error:', err);
        res.status(500).json({
            error: 'Failed to update course',
            message: err.message
        });
    }
};


// remove a course from db
const deleteCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const uid = req.user.uid;

        const docRef = db.collection('courses').doc(courseId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Course not found' });
        }

        // Check if user owns this  ourse
        if (doc.data().userId !== uid) {
            return res.status(403).json({ error: 'Not authorized to delete this course' });
        }

        // Delete the course
        await docRef.delete();

        res.json({
            courseId: courseId,
            deleted: true,
            message: 'Course deleted successfully'
        });
    } catch (err) {
        console.error('Delete course error:', err);
        res.status(500).json({ error: 'Failed to delete course' });
    }
};

export {
    createCourse,
    getCourses,
    updateCourse,
    deleteCourse
};