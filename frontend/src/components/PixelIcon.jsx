import "./PixelIcon.css";

const PATTERNS = {
  default: [
    "#9CAF88","#9CAF88","#9CAF88","#9CAF88","#9CAF88",
    "#9CAF88","#C8D9B8","#C8D9B8","#C8D9B8","#9CAF88",
    "#9CAF88","#C8D9B8","#3E3731","#C8D9B8","#9CAF88",
    "#9CAF88","#C8D9B8","#C8D9B8","#C8D9B8","#9CAF88",
    "#9CAF88","#9CAF88","#9CAF88","#9CAF88","#9CAF88",
  ],
  academic: [
    "#0ea5e9","#0ea5e9","#0ea5e9","#0ea5e9","#0ea5e9",
    "#0ea5e9","#9CAF88","#0ea5e9","#9CAF88","#0ea5e9",
    "#0ea5e9","#0ea5e9","#3E3731","#0ea5e9","#0ea5e9",
    "#0ea5e9","#9CAF88","#0ea5e9","#9CAF88","#0ea5e9",
    "#0ea5e9","#0ea5e9","#0ea5e9","#0ea5e9","#0ea5e9",
  ],
  health: [
    "#22c55e","#22c55e","#22c55e","#22c55e","#22c55e",
    "#22c55e","#F5F1E8","#22c55e","#F5F1E8","#22c55e",
    "#22c55e","#F5F1E8","#3E3731","#F5F1E8","#22c55e",
    "#22c55e","#F5F1E8","#22c55e","#F5F1E8","#22c55e",
    "#22c55e","#22c55e","#22c55e","#22c55e","#22c55e",
  ],
  personal: [
    "#9CAF88","#9CAF88","#9CAF88","#9CAF88","#9CAF88",
    "#9CAF88","#C8D9B8","#9CAF88","#C8D9B8","#9CAF88",
    "#9CAF88","#C8D9B8","#3E3731","#C8D9B8","#9CAF88",
    "#9CAF88","#C8D9B8","#9CAF88","#C8D9B8","#9CAF88",
    "#9CAF88","#9CAF88","#9CAF88","#9CAF88","#9CAF88",
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
