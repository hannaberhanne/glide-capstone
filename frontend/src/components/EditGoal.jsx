import { useState, useEffect } from "react";
import "./AddGoal.css"; // reuse the same styles
import { auth } from "../config/firebase.js";
import AlertBanner from "../components/AlertBanner";

const COLOR_SWATCHES = [
  "#6B8E9F",
  "#9CAF88",
  "#D65745",
  "#A58F1C",
  "#8B6B5A",
  "#7B68AA",
  "#4E8098",
  "#C47B5A",
];

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export default function EditGoal({ goal, onClose, onGoalUpdated }) {
  const [color, setColor] = useState(goal.color || COLOR_SWATCHES[0]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState(null);

  // Build initial tasks list from the goal's tasks map + taskId info
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/tasks`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        // Filter tasks that belong to this goal
        const goalTasks = data
          .filter((t) => t.goalId === goal.goalId)
          .map((t) => ({
            taskId: t.taskId,
            title: t.title,
            xpValue: t.xpValue,
            isNew: false,
            deleted: false,
          }));
        setTasks(goalTasks);
      } catch (err) {
        console.error("Failed to fetch tasks:", err);
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

      // 1. Update goal color if changed
      if (color !== goal.color) {
        const res = await fetch(`${API_BASE_URL}/api/goals/${goal.goalId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ color }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to update goal color");
        }
      }

      // 2. Handle tasks: create new, update existing, delete removed
      await Promise.all(
        tasks.map(async (task) => {
          if (task.deleted && !task.isNew) {
            // Delete existing task
            await fetch(`${API_BASE_URL}/api/tasks/${task.taskId}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
          } else if (!task.deleted && task.isNew) {
            // Create new task
            await fetch(`${API_BASE_URL}/api/tasks`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                title: task.title,
                goalId: goal.goalId,
                color: color,
                xpValue: task.xpValue,
              }),
            });
          } else if (!task.deleted && !task.isNew) {
            // Update existing task
            await fetch(`${API_BASE_URL}/api/tasks/${task.taskId}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                title: task.title,
                xpValue: task.xpValue,
              }),
            });
          }
        })
      );

      // Build updated tasks map for the parent to update state
      const updatedTasksMap = {};
      tasks
        .filter((t) => !t.deleted)
        .forEach((t) => {
          updatedTasksMap[t.title] = t.xpValue;
        });

      onGoalUpdated({ ...goal, color, tasks: updatedTasksMap });
    } catch (err) {
      console.error("Save error:", err);
      setBanner({ message: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const visibleTasks = tasks.filter((t) => !t.deleted);

  return (
    <div className="add-goal-backdrop" onClick={handleBackdropClick}>
      <div className="add-goal-popup">

        {/* Header */}
        <div className="add-goal-header">
          <h2 className="add-goal-title">Edit Goal</h2>
          <button className="add-goal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Goal title (read-only) */}
        <div className="add-goal-field">
          <label className="add-goal-label">Goal Title</label>
          <input
            className="add-goal-input"
            type="text"
            value={goal.title}
            disabled
            style={{ opacity: 0.6, cursor: "not-allowed" }}
          />
        </div>

        {/* Color picker */}
        <div className="add-goal-field">
          <label className="add-goal-label">Card Color</label>
          <div className="add-goal-swatches">
            {COLOR_SWATCHES.map((swatch) => (
              <button
                key={swatch}
                className={`add-goal-swatch ${color === swatch ? "selected" : ""}`}
                style={{ backgroundColor: swatch }}
                onClick={() => setColor(swatch)}
                aria-label={`Select color ${swatch}`}
              />
            ))}
          </div>

          {/* Preview */}
          <div className="add-goal-preview" style={{ borderColor: color }}>
            <div className="add-goal-preview-header" style={{ backgroundColor: color }}>
              <span>{goal.title}</span>
            </div>
          </div>
        </div>

        {/* Tasks */}
        <div className="add-goal-field">
          <label className="add-goal-label">Tasks</label>

          <div className="add-goal-tasks">
            {visibleTasks.length === 0 && (
              <p style={{ fontSize: "0.85rem", color: "#999", margin: "0.5rem 0" }}>
                No tasks yet. Add one below.
              </p>
            )}
            {visibleTasks.map((task, i) => {
              const realIndex = tasks.indexOf(task);
              return (
                <div key={task.taskId || i} className="add-goal-task-row">
                  <input
                    className="add-goal-task-input"
                    type="text"
                    value={task.title}
                    onChange={(e) =>
                      setTasks((prev) =>
                        prev.map((t, idx) =>
                          idx === realIndex ? { ...t, title: e.target.value } : t
                        )
                      )
                    }
                  />
                  <select
                    className="add-goal-task-xp"
                    value={task.xpValue}
                    onChange={(e) =>
                      setTasks((prev) =>
                        prev.map((t, idx) =>
                          idx === realIndex ? { ...t, xpValue: Number(e.target.value) } : t
                        )
                      )
                    }
                  >
                    <option value={5}>5 XP</option>
                    <option value={10}>10 XP</option>
                    <option value={15}>15 XP</option>
                    <option value={20}>20 XP</option>
                  </select>
                  <button
                    className="add-goal-task-remove"
                    type="button"
                    onClick={() =>
                      setTasks((prev) =>
                        prev.map((t, idx) =>
                          idx === realIndex
                            ? t.isNew
                              ? null // remove new tasks entirely
                              : { ...t, deleted: true }
                            : t
                        ).filter(Boolean)
                      )
                    }
                    aria-label="Remove task"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          {visibleTasks.length < 5 && (
            <button
              className="add-goal-btn-add-task"
              type="button"
              onClick={() =>
                setTasks((prev) => [
                  ...prev,
                  { taskId: null, title: "", xpValue: 5, isNew: true, deleted: false },
                ])
              }
            >
              + Add Task
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="add-goal-actions">
          <button className="add-goal-btn-cancel" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="add-goal-btn-submit"
            onClick={handleSave}
            disabled={loading}
            style={{ backgroundColor: color }}
          >
            {loading ? "Saving…" : "Save Changes"}
          </button>
        </div>

        {banner && (
          <AlertBanner
            message={banner.message}
            type={banner.type}
            onClose={() => setBanner(null)}
          />
        )}
      </div>
    </div>
  );
}
