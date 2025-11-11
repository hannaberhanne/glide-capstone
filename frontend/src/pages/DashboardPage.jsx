import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import "./DashboardPage.css";

export default function DashboardPage() {
  const todayStr = useMemo(() => {
    const d = new Date();
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(d);
  }, []);

  const [streak] = useState(4);
  const [xp] = useState(1250);

  const [tasks, setTasks] = useState([
    { id: 1, text: "Finish COMS essay outline", due: "Today 4:00 PM" },
    { id: 2, text: "Gym — pull day", due: "Today 6:30 PM" },
    { id: 3, text: "Email Prof. Collins", due: "Tomorrow 9:00 AM" },
  ]);

<<<<<<< HEAD
  const [newTask, setNewTask] = useState("");

  const fetchTasks = async () => {
    const querySnapshot = await getDocs(collection(db, "Task")); // or "tasks" if renamed
    const fetched = [];
    querySnapshot.forEach((doc) => {
      fetched.push({ id: doc.id, ...doc.data() });
    });
    setTasks((prev) => [...prev, ...fetched]);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleAddTask = async () => {
    if (!newTask.trim()) return;
    try {
      await addDoc(collection(db, "Task"), {
        title: newTask.trim(),
        dueDate: Timestamp.now(),
        userId: "0",
        isComplete: false,
      });
      setNewTask("");
      fetchTasks();
    } catch (error) {
      console.error("Error adding task: ", error);
    }
  };
=======
  const todayTasks = tasks.filter((t) => t.due.startsWith("Today")).length;
>>>>>>> origin/landinPage

  return (
    <div className="dash">
      {/* HERO / INTRO */}
      <section className="dash-hero">
        <p className="dash-date">{todayStr}</p>
        <h1 className="dash-title">Welcome back, User</h1>
        <p className="dash-sub">
          Here’s a quick snapshot of your day across tasks, habits, and XP.
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

      {/* MAIN CONTENT */}
      <section className="dash-main">
        {/* Upcoming */}
        <div className="panel">
          <div className="panel-head">
            <h2>Upcoming</h2>
            <Link to="/planner" className="panel-link">
              Open Calendar →
            </Link>
          </div>
<<<<<<< HEAD
          <div style={{ marginBottom: "1rem" }}>
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="New task"
              style={{ padding: "0.25rem", marginRight: "0.5rem" }}
            />
            <button type="button" onClick={handleAddTask}>Add</button>
          </div>
          <ul className="list">
            {tasks.map(t => (
              <li key={t.id} className="list-item">
                <div className="dot" />
                <div className="item-body">
                  <div className="item-text">{t.title || t.text}</div>
                  <div className="item-meta">{t.due}</div>
=======
          <ul className="task-list">
            {tasks.map((t) => (
              <li key={t.id} className="task-item">
                <span className="task-dot" />
                <div className="task-body">
                  <div className="task-text">{t.text}</div>
                  <div className="task-meta">{t.due}</div>
>>>>>>> origin/landinPage
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Quick Links + XP */}
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
            <Link to="/dashboard" className="quick-btn">
              XP &amp; Badges
            </Link>
            <Link to="/home" className="quick-btn">
              Settings
            </Link>
          </div>

          <div className="xp-wrap">
            <div className="xp-labels">
              <span className="xp-title">XP</span>
              <span className="xp-value">{xp}</span>
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