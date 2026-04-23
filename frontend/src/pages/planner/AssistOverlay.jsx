export default function AssistOverlay({ active, loading, onExit, summary }) {
  if (!active) return null;

  return (
    <div className="planner-assist-overlay" aria-label="Assist preview">
      <div className="planner-assist-banner">
        <div>
          <p className="planner-assist-kicker">Assist Preview</p>
          <p className="planner-assist-summary">
            {loading ? "Thinking through possible placements…" : summary || "Tap a ghost to accept it. Dismiss what you do not want."}
          </p>
        </div>
        <button type="button" className="planner-assist-exit" onClick={onExit}>
          Close
        </button>
      </div>
    </div>
  );
}
