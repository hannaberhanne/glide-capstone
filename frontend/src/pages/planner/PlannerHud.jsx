export default function PlannerHud({ monthLabel, onPrev, onNext, showToday, onToday }) {
  return (
    <div className="planner-hud" aria-label="Planner controls">
      <div className="planner-hud-month">
        <button type="button" className="planner-hud-arrow" onClick={onPrev} aria-label="Previous month">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path d="M10.8 4.5 6.3 9l4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="planner-hud-title">{monthLabel}</h1>
        <button type="button" className="planner-hud-arrow" onClick={onNext} aria-label="Next month">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path d="M7.2 4.5 11.7 9l-4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {showToday ? (
          <button type="button" className="planner-hud-action planner-hud-action-secondary" onClick={onToday}>
            Today
          </button>
        ) : null}
      </div>
    </div>
  );
}
