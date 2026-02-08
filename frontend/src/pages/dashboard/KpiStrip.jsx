export default function KpiStrip({ todayTasks, streak }) {
  return (
    <section className="dash-kpis">
      <div className="kpi">
        <div className="kpi-label">Today</div>
        <div className="kpi-value">{todayTasks}</div>
        <div className="kpi-note">tasks due</div>
      </div>

      <div className="kpi">
        <div className="kpi-label">Streak</div>
        <div className="kpi-value">
          {streak}
          <span className="kpi-emoji">🔥</span>
        </div>
        <div className="kpi-note">days in a row</div>
      </div>

      <div className="kpi kpi-dark">
        <div className="kpi-label kpi-label-light">Reset Week</div>
        <button
          className="break-btn"
          type="button"
          onClick={() => alert("Break mode coming soon!")}
        >
          I need a break
        </button>
        <div className="kpi-note kpi-note-light">pauses XP loss</div>
      </div>
    </section>
  );
}
 {/* WE CAN DELETE THIS FILE */}