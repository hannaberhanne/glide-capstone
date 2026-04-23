const TASK_SOURCE = 'canvas';
const DEFAULT_TASK_CATEGORY = 'academic';
const DEFAULT_TASK_PRIORITY = 'medium';

function normalizeCanvasTitle(title) {
  const normalized = String(title || '').trim();
  return normalized || 'Untitled assignment';
}

function normalizeCanvasDueAt(dueDate) {
  if (!dueDate) {
    return null;
  }

  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function isCanvasLinkedTask(task) {
  return (
    task?.syncedFromCanvas === true ||
    task?.source === TASK_SOURCE ||
    Boolean(task?.canvasAssignmentId)
  );
}

function buildCanvasTaskSyncFields({
  uid,
  courseId,
  courseCode,
  assignmentId,
  assignmentData,
  updatedAt,
}) {
  const xpValue = Math.max(0, Math.floor(Number(assignmentData?.totalPoints) || 0));

  return {
    assignmentId,
    canvasAssignmentId: assignmentData?.canvasId || '',
    canvasUrl: assignmentData?.canvasUrl || '',
    category: DEFAULT_TASK_CATEGORY,
    courseCode: courseCode || '',
    courseId: courseId || '',
    description: assignmentData?.description || '',
    dueAt: normalizeCanvasDueAt(assignmentData?.dueDate),
    source: TASK_SOURCE,
    syncedFromCanvas: true,
    title: normalizeCanvasTitle(assignmentData?.title),
    updatedAt,
    userId: uid,
    xpValue,
  };
}

export {
  TASK_SOURCE,
  DEFAULT_TASK_CATEGORY,
  DEFAULT_TASK_PRIORITY,
  normalizeCanvasTitle,
  normalizeCanvasDueAt,
  isCanvasLinkedTask,
  buildCanvasTaskSyncFields,
};
