import { useState } from "react";

export default function TaskListGroup({ groups, onComplete, onEdit, onDelete, formatDue }) {
  const [completing, setCompleting] = useState(new Set());
  const [recentlyCompleted, setRecentlyCompleted] = useState(new Set());

  const handleComplete = async (taskId) => {
    if (completing.has(taskId)) return;
    setCompleting((prev) => new Set(prev).add(taskId));
    setRecentlyCompleted((prev) => new Set(prev).add(taskId));
    try {
      await onComplete(taskId);
    } catch (err) {
      setCompleting((prev) => { const s = new Set(prev); s.delete(taskId); return s; });
      setRecentlyCompleted((prev) => { const s = new Set(prev); s.delete(taskId); return s; });
    }
    setTimeout(() => {
      setCompleting((prev) => { const s = new Set(prev); s.delete(taskId); return s; });
      setRecentlyCompleted((prev) => { const s = new Set(prev); s.delete(taskId); return s; });
    }, 800);
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
            {group.items.slice(0, 5).map((t) => (
              <li key={t.taskId} className="task-item">
                <button
                  className={`task-check ${t.isComplete ? "checked" : ""}`}
                  onClick={() => onComplete(t.taskId)}
                  aria-label={t.isComplete ? "Completed" : "Mark complete"}
                >
                  {t.isComplete ? "✓" : ""}
                </button>
                <div className="task-body">
                  <button className="task-text-btn" onClick={() => onEdit(t)}>
                    {t.title || t.text}
                  </button>
                  <div className="task-meta">{formatDue(t)}</div>
                </div>

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
              </li>
            ))}
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
