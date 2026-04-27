import { useState } from "react";
import "./AddGoal.css";
import { auth } from "../config/firebase.js";
import AlertBanner from "../components/AlertBanner";

const COLOR_SWATCHES = [
  "#7B68AA", // indigo
  "#A58F1C", // gold
  "#D65745", // terracotta
  "#4E8098", // teal
  "#6B8E9F", // slate blue
  "#9CAF88", // sage
  "#C47B5A", // warm orange
  "#8B6B5A", // warm brown
  "#4A7C59", // forest
  "#8B4060", // wine
  "#5C7A9A", // navy
  "#A0522D", // sienna
];

const CADENCE = [
  { label: "Daily",         value: "daily",  type: "routine" },
  { label: "3× a week",    value: "3x",     type: "routine" },
  { label: "Weekly",        value: "weekly", type: "routine" },
  { label: "One-time",      value: "once",   type: "project" },
];

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

function TaskRow({ task, index, onChange, onRemove }) {
  return (
    <div className="ag-task-row">
      <span className="ag-task-bullet">—</span>
      <input
        className="ag-task-input"
        type="text"
        placeholder="Action or milestone…"
        value={task.title}
        onChange={e => onChange(index, "title", e.target.value)}
      />
      <select
        className="ag-task-xp"
        value={task.xpValue}
        onChange={e => onChange(index, "xpValue", Number(e.target.value))}
      >
        <option value={5}>5 XP</option>
        <option value={10}>10 XP</option>
        <option value={15}>15 XP</option>
        <option value={20}>20 XP</option>
      </select>
      <button
        type="button"
        className="ag-task-remove"
        onClick={() => onRemove(index)}
        aria-label="Remove"
      >×</button>
    </div>
  );
}

export default function AddGoal({ onClose, onGoalCreated }) {
  const [title, setTitle]             = useState("");
  const [color, setColor]             = useState(COLOR_SWATCHES[0]);
  const [cadence, setCadence]         = useState("daily");
  const [tasks, setTasks]             = useState([]);
  const [loading, setLoading]         = useState(false);
  const [suggesting, setSuggesting]   = useState(false);
  const [banner, setBanner]           = useState(null);

  const goalType = CADENCE.find(c => c.value === cadence)?.type || "routine";

  const handleTaskChange = (i, field, value) => {
    setTasks(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t));
  };

  const handleTaskRemove = i => {
    setTasks(prev => prev.filter((_, idx) => idx !== i));
  };

  const addBlankTask = () => {
    setTasks(prev => [...prev, { title: "", xpValue: 10 }]);
  };

  const handleSuggest = async () => {
    if (!title.trim()) {
      setBanner({ message: "Enter a goal title first.", type: "error" });
      return;
    }
    try {
      setSuggesting(true);
      setBanner(null);
      const res = await fetch(`${API_BASE_URL}/api/goals/suggest-tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await auth.currentUser.getIdToken()}`,
        },
        body: JSON.stringify({ title: title.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get suggestions");
      setTasks((data.tasks || []).map(t => ({
        title: t.title,
        xpValue: t.xpValue ?? t.xp ?? 10,
      })));
    } catch (err) {
      setBanner({ message: err.message, type: "error" });
    } finally {
      setSuggesting(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setBanner({ message: "Goal title is required.", type: "error" });
      return;
    }
    setLoading(true);
    setBanner(null);
    try {
      const token = await auth.currentUser.getIdToken();
      const goalRes = await fetch(`${API_BASE_URL}/api/goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        credentials: "include",
        body: JSON.stringify({ title: title.trim(), color, type: goalType }),
      });
      const goalData = await goalRes.json();
      if (!goalRes.ok) {
        setBanner({ message: goalData.error || "Failed to create goal", type: "error" });
        return;
      }

      const validTasks = tasks.filter(t => t.title.trim());
      await Promise.all(validTasks.map(task =>
        fetch(`${API_BASE_URL}/api/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            title: task.title.trim(),
            goalId: goalData.goalId,
            color,
            xpValue: task.xpValue,
          }),
        })
      ));

      const tasksMap = {};
      validTasks.forEach(t => { tasksMap[t.title.trim()] = t.xpValue; });
      onGoalCreated({ ...goalData, tasks: tasksMap });
    } catch (err) {
      setBanner({ message: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ag-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ag-popup">

        <div className="ag-header">
          <h2 className="ag-title">New Goal</h2>
          <button className="ag-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="ag-body">

          {/* ── Left column ── */}
          <div className="ag-col-left">

            <div className="ag-field">
              <label className="ag-label" htmlFor="ag-goal-title">Name</label>
              <input
                id="ag-goal-title"
                className="ag-input"
                type="text"
                placeholder="What do you want to achieve?"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                autoFocus
              />
            </div>

            <div className="ag-field">
              <label className="ag-label">How often</label>
              <div className="ag-cadence">
                {CADENCE.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`ag-cadence-pill${cadence === opt.value ? " active" : ""}`}
                    style={cadence === opt.value
                      ? { background: color, borderColor: color, color: "#fff" }
                      : {}
                    }
                    onClick={() => setCadence(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="ag-field">
              <label className="ag-label">Color</label>
              <div className="ag-swatches">
                {COLOR_SWATCHES.map(s => (
                  <button
                    key={s}
                    type="button"
                    className={`ag-swatch${color === s ? " selected" : ""}`}
                    style={{ background: s, boxShadow: color === s ? `0 0 0 2px #fff, 0 0 0 3.5px ${s}` : "none" }}
                    onClick={() => setColor(s)}
                    aria-label={s}
                  />
                ))}
              </div>
            </div>

          </div>

          {/* ── Right column ── */}
          <div className="ag-col-right">

            {/* Preview card */}
            <div
              className="ag-preview-card"
              style={{ borderTopColor: color, backgroundColor: `${color}1c` }}
            >
              <p className="ag-preview-title">{title || "Your goal"}</p>
              <p className="ag-preview-cadence">{CADENCE.find(c => c.value === cadence)?.label}</p>
              <div className="ag-preview-dots">
                {Array.from({ length: 14 }).map((_, i) => (
                  <span key={i} className="ag-preview-dot" />
                ))}
              </div>
            </div>

            {/* Actions / tasks */}
            <div className="ag-field ag-field--tasks">
              <div className="ag-tasks-header">
                <label className="ag-label">
                  {goalType === "project" ? "Milestones" : "Daily actions"}
                </label>
                <button
                  type="button"
                  className="ag-btn-suggest"
                  onClick={handleSuggest}
                  disabled={suggesting || !title.trim()}
                >
                  {suggesting ? "Thinking…" : "✦ Suggest"}
                </button>
              </div>

              <div className="ag-tasks">
                {tasks.map((task, i) => (
                  <TaskRow
                    key={i}
                    task={task}
                    index={i}
                    onChange={handleTaskChange}
                    onRemove={handleTaskRemove}
                  />
                ))}
                <button type="button" className="ag-add-task" onClick={addBlankTask}>
                  + Add
                </button>
              </div>
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
              onClick={handleSubmit}
              disabled={loading || !title.trim()}
              style={{ background: color }}
            >
              {loading ? "Creating…" : "Create Goal"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
