import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./DashboardPage.css";

export default function DashboardPage() {
  const todayStr = useMemo(() => {
    const d = new Date();
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    }).format(d);
  }, []);

  const [streak] = useState(4);
  const [xp] = useState(1250);

  const [tasks] = useState([
    { id: 1, text: "Finish COMS essay outline", due: "Today 4:00 PM" },
    { id: 2, text: "Gym — pull day", due: "Today 6:30 PM" },
    { id: 3, text: "Email Prof. Collins", due: "Tomorrow 9:00 AM" },
  ]);

  return (
    <div className="dash">
      {/* Top bar */}
      <header className="dash-topbar">
        <div className="dash-date">{todayStr}</div>
        <nav className="dash-nav">
          <Link to="/" className="nav-btn">Home</Link>
          <Link to="/planner" className="nav-btn">Calendar</Link>
        </nav>
      </header>

      {/* Greeting */}
      <section className="dash-hero">
        <h1>Welcome back, User</h1>
        <p className="sub">Here’s a quick snapshot of your day.</p>
      </section>

      {/* KPI cards */}
      <section className="dash-kpis">
        <div className="kpi">
          <div className="kpi-title">Today</div>
          <div className="kpi-value">{tasks.filter(t => t.due.startsWith("Today")).length}</div>
          <div className="kpi-note">tasks due</div>
        </div>

        <div className="kpi">
          <div className="kpi-title">Streak</div>
          <div className="kpi-value">{streak}🔥</div>
          <div className="kpi-note">days in a row</div>
        </div>

        <div className="kpi kpi-accent">
          <div className="kpi-title">Reset Week</div>
          <button className="break-btn" type="button" onClick={() => alert("Break mode coming soon!")}>
            I need a break
          </button>
          <div className="kpi-note">pauses XP loss</div>
        </div>
      </section>

      {/* Main grid: Upcoming + Quick Links */}
      <section className="dash-main">
        <div className="panel">
          <div className="panel-head">
            <h2>Upcoming</h2>
            <Link to="/planner" className="link">Open Calendar →</Link>
          </div>
          <ul className="list">
            {tasks.map(t => (
              <li key={t.id} className="list-item">
                <div className="dot" />
                <div className="item-body">
                  <div className="item-text">{t.text}</div>
                  <div className="item-meta">{t.due}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Quick Links</h2>
          </div>
          <div className="quick-grid">
            <Link className="quick" to="/planner">Add Task</Link>
            <Link className="quick" to="/">Goals</Link>
            <Link className="quick" to="/dashboard">XP & Badges</Link>
            <Link className="quick" to="/">Settings</Link>
          </div>
          <div className="xp-card">
            <div className="xp-left">
              <div className="xp-title">XP</div>
              <div className="xp-value">{xp}</div>
            </div>
            <div className="xp-bar">
              <div className="xp-fill" style={{ width: "45%" }} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
