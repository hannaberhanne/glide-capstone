import CanvasService from '../services/canvasService.js';
import { db, admin } from '../config/firebase.js';

// Sync courses and assignments from Canvas to Firestore
const syncCanvas = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { canvasToken } = req.body;

    // Get user doc for stored token
    const userSnap = await db.collection('users').doc(uid).get();
    let userData = userSnap.data();

    // Auto-create user doc if missing so sync/token updates don't 404
    if (!userSnap.exists) {
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      const newUserData = {
        userId: uid,
        canvasToken: canvasToken || '',
        createdAt: timestamp,
        updatedAt: timestamp
      };
      await db.collection('users').doc(uid).set(newUserData);
      userData = newUserData;
    }

    const token = canvasToken || userData?.canvasToken || process.env.CANVAS_TOKEN;
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Canvas token is required. Provide in body or store on user.'
      });
    }

    // Persist new token if provided
    if (canvasToken && canvasToken !== userData?.canvasToken) {
      await db.collection('users').doc(uid).set({
        canvasToken,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    const canvasService = new CanvasService(token);
    const coursesWithAssignments = await canvasService.getCoursesWithAssignments();

    let coursesAdded = 0;
    let coursesUpdated = 0;
    let assignmentsAdded = 0;
    let assignmentsUpdated = 0;
    let tasksAdded = 0;
    let tasksUpdated = 0;

    for (const courseData of coursesWithAssignments) {
      // upsert course by canvasId for this user
      const existingCourseQuery = await db.collection('courses')
        .where('userId', '==', uid)
        .where('canvasId', '==', courseData.canvasId)
        .get();

      let courseRef;
      if (!existingCourseQuery.empty) {
        courseRef = existingCourseQuery.docs[0].ref;
        await courseRef.update({
          canvasUrl: courseData.canvasUrl || '',
          courseCode: courseData.courseCode || '',
          lastCanvasSync: admin.firestore.FieldValue.serverTimestamp(),
          syllabus: courseData.syllabus || '',
          title: courseData.title || '',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        coursesUpdated++;
      } else {
        courseRef = await db.collection('courses').add({
          canvasId: courseData.canvasId || '',
          canvasUrl: courseData.canvasUrl || '',
          courseCode: courseData.courseCode || '',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          grade: courseData.grade || 0,
          instructor: courseData.instructor || '',
          isActive: courseData.isActive ?? true,
          lastCanvasSync: admin.firestore.FieldValue.serverTimestamp(),
          meetingTimes: courseData.meetingTimes || '',
          semester: courseData.semester || '',
          syllabus: courseData.syllabus || '',
          targetGrade: courseData.targetGrade || 100,
          title: courseData.title || '',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          userId: uid
        });
        coursesAdded++;
      }

      for (const assignmentData of courseData.assignments || []) {
        const existingAssignmentQuery = await db.collection('assignments')
          .where('userId', '==', uid)
          .where('canvasId', '==', assignmentData.canvasId)
          .get();

        const xpValue = Math.floor(assignmentData.totalPoints || 0);

        if (!existingAssignmentQuery.empty) {
          const assignmentRef = existingAssignmentQuery.docs[0].ref;
          await assignmentRef.update({
            canvasUrl: assignmentData.canvasUrl || '',
            description: assignmentData.description || '',
            dueDate: assignmentData.dueDate || '',
            title: assignmentData.title || '',
            totalPoints: assignmentData.totalPoints || 0,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            xpValue: xpValue || 0
          });
          assignmentsUpdated++;
        } else {
          await db.collection('assignments').add({
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

        // Upsert corresponding task so Canvas items appear in task views
        if (assignmentData.canvasId) {
        const existingTaskQuery = await db.collection('tasks')
          .where('userId', '==', uid)
          .where('canvasAssignmentId', '==', assignmentData.canvasId)
          .limit(1)
          .get();

          const taskData = {
            canvasAssignmentId: assignmentData.canvasId,
            courseId: courseRef.id || null,
            description: assignmentData.description || '',
            dueAt: assignmentData.dueDate || null,
            category: 'academic',
            priority: 'medium',
            title: assignmentData.title || '',
            xpValue: xpValue || 0,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };

          if (!existingTaskQuery.empty) {
            const taskRef = existingTaskQuery.docs[0].ref;
            await taskRef.update(taskData);
            tasksUpdated++;
          } else {
            await db.collection('tasks').add({
              ...taskData,
              category: 'academic',
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              isComplete: false,
              userId: uid
            });
            tasksAdded++;
          }
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
        tasksAdded,
        tasksUpdated,
        totalCourses: coursesAdded + coursesUpdated,
        totalAssignments: assignmentsAdded + assignmentsUpdated,
        tokenSource: canvasToken ? 'provided' : (userData?.canvasToken ? 'stored' : 'env')
      }
    });

  } catch (error) {
    console.error('Canvas sync error:', error);
    const status = error.response?.status || error.status;
    if (status === 401 || error.message?.includes('401')) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Canvas token. Please check your token and try again.'
      });
    }
    const errorMessage = error.response?.data?.message || error.message || 'Failed to sync Canvas data';
    res.status(500).json({
      success: false,
      error: errorMessage,
      message: errorMessage
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

    const coursesSnapshot = await db.collection('courses')
      .where('userId', '==', uid)
      .get();

    const assignmentsSnapshot = await db.collection('assignments')
      .where('userId', '==', uid)
      .get();

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

    await db.collection('users').doc(uid).update({
      canvasToken: '',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    if (deleteData) {
      const coursesSnapshot = await db.collection('courses')
        .where('userId', '==', uid)
        .get();
      const assignmentsSnapshot = await db.collection('assignments')
        .where('userId', '==', uid)
        .get();

      const batch = db.batch();
      coursesSnapshot.forEach(doc => {
        if (doc.data().canvasId) {
          batch.delete(doc.ref);
        }
      });
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
