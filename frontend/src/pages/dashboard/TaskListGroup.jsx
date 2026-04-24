import { useState } from "react";

const capitalize = (value) => {
  if (!value) return null;
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const startOfDay = (value) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export default function TaskListGroup({
  tasks,
  onComplete,
  onEdit,
  onDelete,
  onDismiss,
  formatDue,
  formatEstimate,
  parseDueDate,
  variant = "standard",
}) {
  const [completing, setCompleting] = useState(new Set());
  const [recentlyCompleted, setRecentlyCompleted] = useState(new Set());

  const isTaskDone = (task) =>
    task.completedToday === true || task.isComplete === true || recentlyCompleted.has(task.taskId);

  const handleComplete = async (taskId, event) => {
    if (completing.has(taskId)) return;
    setCompleting((prev) => new Set(prev).add(taskId));
    setRecentlyCompleted((prev) => new Set(prev).add(taskId));

    try {
      await onComplete(taskId, event?.currentTarget?.getBoundingClientRect?.() || null);
    } catch {
      setCompleting((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
      setRecentlyCompleted((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
      return;
    }

    setTimeout(() => {
      setCompleting((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
      setRecentlyCompleted((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }, 800);
  };

  return (
    <ul className={`today-task-list ${variant === "lead" ? "today-task-list-lead" : ""}`.trim()}>
      {tasks.map((task) => {
        const taskId = task.taskId;
        const done = isTaskDone(task);
        const busy = completing.has(taskId);
        const justCompleted = recentlyCompleted.has(taskId);
        const due = parseDueDate?.(task);
        const dueState = due ? Math.sign(startOfDay(due) - startOfDay(new Date())) : null;
        const metaParts = [capitalize(task.category), formatEstimate?.(task.estimatedMinutes) || null];
        const isCanvasTask =
          task.source === "canvas" || task.syncedFromCanvas === true || Boolean(task.canvasAssignmentId);
        const isGoalTask = Boolean(task.goalId);

        if (dueState !== null && dueState < 0) {
          metaParts.push("Overdue");
        }

        return (
          <li
            key={taskId}
            className={`today-task-row ${done ? "is-done" : ""} ${justCompleted ? "just-completed" : ""} ${variant === "lead" ? "is-lead" : ""}`.trim()}
          >
            <button
              type="button"
              className={`today-task-check ${done ? "checked" : ""} ${justCompleted ? "just-completed" : ""} ${busy ? "spinning" : ""}`.trim()}
              onClick={(event) => !done && handleComplete(taskId, event)}
              disabled={busy || done}
              aria-label={done ? "Completed" : `Mark ${task.title || task.text || "task"} complete`}
            >
              {busy ? (
                <span className="today-check-spinner" aria-hidden />
              ) : done ? (
                <span className="today-check-mark">✓</span>
              ) : null}
            </button>

            <div className="today-task-main">
              <div className={`today-task-title ${done ? "has-strike" : ""} ${justCompleted ? "strike-in" : ""}`.trim()}>
                {task.title || task.text}
                {isCanvasTask ? (
                  <span className="today-task-source" aria-label="Imported from Canvas" title="Imported from Canvas">
                    C
                  </span>
                ) : null}
              </div>
              {metaParts.filter(Boolean).length > 0 ? (
                <div className="today-task-meta">
                  {metaParts.filter(Boolean).map((part) => (
                    <span key={`${taskId}-${part}`} className="today-task-meta-item">
                      {part}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="today-task-side">
              <span className="today-task-time">{formatDue?.(task) || "Anytime"}</span>
              <button
                type="button"
                className="today-task-edit"
                onClick={() => onEdit(task)}
                aria-label={`Edit ${(task.title || task.text || "task").slice(0, 80)}`}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                  <path
                    d="M12.7 2.3a1.4 1.4 0 1 1 2 2L7.2 11.8 4 12.5l.7-3.2 8-7Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M11.8 3.2 14.8 6.2"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {isGoalTask ? (
                done && onDismiss ? (
                  <button
                    type="button"
                    className="today-task-remove"
                    onClick={() => onDismiss(taskId)}
                    aria-label={`Dismiss ${(task.title || task.text || "task").slice(0, 80)} from today`}
                    title="Remove from today's view"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path
                        d="M12 4 4 12M4 4l8 8"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                ) : (
                  <span className="today-task-remove today-task-remove-placeholder" aria-hidden />
                )
              ) : onDelete ? (
                <button
                  type="button"
                  className="today-task-remove"
                  onClick={() => onDelete(taskId)}
                  aria-label={`Delete ${(task.title || task.text || "task").slice(0, 80)}`}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path
                      d="M12 4 4 12M4 4l8 8"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
