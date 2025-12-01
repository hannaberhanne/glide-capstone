import CanvasService from '../services/canvasService.js';
import { db, admin } from '../config/firebase.js';

// sync canvas to get both courses and assignments fom canvas to db
const syncCanvas = async (req, res) => {

    try {
        const uid = req.user.uid;
        const { canvasToken } = req.body;

        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.data();

        // can delete the .env version when live but check the request body's canvas token, if not given one check db, then .env file
        const token = canvasToken || userData?.canvasToken || process.env.CANVAS_TOKEN;

        // token is null
        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Canvas token is required. Please provide a Canvas token or set CANVAS_TOKEN in .env'
            });
        }

        // replace the token in the db with a new token
        if (canvasToken && canvasToken !== userData?.canvasToken) {
            await db.collection('users').doc(uid).update({
                canvasToken: canvasToken,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        // init the canvasService object with the user's token
        const canvasService = new CanvasService(token);

        const coursesWithAssignments = await canvasService.getCoursesWithAssignments();

        let coursesAdded = 0;
        let coursesUpdated = 0;
        let assignmentsAdded = 0;
        let assignmentsUpdated = 0;

        for (const courseData of coursesWithAssignments) {
            // Check if course already exists (by canvasId)
            const existingCourseQuery = await db.collection('courses')
                .where('userId', '==', uid)
                .where('canvasId', '==', courseData.canvasId)
                .get();

            let courseRef;

            if (!existingCourseQuery.empty) {
                // Update existing course
                courseRef = existingCourseQuery.docs[0].ref;
                await courseRef.update({
                    canvasUrl: courseData.canvasUrl,
                    courseCode: courseData.courseCode,
                    lastCanvasSync: admin.firestore.FieldValue.serverTimestamp(),
                    syllabus: courseData.syllabus,
                    title: courseData.title,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                coursesUpdated++;
            }
            else {
                // Create new course
                courseRef = await db.collection('courses').add({
                    canvasId: courseData.canvasId || '',
                    canvasUrl: courseData.canvasUrl || '',
                    courseCode: courseData.courseCode || '',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    grade: courseData.grade || '',
                    instructor: courseData.instructor || '',
                    isActive: courseData.isActive || true,
                    lastCanvasSync: admin.firestore.FieldValue.serverTimestamp(),
                    meetingTimes: courseData.meetingTimes || '',
                    semester: courseData.semester || '',
                    syllabus: courseData.syllabus || '',
                    targetGrade: courseData.targetGrade || '',
                    title: courseData.title || '',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    userId: uid
                });
                coursesAdded++;
            }

            for (const assignmentData of courseData.assignments) {
                // Check if assignment already exists (by canvasId)
                const existingAssignmentQuery = await db.collection('assignments')
                    .where('userId', '==', uid)
                    .where('canvasId', '==', assignmentData.canvasId)
                    .get();

                // update assignment
                if (!existingAssignmentQuery.empty) {
                    const assignmentRef = existingAssignmentQuery.docs[0].ref;
                    await assignmentRef.update({
                        canvasUrl: assignmentData.canvasUrl,
                        completed: false,
                        description: assignmentData.description,
                        dueDate: assignmentData.dueDate,
                        title: assignmentData.title,
                        totalPoints: assignmentData.totalPoints,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        xpValue: Math.floor(assignmentData.totalPoints) || 0,  // change this to find xp points per assignment
                    });
                    assignmentsUpdated++;
                }
                else {
                    // Create new assignment
                    await db.collection('assignments').add({
                        canvasUrl: assignmentData.canvasUrl || '',
                        canvasId: assignmentData.canvasId || '',
                        completed: assignmentData.completed || false,
                        courseCode: courseData.courseCode || '',
                        courseId: courseRef.id || '',
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        description: assignmentData.description || '',
                        dueDate: assignmentData.dueDate || '',
                        title: assignmentData.title || '',
                        totalPoints: assignmentData.totalPoints || '',
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        userId: uid,
                        xpValue: Math.floor(assignmentData.totalPoints) || 0
                    });
                    assignmentsAdded++;
                }
            }
        }


    } catch (e) {
    console.error(e);}
}
