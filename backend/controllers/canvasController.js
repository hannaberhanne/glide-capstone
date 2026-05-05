import CanvasService from '../services/canvasService.js';
import { db, admin } from '../config/firebase.js';
import { queueCanvasWorkloadChangeNotification } from '../services/notificationService.js';
import {
  deleteCanvasTasksForUser,
  getCanvasTaskCount,
  upsertCanvasTaskFromAssignment
} from '../services/canvasTaskSyncService.js';

function dateKey(date) {
  return date.toISOString().split('T')[0];
}

function isoOrNull(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

function buildCanvasStatusPayload({ userData, coursesCount, assignmentsCount, linkedTasksCount }) {
  const hasStoredToken = Boolean(userData?.canvasToken);
  const lastSyncSummary = userData?.lastCanvasSyncSummary || null;
  const plannedWindow = userData?.lastCanvasPlannedWindow || null;

  return {
    hasToken: hasStoredToken,
    tokenSource: hasStoredToken ? 'user' : 'none',
    lastSync: isoOrNull(userData?.lastCanvasSyncAt),
    coursesCount,
    assignmentsCount,
    linkedTasksCount,
    lastSyncSummary,
    lastPlanTriggered: Boolean(userData?.lastCanvasPlanTriggered),
    lastPlanWindowStart: plannedWindow?.start || null,
    lastPlanWindowEnd: plannedWindow?.end || null,
  };
}

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

    const token = canvasToken || userData?.canvasToken;
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Canvas token is required. Save your Canvas token first.'
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
    let tasksUnchanged = 0;
    let materialTaskChanges = 0;

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
        let assignmentRef;

        if (!existingAssignmentQuery.empty) {
          assignmentRef = existingAssignmentQuery.docs[0].ref;
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
          assignmentRef = await db.collection('assignments').add({
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

        const taskResult = await upsertCanvasTaskFromAssignment({
          uid,
          courseId: courseRef.id,
          courseCode: courseData.courseCode,
          assignmentId: assignmentRef.id,
          assignmentData
        });

        if (taskResult.action === 'added') {
          tasksAdded++;
        } else if (taskResult.action === 'updated') {
          tasksUpdated++;
        } else {
          tasksUnchanged++;
        }

        if (taskResult.materialChange) {
          materialTaskChanges++;
        }
      }
    }

    const planTriggered = false;
    const planningSkippedReason = materialTaskChanges > 0 ? 'manual-replan-required' : 'no-material-task-changes';
    const plannedStartDate = null;
    const plannedEndDate = null;
    const blocksCreated = 0;

    const syncSummary = {
      coursesAdded,
      coursesUpdated,
      assignmentsAdded,
      assignmentsUpdated,
      tasksAdded,
      tasksUpdated,
      tasksUnchanged,
      materialTaskChanges,
      planTriggered,
      plannedStartDate,
      plannedEndDate,
      blocksCreated,
      planningSkippedReason,
      tokenSource: canvasToken ? 'provided' : 'stored',
    };

    await db.collection('users').doc(uid).set({
      lastCanvasSyncAt: admin.firestore.FieldValue.serverTimestamp(),
      lastCanvasSyncSummary: syncSummary,
      lastCanvasPlanTriggered: planTriggered,
      lastCanvasPlannedWindow: planTriggered
        ? { start: plannedStartDate, end: plannedEndDate }
        : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    try {
      await queueCanvasWorkloadChangeNotification({
        userId: uid,
        syncSummary,
      });
    } catch (notificationError) {
      console.error('Canvas workload notification error:', notificationError);
    }

    res.json({
      success: true,
      message: materialTaskChanges > 0
        ? 'Canvas synced successfully. Your workload changed, so replan from Planner when you are ready.'
        : 'Canvas data synced successfully.',
      data: {
        ...syncSummary,
        totalCourses: coursesAdded + coursesUpdated,
        totalAssignments: assignmentsAdded + assignmentsUpdated,
        totalTasks: tasksAdded + tasksUpdated + tasksUnchanged,
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

    const coursesSnapshot = await db.collection('courses')
      .where('userId', '==', uid)
      .get();

    const assignmentsSnapshot = await db.collection('assignments')
      .where('userId', '==', uid)
      .get();
    const linkedTasksCount = await getCanvasTaskCount(uid);

    res.json({
      success: true,
      data: buildCanvasStatusPayload({
        userData,
        coursesCount: coursesSnapshot.size,
        assignmentsCount: assignmentsSnapshot.size,
        linkedTasksCount,
      }),
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
      lastCanvasSyncAt: null,
      lastCanvasSyncSummary: null,
      lastCanvasPlanTriggered: false,
      lastCanvasPlannedWindow: null,
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
      await deleteCanvasTasksForUser(uid);
    }

    res.json({
      success: true,
      disconnected: true,
      deletedData: Boolean(deleteData),
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
