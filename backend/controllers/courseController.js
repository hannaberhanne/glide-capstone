import { db, admin } from '../config/firebase.js';

// get requests to retrieve all courses
const getCourses = async (req, res) => {
    try {
        const uid = req.user.uid;

        // this here it looks at the uid making that request and checks db makes sure they match (userId field in db for this course)
        const snapshot = await db.collection('courses')
            .where('userId', '==', uid)
            .get();

        // cleanup courses and put them in a map
        const courses = snapshot.docs.map(doc => ({
            courseId: doc.id,
            ...doc.data()
        }));

        res.json(courses);

    } catch (err) {
        console.error('Get courses error:', err.message);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
};


// post request to create a new course
const createCourse = async (req, res) => {
    try {
        const { courseCode, grade, instructor, isActive, meetingTimes, semester, syllabus, targetGrade, title } = req.body;
        const uid = req.user.uid;

        if (!title || title.trim() === '') {  // at least needs a title for a course
            return res.status(400).json({
                error: 'Title is required and cannot be empty'
            });
        }

        const docRef = await db.collection('courses').add({
            courseCode: courseCode,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            grade: grade || 0,
            instructor: instructor || '',
            isActive: isActive || true,
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
            courseCode: courseCode,
            courseId: docRef.id,  // course ID for the db (not the course code)
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            grade: grade || 0,
            instructor: instructor || '',
            isActive: isActive || true,
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
        const { courseCode, grade, instructor, isActive, meetingTimes, semester, syllabus, targetGrade, title } = req.body;

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