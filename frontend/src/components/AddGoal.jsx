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

  const handleSubmit = async () => {
    if (!title.trim()) {
      setBanner({ message: "Goal title is required.", type: "error" });
      return;
    }

    setLoading(true);
    setBanner(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/goals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${await auth.currentUser.getIdToken()}` // ← add this
        },
        credentials: "include",
        body: JSON.stringify({
          title: title.trim(),
          color,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setBanner({ message: data.error || data.message || "Failed to create goal", type: "error" });
      }

      onGoalCreated(data);
    } catch (err) {
      setBanner({ message: "Create goal error:", err, type: "error" });

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
            <div
              className="add-goal-preview-header"
              style={{ backgroundColor: color }}
            >
              <span>{title || "Goal Preview"}</span>
            </div>
          </div>
        </div>

        {/* Error */}
        {banner && (
            <AlertBanner
                message={banner.message}
                type={banner.type}
                onClose={() => setBanner(null)}
            />
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

      </div>
    </div>
  );
}