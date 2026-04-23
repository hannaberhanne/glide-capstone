import { admin, db } from '../config/firebase.js';
import {
  buildCanvasTaskSyncFields,
  DEFAULT_TASK_PRIORITY,
  isCanvasLinkedTask,
} from '../domain/canvasTaskProjection.js';

const BATCH_DELETE_LIMIT = 450;

async function findExistingCanvasTask({ uid, assignmentId, canvasAssignmentId }) {
  const assignmentMatch = await db.collection('tasks')
    .where('assignmentId', '==', assignmentId)
    .limit(1)
    .get();

  const existingByAssignment = assignmentMatch.docs.find((doc) => doc.data().userId === uid);
  if (existingByAssignment) {
    return existingByAssignment;
  }

  if (!canvasAssignmentId) {
    return null;
  }

  const canvasMatch = await db.collection('tasks')
    .where('canvasAssignmentId', '==', canvasAssignmentId)
    .get();

  return canvasMatch.docs.find((doc) => doc.data().userId === uid) || null;
}

export async function upsertCanvasTaskFromAssignment({
  uid,
  courseId,
  courseCode,
  assignmentId,
  assignmentData
}) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const syncedFields = buildCanvasTaskSyncFields({
    uid,
    courseId,
    courseCode,
    assignmentId,
    assignmentData,
    updatedAt: now
  });

  const existingTask = await findExistingCanvasTask({
    uid,
    assignmentId,
    canvasAssignmentId: syncedFields.canvasAssignmentId
  });

  if (existingTask) {
    await existingTask.ref.set({
      ...syncedFields,
      priority: existingTask.data().priority || DEFAULT_TASK_PRIORITY
    }, { merge: true });

    return { action: 'updated', taskId: existingTask.id };
  }

  const initialComplete = Boolean(assignmentData.completed);
  const newTaskRef = await db.collection('tasks').add({
    ...syncedFields,
    completedToday: initialComplete,
    createdAt: now,
    estimatedMinutes: 0,
    isComplete: initialComplete,
    priority: DEFAULT_TASK_PRIORITY
  });

  return { action: 'added', taskId: newTaskRef.id };
}

export async function getCanvasTaskCount(uid) {
  const tasksSnapshot = await db.collection('tasks')
    .where('userId', '==', uid)
    .get();

  return tasksSnapshot.docs.filter((doc) => isCanvasLinkedTask(doc.data())).length;
}

export async function deleteCanvasTasksForUser(uid) {
  const tasksSnapshot = await db.collection('tasks')
    .where('userId', '==', uid)
    .get();

  const canvasTaskRefs = tasksSnapshot.docs
    .filter((doc) => isCanvasLinkedTask(doc.data()))
    .map((doc) => doc.ref);

  if (canvasTaskRefs.length === 0) {
    return 0;
  }

  for (let index = 0; index < canvasTaskRefs.length; index += BATCH_DELETE_LIMIT) {
    const batch = db.batch();
    const chunk = canvasTaskRefs.slice(index, index + BATCH_DELETE_LIMIT);

    chunk.forEach((ref) => batch.delete(ref));
    await batch.commit();
  }

  return canvasTaskRefs.length;
}
