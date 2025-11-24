import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { auth } from "../config/firebase.js";
import "./DashboardPage.css";

export default function DashboardPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [showSettings, setShowSettings] = useState(false); // ⭐ settings toggle
  const [streak] = useState(4);
  const [xp] = useState(1250);

  const todayStr = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  useEffect(() => {
    const fetchTasks = async () => {
      if (!auth.currentUser) {
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

  const handleAddTask = async () => {
    if (!newTask.trim() || !auth.currentUser || addingTask) return;

    setAddingTask(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("http://localhost:5001/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: newTask.trim() }),
      });

      const newTaskData = await res.json();
      setTasks((prev) => [...prev, newTaskData]);
      setNewTask("");
    } catch (err) {
      console.error("Failed to add task:", err);
      alert("Failed to add task. Please try again.");
    } finally {
      setAddingTask(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!auth.currentUser) return;

    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      const token = await auth.currentUser.getIdToken();
      await fetch(`http://localhost:5001/api/tasks/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  if (loading) return <div className="loading">Loading your day...</div>;

  const todayTasks = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate.seconds * 1000);
    const today = new Date();
    return due.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="dash">
      {/* HERO */}
      <section className="dash-hero">
        <p className="dash-date">{todayStr}</p>
        <h1 className="dash-title">
          Welcome back, {auth.currentUser?.email?.split("@")[0] || "User"}
        </h1>
        <p className="dash-sub">
          Here's a quick snapshot of your day across tasks, habits, and XP.
        </p>
      </section>

      {/* KPI STRIP */}
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

      {/* MAIN CONTENT GRID */}
      <section className="dash-main">
        {/* LEFT PANEL: UPCOMING */}
        <div className="panel">
          <div className="panel-head">
            <h2>Upcoming</h2>
            <Link to="/planner" className="panel-link">
              Open Calendar →
            </Link>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
              placeholder="Add a new task..."
              disabled={addingTask}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "2px solid #e5e7eb",
                borderRadius: "10px",
                fontSize: "15px",
                outline: "none",
              }}
            />
          </div>

          <ul className="task-list">
            {tasks.length === 0 ? (
              <li className="task-item">
                <div className="task-body">
                  <div className="task-text">
                    No tasks yet — you're crushing it! ✨
                  </div>
                </div>
              </li>
            ) : (
              tasks.map((t) => (
                <li key={t.id} className="task-item">
                  <span className="task-dot" />
                  <div className="task-body">
                    <div className="task-text">{t.title || t.text}</div>
                    <div className="task-meta">
                      {t.dueDate
                        ? new Date(t.dueDate.seconds * 1000).toLocaleString()
                        : t.due || "No due date"}
                    </div>
                  </div>

                  <button
                    className="delete-task-btn"
                    onClick={() => handleDeleteTask(t.id)}
                    aria-label="Delete task"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px",
                      marginLeft: "auto",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M12 4L4 12M4 4L12 12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* RIGHT PANEL: QUICK LINKS **OR** SETTINGS */}
        <div className="panel">
          <div className="panel-head">
            <h2>{showSettings ? "Settings" : "Quick Links"}</h2>
          </div>

          <div className="quick-grid">

            {/* SETTINGS MODE */}
            {showSettings ? (
              <>
                <button
                  className="quick-btn"
                  onClick={() => (window.location.href = "/canvas-setup")}
                >
                  Sync Canvas →
                </button>

                <button
                  className="quick-btn"
                  onClick={() => setShowSettings(false)}
                  style={{ background: "#f1f5f9" }}
                >
                  Close Settings
                </button>
              </>
            ) : (
              /* QUICK LINKS MODE */
              <>
                <Link to="/planner" className="quick-btn">
                  Add Task
                </Link>

                <Link to="/home" className="quick-btn">
                  Goals
                </Link>

                <button
                  className="quick-btn"
                  onClick={() => setShowSettings(true)}
                >
                  Settings
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* XP FULL-WIDTH PANEL */}
      <section className="xp-wide-panel">
        <div className="panel xp-panel">
          <h2 className="xp-header">XP &amp; Badges</h2>
          <div className="xp-value-large">XP {xp}</div>

          <div className="xp-bar xp-bar-wide">
            <div className="xp-fill" style={{ width: "45%" }} />
          </div>
        </div>
      </section>

    </div>
  );
}
