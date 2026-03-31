import { useState } from "react";
import "./AddGoal.css";

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

export default function AddGoal({ onClose, onGoalCreated }) {
  const [title, setTitle] = useState("");
  const [color, setColor] = useState(COLOR_SWATCHES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Goal title is required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await window.__getAuthToken?.();   // swap in your auth token helper

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/goals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ title: title.trim(), color }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create goal");
      }

      const newGoal = await res.json();
      onGoalCreated(newGoal);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
              <span>{title || "Goal Preview"}</span>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && <p className="add-goal-error">{error}</p>}

        {/* Actions */}
        <div className="add-goal-actions">
          <button className="add-goal-btn-cancel" onClick={onClose} disabled={loading}>
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

      </div>
    </div>
  );
}
