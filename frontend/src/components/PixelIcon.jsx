import "./PixelIcon.css";

const PATTERNS = {
  default: [
    "#C630F4","#C630F4","#C630F4","#C630F4","#C630F4",
    "#C630F4","#E89DF9","#E89DF9","#E89DF9","#C630F4",
    "#C630F4","#E89DF9","#3E3731","#E89DF9","#C630F4",
    "#C630F4","#E89DF9","#E89DF9","#E89DF9","#C630F4",
    "#C630F4","#C630F4","#C630F4","#C630F4","#C630F4",
  ],
  academic: [
    "#0ea5e9","#0ea5e9","#0ea5e9","#0ea5e9","#0ea5e9",
    "#0ea5e9","#C630F4","#0ea5e9","#C630F4","#0ea5e9",
    "#0ea5e9","#0ea5e9","#3E3731","#0ea5e9","#0ea5e9",
    "#0ea5e9","#C630F4","#0ea5e9","#C630F4","#0ea5e9",
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
    "#a855f7","#a855f7","#a855f7","#a855f7","#a855f7",
    "#a855f7","#E9D5FF","#a855f7","#E9D5FF","#a855f7",
    "#a855f7","#E9D5FF","#3E3731","#E9D5FF","#a855f7",
    "#a855f7","#E9D5FF","#a855f7","#E9D5FF","#a855f7",
    "#a855f7","#a855f7","#a855f7","#a855f7","#a855f7",
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
