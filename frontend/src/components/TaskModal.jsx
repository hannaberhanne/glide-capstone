import { useEffect, useState } from "react";
import "./TaskModal.css";

const toLocalInput = (value) => {
  if (!value) return "";
  const d = typeof value === "object" && value.seconds
    ? new Date(value.seconds * 1000)
    : new Date(value);
  if (isNaN(d.getTime())) return "";
  const tzOffset = d.getTimezoneOffset() * 60000;
  const localISO = new Date(d.getTime() - tzOffset).toISOString();
  return localISO.slice(0, 16);
};

export default function TaskModal({ open, onClose, onSubmit, initialTask }) {
  const [form, setForm] = useState({
    title: "",
    category: "academic",
    dueAt: "",
    estimatedHours: "",
    priority: "medium",
    description: "",
  });

  useEffect(() => {
    if (initialTask) {
      setForm({
        title: initialTask.title || "",
        category: (initialTask.category || "academic").toLowerCase(),
        dueAt: toLocalInput(initialTask.dueAt),
        estimatedHours:
          initialTask.estimatedMinutes !== undefined
            ? (Number(initialTask.estimatedMinutes) / 60 || 0)
            : initialTask.estimatedTime || "",
        priority: initialTask.priority || "medium",
        description: initialTask.description || "",
      });
    } else {
      setForm({
        title: "",
        category: "academic",
        dueAt: "",
        estimatedHours: "",
        priority: "medium",
        description: "",
      });
    }
  }, [initialTask, open]);

  if (!open) return null;

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    const estimatedMinutes = form.estimatedHours
      ? Math.max(0, Number(form.estimatedHours) * 60)
      : 0;
    onSubmit({
      ...form,
      title: form.title.trim(),
      dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
      estimatedMinutes,
    });
  };

  return (
    <div className="taskmodal-overlay" onClick={onClose}>
      <div className="taskmodal" onClick={(e) => e.stopPropagation()}>
        <div className="taskmodal-head">
          <h3>{initialTask ? "Edit task" : "Add task"}</h3>
          <button className="taskmodal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <label className="taskmodal-label">
          Title
          <input
            className="taskmodal-input"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="Add a task..."
          />
        </label>

        <div className="taskmodal-grid">
          <label className="taskmodal-label">
            Category
            <select
              className="taskmodal-input"
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
            >
              <option value="academic">Academic</option>
              <option value="work">Work</option>
              <option value="personal">Personal</option>
            </select>
          </label>

          <label className="taskmodal-label">
            Priority
            <select
              className="taskmodal-input"
              value={form.priority}
              onChange={(e) => update("priority", e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>

        <div className="taskmodal-grid">
          <label className="taskmodal-label">
            Due date/time
            <input
              className="taskmodal-input"
              type="datetime-local"
              value={form.dueAt}
              onChange={(e) => update("dueAt", e.target.value)}
            />
          </label>

          <label className="taskmodal-label">
            Estimated time (hours)
            <input
              className="taskmodal-input"
              type="number"
              min="0"
              step="0.25"
              value={form.estimatedHours}
              onChange={(e) => update("estimatedHours", e.target.value)}
              placeholder="e.g. 1.5"
            />
          </label>
        </div>

        <label className="taskmodal-label">
          Description / Notes
          <textarea
            className="taskmodal-textarea"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Add context, links, or substeps."
          />
        </label>

        <div className="taskmodal-actions">
          <button className="taskmodal-secondary" onClick={onClose}>Cancel</button>
          <button
            className="taskmodal-primary"
            onClick={handleSubmit}
            disabled={!form.title.trim()}
          >
            {initialTask ? "Save changes" : "Create task"}
          </button>
        </div>
      </div>
    </div>
  );
}
