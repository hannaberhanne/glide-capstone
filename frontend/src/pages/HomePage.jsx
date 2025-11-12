import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { auth } from "../config/firebase.js";
import "./HomePage.css";

export default function HomePage() {
  const todayStr = useMemo(() => {
    const d = new Date();
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    }).format(d);
  }, []);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!auth.currentUser) {
        setTasks([
          { id: 1, title: "Sign in to see your tasks", isComplete: false },
        ]);
        setLoading(false);
        return;
      }

      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch("http://localhost:5001/api/tasks", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch tasks:", err);
      }
      setLoading(false);
    };

    fetchTasks();
  }, []);

  const toggleTask = async (id) => {
    if (!auth.currentUser) return;

    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isComplete: !t.isComplete } : t))
    );

    try {
      const token = await auth.currentUser.getIdToken();
      await fetch(`http://localhost:5001/api/tasks/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isComplete: !task.isComplete }),
      });
    } catch (err) {
      console.error("Failed to toggle task:", err);
      // Revert on error
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isComplete: task.isComplete } : t))
      );
    }
  };

  return (
    <div className="landing">
      <header className="landing-topbar">
        <div className="landing-date">{todayStr}</div>
        <div className="landing-actions">
          <button className="icon-btn" aria-label="Notifications">
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
              <path d="M12 2a6 6 0 0 0-6 6v2.59l-.91 1.82A2 2 0 0 0 6.93 16h10.14a2 2 0 0 0 1.84-2.59L18 10.59V8a6 6 0 0 0-6-6Z" fill="currentColor" />
              <path d="M9 18a3 3 0 0 0 6 0H9Z" fill="currentColor" />
            </svg>
          </button>
          <div className="landing-logo">Glide<span>+</span></div>
        </div>
      </header>

      <section className="landing-hero">
        <h1>Hello {auth.currentUser?.displayName || "User"}, <span className="welcome-back">Welcome Back</span></h1>
      </section>

      <section className="landing-goals">
        <div className="goals-header">
          <h2>Your Goals</h2>
          <button className="add-goal" type="button" aria-label="Add goal">+</button>
        </div>
        <div className="goals-grid">
          <div className="goal-card">Goal 1</div>
          <div className="goal-card">Goal 2</div>
          <div className="goal-card">Goal 3</div>
        </div>
      </section>

      <section className="landing-todo">
        <h2>To Do</h2>
        {loading ? (
          <p>Loading tasks...</p>
        ) : (
          <ul className="todo-list">
            {tasks.length === 0 ? (
              <li className="todo-item">
                <span className="todo-text">No tasks yet — add one from the Dashboard!</span>
              </li>
            ) : (
              tasks.map((t) => (
                <li key={t.id} className="todo-item">
                  <label className={`todo-label ${t.isComplete ? "done" : ""}`}>
                    <input 
                      type="checkbox" 
                      checked={t.isComplete} 
                      onChange={() => toggleTask(t.id)}
                      disabled={!auth.currentUser}
                    />
                    <span className="todo-text">{t.title}</span>
                  </label>
                </li>
              ))
            )}
          </ul>
        )}
      </section>

      <footer className="landing-footer">
        <Link className="footer-btn" to="/planner">Calendar</Link>
        <Link className="footer-btn" to="/dashboard">Dashboard</Link>
      </footer>
    </div>
  );
}