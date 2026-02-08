export default function DashboardHero({
  todayStr,
  displayName,
  level,
  streak,
}) {
  return (
    <section className="dash-hero">
      <div className="dash-hero-date">
        <p className="dash-date">{todayStr}</p>
      </div>

      <div className="dash-hero-center">
        <h1 className="dash-title">Welcome back, {displayName}</h1>
        <div className="streak-widget">
          <div className="streak-count-box">
            <span className="streak-number">5</span>
          </div>

          <div className="streak-week">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day, i) => (
              <div key={day} className="streak-day">
                <span className="streak-day-label">{day}</span>
                <span className={`streak-dot active`} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dash-hero-level">
        <div className="level-row">
          <span className="level-label">Level</span>
          <span className="level-value">4</span> {/* level placeholder */}
        </div>

        {/* XP placeholder */}
        <div className="xp">
          <div className="xp-bar">
            <div className="xp-bar-fill" />
          </div>
        </div>

      </div>
    </section>
  );
}
