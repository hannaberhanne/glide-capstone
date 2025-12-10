import { Link } from "react-router-dom";

export default function DashboardHero({ todayStr, displayName, canvasLabel, canvasConnected, statusLoading }) {
  return (
    <section className="dash-hero">
      <div className="dash-hero-left">
        <p className="dash-date">{todayStr}</p>
        <h1 className="dash-title">Welcome back, {displayName}</h1>
        <p className="dash-sub">
          Plan fast, earn XP, and keep Canvas in sync.
        </p>
        <div className="dash-hero-actions">
          <Link to="/planner" className="primary-cta">Open Calendar</Link>
          <Link to="/goals" className="ghost-cta">Earn XP</Link>
          <Link to="/goals#zen-panel" className="ghost-cta secondary">Reset week</Link>
        </div>
      </div>
      <div className="canvas-chip">
        <div className={`chip-dot ${canvasConnected ? "ok" : "warn"}`} />
        <div className="chip-text">
          {statusLoading ? "Checking Canvas..." : canvasLabel}
        </div>
        <Link to="/profile" className="chip-link">Manage →</Link>
      </div>
    </section>
  );
}
