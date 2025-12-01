import { useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import { auth } from "../config/firebase.js";
import "./DashboardPage.css";

export default function DashboardPage() {
  const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [streak] = useState(4);
  const [xp] = useState(1250);
  const [extractText, setExtractText] = useState("");
  const [extracted, setExtracted] = useState([]);
  const [extracting, setExtracting] = useState(false);
  const [replanSuggestions, setReplanSuggestions] = useState([]);
  const [replanLoading, setReplanLoading] = useState(false);

  const todayStr = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  // Fetch logged-in user
  useEffect(() => {
    const fetchUser = async () => {
      if (!auth.currentUser) return;

      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(`${API_URL}/api/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const userData = await res.json();
        setUser(userData);
      } catch (err) {
        console.error("Failed to fetch user:", err);
      }
    };

    fetchUser();
  }, [API_URL]);

  // Fetch tasks
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

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

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
          isComplete: false,
          dueAt: new Date().toISOString()
        }),
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

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

  // Toggle complete
  const handleToggleComplete = async (taskId) => {
    if (!auth.currentUser) return;

    const taskToUpdate = tasks.find((t) => t.taskId === taskId);
    if (!taskToUpdate) return;

    setTasks((prev) =>
        prev.map((t) =>
            t.taskId === taskId ? { ...t, isComplete: !t.isComplete } : t
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
        body: JSON.stringify({ isComplete: !taskToUpdate.isComplete }),
      });

      if (!res.ok) throw new Error("Failed to update task");
    } catch (err) {
      console.error("Failed to update task:", err);

      // revert
      setTasks((prev) =>
          prev.map((t) =>
              t.taskId === taskId ? { ...t, isComplete: taskToUpdate.isComplete } : t
          )
      );
    }
  };

  // Delete task
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

      if (!res.ok) throw new Error("Failed to delete task");
    } catch (err) {
      console.error("Failed to delete task:", err);

      // revert
      setTasks(previousTasks);
      alert("Failed to delete task. Please try again.");
    }
  };

  const handleExtract = async () => {
    if (!extractText.trim() || !auth.currentUser) return;
    setExtracting(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/ai/extract`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: extractText }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setExtracted(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Extract failed:", err);
      alert("AI extraction failed. Check your API key and try again.");
    } finally {
      setExtracting(false);
    }
  };

  const handleSaveExtracted = async (item) => {
    if (!auth.currentUser) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: item.title || "Untitled",
          description: item.description || "",
          dueAt: item.dueDate || null,
          priority: item.priority || "medium",
          estimatedTime: item.estimatedTimeMinutes || 0,
          canvasAssignmentId: null,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const newTaskData = await res.json();
      setTasks((prev) => [...prev, newTaskData]);
    } catch (err) {
      console.error("Failed to save extracted task:", err);
      alert("Could not save extracted task.");
    }
  };

  const handleReplan = async () => {
    if (!auth.currentUser) return;
    setReplanLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/ai/replan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ perDay: 3 }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReplanSuggestions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Replan failed:", err);
      alert("Auto-replan failed. Try again later.");
    } finally {
      setReplanLoading(false);
    }
  };

  const formatDue = (t) => {
    if (!t.dueAt) return "No due date";
    if (typeof t.dueAt === 'object' && t.dueAt.seconds) {
      return new Date(t.dueAt.seconds * 1000).toLocaleString();
    }
    return new Date(t.dueAt).toLocaleString();
  };

  if (loading) return <div className="loading">Loading your day...</div>;

  const todayTasks = tasks.filter((t) => {
    if (!t.dueAt) return false;

    let dueDate;
    if (typeof t.dueAt === 'object' && t.dueAt.seconds) {
      dueDate = new Date(t.dueAt.seconds * 1000);
    } else if (typeof t.dueAt === 'string') {
      dueDate = new Date(t.dueAt);
    } else {
      return false;
    }

    const today = new Date();
    return dueDate.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="dash">

      {/* HERO */}
      <section className="dash-hero">
        <p className="dash-date">{todayStr}</p>
        <h1 className="dash-title">Welcome back, User</h1>
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
                <li key={t.taskId} className="task-item">
                  <input
                    type="checkbox"
                    checked={!!t.isComplete}
                    onChange={() => handleToggleComplete(t.taskId)}
                    style={{ marginRight: 10 }}
                  />
                  <div className="task-body">
                    <div className="task-text">{t.title || t.text}</div>
                    <div className="task-meta">{formatDue(t)}</div>
                  </div>

                  <button
                    className="delete-task-btn"
                    onClick={() => handleDeleteTask(t.taskId)}
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

        {/* RIGHT PANEL: QUICK LINKS */}
        <div className="panel">
          <div className="panel-head">
            <h2>Quick Links</h2>
          </div>

          <div className="quick-grid">
            <Link to="/planner" className="quick-btn">
              Add Task
            </Link>

            <Link to="/home" className="quick-btn">
              Goals
            </Link>
          </div>
        </div>

      </section>

      {/* AI PANEL */}
      <section className="dash-main">
        <div className="panel" style={{ flex: 1 }}>
          <div className="panel-head">
            <h2>AI Extraction</h2>
            <button className="quick-btn" onClick={handleExtract} disabled={extracting}>
              {extracting ? "Running..." : "Extract"}
            </button>
          </div>
          <textarea
            value={extractText}
            onChange={(e) => setExtractText(e.target.value)}
            placeholder="Paste syllabus or assignment text..."
            style={{ width: "100%", minHeight: 120, marginBottom: 12 }}
          />
          {extracted.length > 0 && (
            <ul className="task-list">
              {extracted.map((item, idx) => (
                <li key={idx} className="task-item">
                  <div className="task-body">
                    <div className="task-text">{item.title || "Untitled"}</div>
                    <div className="task-meta">
                      {item.dueDate ? new Date(item.dueDate).toLocaleString() : "No due date"} • {item.priority || "medium"}
                    </div>
                    <div className="task-meta">{item.description || ""}</div>
                  </div>
                  <button className="quick-btn" onClick={() => handleSaveExtracted(item)}>
                    Save to tasks
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel" style={{ flex: 1 }}>
          <div className="panel-head">
            <h2>Auto-Replan</h2>
            <button className="quick-btn" onClick={handleReplan} disabled={replanLoading}>
              {replanLoading ? "Replanning..." : "Replan"}
            </button>
          </div>
          {replanSuggestions.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No suggestions yet. Run replan to see ordering.</p>
          ) : (
            <ul className="task-list">
              {replanSuggestions.map((t, idx) => (
                <li key={t.taskId || idx} className="task-item">
                  <div className="task-body">
                    <div className="task-text">{t.title}</div>
                    <div className="task-meta">
                      Score: {t._score ?? "n/a"} • Suggested: {t.suggestedDate ? new Date(t.suggestedDate).toLocaleDateString() : "n/a"}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
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
