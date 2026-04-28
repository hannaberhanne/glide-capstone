import { useState, useEffect } from "react";
import "./AddGoal.css";
import { auth } from "../config/firebase.js";
import AlertBanner from "../components/AlertBanner";

const COLOR_SWATCHES = [
  "#7B68AA", "#A58F1C", "#D65745", "#4E8098",
  "#6B8E9F", "#9CAF88", "#C47B5A", "#8B6B5A",
  "#4A7C59", "#8B4060", "#5C7A9A", "#A0522D",
];

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export default function EditGoal({ goal, onClose, onGoalUpdated }) {
  const [color, setColor] = useState(goal.color || COLOR_SWATCHES[0]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/tasks`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const goalTasks = data
            .filter(t => t.goalId === goal.goalId)
            .map(t => ({
              taskId: t.taskId,
              title: t.title,
              xpValue: t.xpValue,
              isNew: false,
              deleted: false,
            }));
        setTasks(goalTasks);
      } catch (err) {
        setBanner({ message: "Failed to load tasks", type: "error" });
      }
    };
    fetchTasks();
  }, [goal.goalId]);

  const handleSave = async () => {
    setLoading(true);
    setBanner(null);
    try {
      const token = await auth.currentUser.getIdToken();

      if (color !== goal.color) {
        const res = await fetch(`${API_BASE_URL}/api/goals/${goal.goalId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ color }),
        });
        if (!res.ok) throw new Error((await res.json()).error || "Failed to update goal");
      }

      await Promise.all(tasks.map(async task => {
        if (task.deleted && !task.isNew) {
          await fetch(`${API_BASE_URL}/api/tasks/${task.taskId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
        } else if (!task.deleted && task.isNew && task.title.trim()) {
          await fetch(`${API_BASE_URL}/api/tasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              title: task.title.trim(),
              goalId: goal.goalId,
              color,
              xpValue: task.xpValue,
            }),
          });
        } else if (!task.deleted && !task.isNew && task.title.trim()) {
          await fetch(`${API_BASE_URL}/api/tasks/${task.taskId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ title: task.title.trim(), xpValue: task.xpValue }),
          });
        }
      }));

      const updatedTasksMap = {};
      tasks.filter(t => !t.deleted && t.title.trim()).forEach(t => {
        updatedTasksMap[t.title.trim()] = t.xpValue;
      });
      onGoalUpdated({ ...goal, color, tasks: updatedTasksMap });
    } catch (err) {
      setBanner({ message: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const visibleTasks = tasks.filter(t => !t.deleted);

  return (
      <div className="ag-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="ag-popup" style={{ maxWidth: 520 }}>

          <div className="ag-header">
            <h2 className="ag-title">Edit Goal</h2>
            <button className="ag-close" onClick={onClose} aria-label="Close">×</button>
          </div>

          <div className="ag-body" style={{ gridTemplateColumns: "1fr", gap: 20 }}>

            {/* Title read-only */}
            <div className="ag-field">
              <label className="ag-label">Goal Title</label>
              <input
                  className="ag-input"
                  type="text"
                  value={goal.title}
                  disabled
                  style={{ opacity: 0.55, cursor: "not-allowed" }}
              />
            </div>

            {/* Color */}
            <div className="ag-field">
              <label className="ag-label">Color</label>
              <div className="ag-swatches">
                {COLOR_SWATCHES.map(s => (
                    <button
                        key={s}
                        type="button"
                        className={`ag-swatch${color === s ? " selected" : ""}`}
                        style={{
                          background: s,
                          boxShadow: color === s ? `0 0 0 2px #fff, 0 0 0 3.5px ${s}` : "none",
                        }}
                        onClick={() => setColor(s)}
                        aria-label={s}
                    />
                ))}
              </div>
            </div>

            {/* Tasks */}
            <div className="ag-field">
              <label className="ag-label">Tasks</label>
              <div className="ag-tasks">
                {visibleTasks.length === 0 && (
                    <p style={{ fontSize: 13, color: "var(--glide-ink-muted)", margin: "4px 0" }}>
                      No tasks yet.
                    </p>
                )}
                {visibleTasks.map((task, i) => {
                  const realIndex = tasks.indexOf(task);
                  return (
                      <div key={task.taskId || i} className="ag-task-row">
                        <span className="ag-task-bullet">—</span>
                        <input
                            className="ag-task-input"
                            type="text"
                            placeholder="Task title…"
                            value={task.title}
                            onChange={e =>
                                setTasks(prev => prev.map((t, idx) =>
                                    idx === realIndex ? { ...t, title: e.target.value } : t
                                ))
                            }
                        />
                        <select
                            className="ag-task-xp"
                            value={task.xpValue}
                            onChange={e =>
                                setTasks(prev => prev.map((t, idx) =>
                                    idx === realIndex ? { ...t, xpValue: Number(e.target.value) } : t
                                ))
                            }
                        >
                          <option value={5}>5 XP</option>
                          <option value={10}>10 XP</option>
                          <option value={15}>15 XP</option>
                          <option value={20}>20 XP</option>
                        </select>
                        <button
                            type="button"
                            className="ag-task-remove"
                            onClick={() =>
                                setTasks(prev =>
                                    prev.map((t, idx) =>
                                        idx === realIndex
                                            ? t.isNew ? null : { ...t, deleted: true }
                                            : t
                                    ).filter(Boolean)
                                )
                            }
                            aria-label="Remove"
                        >×</button>
                      </div>
                  );
                })}
                {visibleTasks.length < 8 && (
                    <button
                        type="button"
                        className="ag-add-task"
                        onClick={() =>
                            setTasks(prev => [
                              ...prev,
                              { taskId: null, title: "", xpValue: 10, isNew: true, deleted: false },
                            ])
                        }
                    >
                      + Add task
                    </button>
                )}
              </div>
            </div>

          </div>

          <div className="ag-footer">
            {banner && (
                <AlertBanner
                    message={banner.message}
                    type={banner.type}
                    onClose={() => setBanner(null)}
                />
            )}
            <div className="ag-actions">
              <button type="button" className="ag-btn-cancel" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button
                  type="button"
                  className="ag-btn-submit"
                  onClick={handleSave}
                  disabled={loading}
                  style={{ background: color }}
              >
                {loading ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>

        </div>
      </div>
  );
}