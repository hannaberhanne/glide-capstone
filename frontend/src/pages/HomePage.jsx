import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./HomePage.css";

export default function HomePage() {
  // Pretty date like: "Sunday, Oct 26"
  const todayStr = useMemo(() => {
    const d = new Date();
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    }).format(d);
  }, []);

  const [tasks, setTasks] = useState([
    { id: 1, text: "Whatever the task is (1)", done: false },
    { id: 2, text: "Whatever the task is (2)", done: false },
    { id: 3, text: "Whatever the task is (3)", done: false },
  ]);

  const toggleTask = (id) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  return (
    <div className="landing">
      {/* Top Bar */}
      <header className="landing-topbar">
        <div className="landing-date">{todayStr}</div>

        <div className="landing-actions">
          {/* Bell icon (inline SVG) */}
          <button className="icon-btn" aria-label="Notifications">
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
              <path
                d="M12 2a6 6 0 0 0-6 6v2.59l-.91 1.82A2 2 0 0 0 6.93 16h10.14a2 2 0 0 0 1.84-2.59L18 10.59V8a6 6 0 0 0-6-6Z"
                fill="currentColor"
              />
              <path d="M9 18a3 3 0 0 0 6 0H9Z" fill="currentColor" />
            </svg>
          </button>

          {/* Logo placeholder */}
          <div className="landing-logo">
            Glide<span>+</span>
          </div>
        </div>
      </header>

      {/* Greeting */}
      <section className="landing-hero">
        <h1>
          Hello User, <span className="welcome-back">Welcome Back</span>
        </h1>
      </section>

      {/* Goals */}
      <section className="landing-goals">
        <div className="goals-header">
          <h2>Your Goals</h2>
          <button className="add-goal" type="button" aria-label="Add goal">
            +
          </button>
        </div>
        <div className="goals-grid">
          <div className="goal-card">Goal 1</div>
          <div className="goal-card">Goal 2</div>
          <div className="goal-card">Goal 3</div>
        </div>
      </section>

      {/* To-Do */}
      <section className="landing-todo">
        <h2>To Do</h2>
        <ul className="todo-list">
          {tasks.map((t) => (
            <li key={t.id} className="todo-item">
              <label className={`todo-label ${t.done ? "done" : ""}`}>
                <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} />
                <span className="todo-text">{t.text}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      {/* Bottom nav */}
      <footer className="landing-footer">
        <Link className="footer-btn" to="/planner">
          Calendar
        </Link>
        <Link className="footer-btn" to="/dashboard">
          Dashboard
        </Link>
      </footer>
    </div>
  );
}
