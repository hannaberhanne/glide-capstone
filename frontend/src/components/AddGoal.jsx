import { useState } from "react";
import "./AddGoal.css";
import { auth } from "../config/firebase.js";
import AlertBanner from "../components/AlertBanner";

// Preset color swatches matching Glide+ palette
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

export default function AddGoal({ onClose, onGoalCreated }) {
  const [title, setTitle] = useState("");
  const [color, setColor] = useState(COLOR_SWATCHES[0]);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState(null);
  const [suggestedTasks, setSuggestedTasks] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const handleSubmit = async () => {
    console.log("suggestedTasks at submit:", suggestedTasks);
    if (!title.trim()) {
      setBanner({ message: "Goal title is required.", type: "error" });
      return;
    }

    setLoading(true);
    setBanner(null);

    try {
      const token = await auth.currentUser.getIdToken();

      // Step 1: Create the goal
      const goalRes = await fetch(`${API_BASE_URL}/api/goals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ title: title.trim(), color }),
      });

      const goalData = await goalRes.json();

      if (!goalRes.ok) {
        setBanner({ message: goalData.error || goalData.message || "Failed to create goal", type: "error" });
      }

      await Promise.all(
          suggestedTasks.map(async (task) => {
            const taskRes = await fetch(`${API_BASE_URL}/api/tasks`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
              },
              body: JSON.stringify({
                title: task.title,
                goalId: goalData.goalId,
                color: color || '#A58F1C',
                xpValue: task.xp,
              }),
            });

            if (!taskRes.ok) {
              const err = await taskRes.json();
              console.error("Task creation failed:", err);
            }
          })
      );

      const tasksMap = {};
      suggestedTasks.forEach((task) => {
        tasksMap[task.title] = task.xp;
      });

      onGoalCreated({ ...goalData, tasks: tasksMap });
    } catch (err) {
      console.error("Submit error:", err);
      setBanner({ message: err.message, type: "error" });
    } finally {
      setLoading(false);
    }

  };

  const handleSuggestTasks = async () => {
    if (!title.trim()) {
      setBanner({ message: "Enter a goal title first.", type: "error" });
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/goals/suggest-tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${await auth.currentUser.getIdToken()}`,
        },
        body: JSON.stringify({ title: title.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to get suggestions");
      }

      setSuggestedTasks(data.tasks);
    } catch (err) {
      console.error("Suggest tasks error:", err);
      setBanner({ message: err.message, type: "error" });
    } finally {
      setLoadingSuggestions(false);
    }
  };


  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };


  return (
    <div className="add-goal-backdrop" onClick={handleBackdropClick}>
      <div className="add-goal-popup">

        {/* Header */}
        <div className="add-goal-header">
          <h2 className="add-goal-title">New Goal</h2>
          <button className="add-goal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>


        {/* Title input */}
        <div className="add-goal-field">
          <label className="add-goal-label" htmlFor="goal-title">Goal Title</label>
          <input
            id="goal-title"
            className="add-goal-input"
            type="text"
            placeholder="e.g. Study for Finals"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            autoFocus
          />
        </div>

        {/* Suggest Tasks */}
        <button
            className="add-goal-btn-suggest"
            onClick={handleSuggestTasks}
            disabled={loadingSuggestions || !title.trim()}
            type="button"
        >
          {loadingSuggestions ? "Thinking…" : "✦ Suggest Tasks"}
        </button>

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
            <div
              className="add-goal-preview-header"
              style={{ backgroundColor: color }}
            >
              <span>{title || "Goal Preview"}</span>
            </div>
          </div>
        </div>

        {/* AI Suggested Tasks */}
        {suggestedTasks.length > 0 && (
            <div className="add-goal-field">
              <label className="add-goal-label">Suggested Tasks</label>

              <div className="add-goal-tasks">
                {suggestedTasks.map((task, i) => (
                    <div key={i} className="add-goal-task-row">

                      {/* Editable title */}
                      <input
                          className="add-goal-task-input"
                          type="text"
                          value={task.title}
                          onChange={(e) =>
                              setSuggestedTasks((prev) =>
                                  prev.map((t, idx) =>
                                      idx === i ? { ...t, title: e.target.value } : t
                                  )
                              )
                          }
                      />

                      {/* Difficulty selector */}
                      <select
                          className="add-goal-task-xp"
                          value={task.xpValue}
                          onChange={(e) => {
                            const xpValue = Number(e.target.value);
                            const diffMap = { 5: "easy", 10: "medium", 15: "hard", 20: "expert" };
                            setSuggestedTasks((prev) =>
                                prev.map((t, idx) =>
                                    idx === i ? { ...t, xpValue, difficulty: diffMap[xpValue] } : t
                                )
                            );
                          }}
                      >
                        <option value={5}>5 XP</option>
                        <option value={10}>10 XP</option>
                        <option value={15}>15 XP</option>
                        <option value={20}>20 XP</option>
                      </select>

                      {/* Remove button */}
                      <button
                          className="add-goal-task-remove"
                          onClick={() =>
                              setSuggestedTasks((prev) => prev.filter((_, idx) => idx !== i))
                          }
                          type="button"
                          aria-label="Remove task"
                      >
                        ✕
                      </button>

                    </div>
                ))}
              </div>

              {/* Add blank task — only if under 3 */}
              {suggestedTasks.length < 3 && (
                  <button
                      className="add-goal-btn-add-task"
                      type="button"
                      onClick={() =>
                          setSuggestedTasks((prev) => [
                            ...prev,
                            { title: "", difficulty: "easy", xpValue: 5 },
                          ])
                      }
                  >
                    + Add Task
                  </button>
              )}
            </div>
        )}


        {/* Actions */}
        <div className="add-goal-actions">
          <button
            className="add-goal-btn-cancel"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            className="add-goal-btn-submit"
            onClick={handleSubmit}
            disabled={loading || !title.trim()}
            style={{ backgroundColor: color }}
          >
            {loading ? "Creating…" : "Create Goal"}
          </button>
        </div>

        {/* Error */}
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