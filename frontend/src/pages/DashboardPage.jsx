import { useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import {auth, db} from "../config/firebase.js";
import "./DashboardPage.css";

export default function DashboardPage() {
  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [streak] = useState(4);
  const [xp] = useState(1250);

  const todayStr = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  // ✅ Fetch tasks from backend API
  useEffect(() => {
    const fetchTasks = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(`${API_URL}/api/tasks`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        setTasks(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch tasks:", err);
        setTasks([]);
      }
      setLoading(false);
    };

    fetchTasks();
  }, [API_URL]);

  // ✅ Add new task
  const handleAddTask = async () => {
    if (!newTask.trim() || !auth.currentUser || addingTask) return;

    setAddingTask(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newTask.trim(),
          completed: false,
          dueDate: new Date().toISOString()
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

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

  // ✅ Toggle task completion
  const handleToggleComplete = async (taskId) => {
    if (!auth.currentUser) return;

    const taskToUpdate = tasks.find(t => t.taskId === taskId);
    if (!taskToUpdate) return;

    // Optimistic update
    setTasks((prev) =>
        prev.map((t) =>
            t.taskId === taskId ? { ...t, completed: !t.completed } : t
        )
    );

    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ completed: !taskToUpdate.completed }),
      });

      if (!res.ok) {
        throw new Error('Failed to update task');
      }
    } catch (err) {
      console.error("Failed to update task:", err);
      // Revert on error
      setTasks((prev) =>
          prev.map((t) =>
              t.taskId === taskId ? { ...t, completed: taskToUpdate.completed } : t
          )
      );
    }
  };

  // ✅ Delete task
  const handleDeleteTask = async (taskId) => {
    if (!auth.currentUser) return;

    const previousTasks = tasks;
    setTasks((prev) => prev.filter((t) => t.taskId !== taskId));

    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to delete task');
      }
    } catch (err) {
      console.error("Failed to delete task:", err);
      setTasks(previousTasks);
      alert("Failed to delete task. Please try again.");
    }
  };

  if (loading) return <div className="loading">Loading your day...</div>;

  const todayTasks = tasks.filter((t) => {
    if (!t.dueDate) return false;

    let dueDate;
    if (typeof t.dueDate === 'object' && t.dueDate.seconds) {
      dueDate = new Date(t.dueDate.seconds * 1000);
    } else if (typeof t.dueDate === 'string') {
      dueDate = new Date(t.dueDate);
    } else {
      return false;
    }

    const today = new Date();
    return dueDate.toDateString() === today.toDateString();
  }).length;


  export const getCurrentUser = async (req, res) => {
    try {
      const uid = req.user.uid;

      const userDoc = await db.collection('users').doc(uid).get();

      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userData = {
        userId: userDoc.id,
        ...userDoc.data()
      };

      // Don't send sensitive data to frontend
      delete userData.password;

      res.json(userData);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user data' });
    }
  };


  return (
    <div className="dash">
      {/* HERO */}
      <section className="dash-hero">
        <p className="dash-date">{todayStr}</p>
        <h1 className="dash-title">
          Welcome back, {"User"}       {/*  UPDATE THIS TO SHOW THE USERS NAME                ****************** */}
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
