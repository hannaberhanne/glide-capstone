export default function AssistGhostCard({ suggestion, onAccept, onReject }) {
  return (
    <div className="planner-ghost-card">
      <button type="button" className="planner-ghost-main" onClick={() => onAccept(suggestion)}>
        <span className="planner-ghost-title">{suggestion.title || "Suggested task"}</span>
        <span className="planner-ghost-meta">Tap to place</span>
      </button>
      <button type="button" className="planner-ghost-dismiss" onClick={() => onReject(suggestion)} aria-label="Dismiss suggestion">
        ×
      </button>
    </div>
  );
}
