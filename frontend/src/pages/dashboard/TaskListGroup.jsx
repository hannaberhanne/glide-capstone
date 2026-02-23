export default function TaskListGroup({
  groups,
  onComplete,
  onEdit,
  onDelete,
  formatDue,
}) {
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
              <li
                key={t.taskId}
                className={`task-item ${
                  t.canvasAssignmentId ? "canvas" : "goal"
                } ${t.isComplete ? "completed" : ""}`}
              >
                {/* ===== LEFT: COMPLETE BUTTON ===== */}
                <button
                  className={`task-check ${t.isComplete ? "checked" : ""}`}
                  onClick={() => onComplete(t.taskId)}
                  aria-label={t.isComplete ? "Completed" : "Mark complete"}
                >
                  {t.isComplete ? "✓" : ""}
                </button>

                {/* ===== MAIN BODY ===== */}
                <div className="task-body">
                  <button className="task-title" onClick={() => onEdit(t)}>
                    {t.title}
                  </button>
                </div>

                <div className="task-side">
                  {/* Canvas: due time */}
                  {t.canvasAssignmentId && (
                    <span className="task-due">
                      Due at {formatDue(t)}
                    </span>
                  )}

                  {/* Goal: XP */}
                  {t.canvasAssignmentId === null && t.xpValue > 0 && (
                    <span className="task-xp">
                      +{t.xpValue} XP
                    </span>
                  )}

                  <button
                    className="delete-task-btn"
                    onClick={() => onDelete(t.taskId)}
                    aria-label="Delete task"
                  >
                    …
                  </button>
                </div>


                {/* ===== RIGHT SIDE ===== */}
                <div className="task-side">
                  {/* Goal tasks ONLY */}
                  {t.canvasAssignmentId === null && t.xpValue > 0 && (
                    <span className="task-xp">
                      +{t.xpValue} XP
                    </span>
                  )}

                  <button
                    className="delete-task-btn"
                    onClick={() => onDelete(t.taskId)}
                    aria-label="Delete task"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <path
                        d="M12 4L4 12M4 4L12 12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {group.items.length > 5 && (
            <div className="task-group-more">
              {group.items.length - 5} more tasks ·{" "}
              <a href="/planner">Open Planner</a>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
