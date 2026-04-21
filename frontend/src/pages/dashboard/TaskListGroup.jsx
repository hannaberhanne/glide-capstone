import { useState } from "react";

export default function TaskListGroup({ groups, onComplete, onEdit, onDelete, onDismiss, formatDue }) {
  const [completing, setCompleting] = useState(new Set());

  const handleComplete = async (taskId, isAlreadyComplete) => {
    if (completing.has(taskId) || isAlreadyComplete) return;

    setCompleting((prev) => new Set(prev).add(taskId));
    try {
      await onComplete(taskId);
    } catch (err) {
      setCompleting((prev) => {
        const s = new Set(prev);
        s.delete(taskId);
        return s;
      });
    }
    setTimeout(() => {
      setCompleting((prev) => {
        const s = new Set(prev);
        s.delete(taskId);
        return s;
      });
    }, 600);
  };

  return (
    <>
      {groups.map((group) => (
        <div className="task-group" key={group.key}>
          <div className="task-group-head">
            <span className="task-group-label">{group.label}</span>
            <span className="task-group-count">{group.items.length}</span>
          </div>
          <ul className="task-list">
            {group.items.slice(0, 5).map((t) => {
              const isDone = t.completedToday || completing.has(t.taskId);
              // Goal-linked tasks are recurring habits — they should never be permanently
              // deleted from the dashboard X button. One-off tasks (no goalId) can be deleted.
              const isGoalTask = !!t.goalId;

              return (
                <li
                  key={t.taskId}
                  className="task-item"
                  style={{
                    opacity: isDone ? 0.5 : 1,
                    transition: "opacity 0.4s ease",
                  }}
                >
                  <button
                    className={`task-check ${isDone ? "checked" : ""}`}
                    onClick={() => handleComplete(t.taskId, t.completedToday)}
                    aria-label={isDone ? "Completed" : "Mark complete"}
                    disabled={isDone}
                    style={{ cursor: isDone ? "default" : "pointer" }}
                  >
                    {isDone ? "✓" : ""}
                  </button>

                  <div className="task-body">
                    <button
                      className="task-text-btn"
                      onClick={() => !isDone && onEdit(t)}
                      style={{
                        textDecoration: isDone ? "line-through" : "none",
                        color: isDone ? "var(--text-muted, #888)" : undefined,
                        transition: "color 0.3s ease",
                        cursor: isDone ? "default" : "pointer",
                      }}
                    >
                      {t.title || t.text}
                    </button>
                    <div className="task-meta">{formatDue(t)}</div>
                  </div>

                  {isGoalTask ? (
                    // Goal task: X only appears once completed, and only dismisses from today's view
                    isDone ? (
                      <button
                        className="delete-task-btn"
                        onClick={() => onDismiss(t.taskId)}
                        aria-label="Dismiss from today's view"
                        title="Remove from today's view"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "4px",
                          marginLeft: "auto",
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M12 4L4 12M4 4L12 12"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    ) : (
                      // Placeholder so layout doesn't shift when X appears
                      <span style={{ width: "24px", marginLeft: "auto" }} />
                    )
                  ) : (
                    // One-off task: X always shown, permanently deletes
                    <button
                      className="delete-task-btn"
                      onClick={() => onDelete(t.taskId)}
                      aria-label="Delete task"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                        marginLeft: "auto",
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M12 4L4 12M4 4L12 12"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          {group.items.length > 5 && (
            <div className="task-group-more">
              {group.items.length - 5} more tasks · <a href="/planner">Open Planner</a>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
