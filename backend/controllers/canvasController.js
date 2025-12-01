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

                const xpValue = Math.floor(assignmentData.totalPoints)  // calculation for the xp value of an assigment for gamification

                // update assignment
                if (!existingAssignmentQuery.empty) {
                    const assignmentRef = existingAssignmentQuery.docs[0].ref;
                    await assignmentRef.update({
                        canvasUrl: assignmentData.canvasUrl,
                        description: assignmentData.description,
                        dueDate: assignmentData.dueDate,
                        title: assignmentData.title,
                        totalPoints: assignmentData.totalPoints,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        xpValue: xpValue || 0  // change this to find xp points per assignment
                    });
                    assignmentsUpdated++;
                }
                else {
                    // Create new assignment

                    const newAssignmentRef = db.collection('assignments').doc();

                    await db.collection('assignments').add({
                        assignmentId: newAssignmentRef.id,
                        canvasId: assignmentData.canvasId || '',
                        canvasUrl: assignmentData.canvasUrl || '',
                        completed: assignmentData.completed || false,
                        courseCode: courseData.courseCode || '',
                        courseId: courseRef.id || '',
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        description: assignmentData.description || '',
                        dueDate: assignmentData.dueDate || '',
                        title: assignmentData.title || '',
                        totalPoints: assignmentData.totalPoints || 0,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        userId: uid,
                        xpValue: xpValue || 0
                    });
                    assignmentsAdded++;
                }
            }
        }

        res.json({
            success: true,
            message: 'Canvas data synced successfully',
            data: {
                coursesAdded,
                coursesUpdated,
                assignmentsAdded,
                assignmentsUpdated,
                totalCourses: coursesAdded + coursesUpdated,
                totalAssignments: assignmentsAdded + assignmentsUpdated,
                tokenSource: canvasToken ? 'provided' : (userData?.canvasToken ? 'stored' : 'env')
            }
        });

    } catch (error) {
        console.error('Canvas sync error:', error);

        if (error.message.includes('401') || error.message.includes('unauthorized')) {
            return res.status(401).json({
                success: false,
                error: 'Invalid Canvas token. Please check your token and try again.'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to sync Canvas data',
            message: error.message
        });
    }
};

const getCanvasSyncStatus = async (req, res) => {
    try {
        const uid = req.user.uid;

        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.data();

        const hasStoredToken = !!(userData?.canvasToken);
        const hasEnvToken = !!process.env.CANVAS_TOKEN;
        const hasToken = hasStoredToken || hasEnvToken;

        if (!hasToken) {
            return res.json({
                success: true,
                data: {
                    hasToken: false,
                    tokenSource: 'none',
                    lastSync: null,
                    coursesCount: 0,
                    assignmentsCount: 0
                }
            });
        }

        // Count synced courses and assignments
        const coursesSnapshot = await db.collection('courses')
            .where('userId', '==', uid)
            .get();

        const assignmentsSnapshot = await db.collection('assignments')
            .where('userId', '==', uid)
            .get();

        // Get last sync time from most recent course
        let lastSync = null;
        coursesSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.lastCanvasSync && (!lastSync || data.lastCanvasSync > lastSync)) {
                lastSync = data.lastCanvasSync;
            }
        });

        res.json({
            success: true,
            data: {
                hasToken: true,
                tokenSource: hasStoredToken ? 'user' : 'env',
                lastSync: lastSync,
                coursesCount: coursesSnapshot.size,
                assignmentsCount: assignmentsSnapshot.size
            }
        });

    } catch (error) {
        console.error('Get sync status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get sync status',
            message: error.message
        });
    }
};


const disconnectCanvas = async (req, res) => {
    try {
        const uid = req.user.uid;
        const { deleteData } = req.body;

        // Remove Canvas token
        await db.collection('users').doc(uid).update({
            canvasToken: '',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        if (deleteData) {
            // Delete only Canvas-synced courses (those with canvasId)
            const coursesSnapshot = await db.collection('courses')
                .where('userId', '==', uid)
                .get();

            const batch = db.batch();

            // Filter for courses with canvasId
            coursesSnapshot.forEach(doc => {
                if (doc.data().canvasId) {
                    batch.delete(doc.ref);
                }
            });

            // Delete only Canvas-synced assignments (those with canvasId)
            const assignmentsSnapshot = await db.collection('assignments')
                .where('userId', '==', uid)
                .get();

            assignmentsSnapshot.forEach(doc => {
                if (doc.data().canvasId) {
                    batch.delete(doc.ref);
                }
            });

            await batch.commit();
        }

        res.json({
            success: true,
            message: deleteData
                ? 'Canvas disconnected and synced data deleted'
                : 'Canvas disconnected. Your Canvas data remains in the database.'
        });

    } catch (error) {
        console.error('Disconnect Canvas error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to disconnect Canvas',
            message: error.message
        });
    }
};


export { syncCanvas, getCanvasSyncStatus, disconnectCanvas };