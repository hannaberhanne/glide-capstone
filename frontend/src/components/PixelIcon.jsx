import "./PixelIcon.css";

const PATTERNS = {
  default: [
    "#f97316", "#f97316", "#f97316", "#f97316", "#f97316",
    "#f97316", "#ffba08", "#ffba08", "#ffba08", "#f97316",
    "#f97316", "#ffba08", "#111827", "#ffba08", "#f97316",
    "#f97316", "#ffba08", "#ffba08", "#ffba08", "#f97316",
    "#f97316", "#f97316", "#f97316", "#f97316", "#f97316",
  ],
  academic: [
    "#0ea5e9", "#0ea5e9", "#0ea5e9", "#0ea5e9", "#0ea5e9",
    "#0ea5e9", "#f97316", "#0ea5e9", "#f97316", "#0ea5e9",
    "#0ea5e9", "#0ea5e9", "#111827", "#0ea5e9", "#0ea5e9",
    "#0ea5e9", "#f97316", "#0ea5e9", "#f97316", "#0ea5e9",
    "#0ea5e9", "#0ea5e9", "#0ea5e9", "#0ea5e9", "#0ea5e9",
  ],
  health: [
    "#22c55e", "#22c55e", "#22c55e", "#22c55e", "#22c55e",
    "#22c55e", "#ffffff", "#22c55e", "#ffffff", "#22c55e",
    "#22c55e", "#ffffff", "#111827", "#ffffff", "#22c55e",
    "#22c55e", "#ffffff", "#22c55e", "#ffffff", "#22c55e",
    "#22c55e", "#22c55e", "#22c55e", "#22c55e", "#22c55e",
  ],
  personal: [
    "#a855f7", "#a855f7", "#a855f7", "#a855f7", "#a855f7",
    "#a855f7", "#f97316", "#a855f7", "#f97316", "#a855f7",
    "#a855f7", "#f97316", "#111827", "#f97316", "#a855f7",
    "#a855f7", "#f97316", "#a855f7", "#f97316", "#a855f7",
    "#a855f7", "#a855f7", "#a855f7", "#a855f7", "#a855f7",
  ],
};

export default function PixelIcon({ pattern = "default" }) {
  const colors = PATTERNS[pattern] || PATTERNS.default;
  return (
    <div className="pixel-icon">
      {colors.map((color, idx) => (
        <span key={`${pattern}-${idx}`} style={{ backgroundColor: color }} />
      ))}
    </div>
  );
}
