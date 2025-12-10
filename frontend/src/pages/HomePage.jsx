// src/pages/HomePage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { auth } from "../config/firebase.js";
import useUser from "../hooks/useUser";
import "./HomePage.css";

export default function HomePage() {
  const todayStr = useMemo(() => {
    const d = new Date();
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(d);
  }, []);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
  const { user } = useUser(API_URL);

  const goals = []; // keep empty for now
  const [currentGoalIndex, setCurrentGoalIndex] = useState(0);

  const isLoggedIn = !!auth.currentUser;

  useEffect(() => {
    const fetchTasks = async () => {
      if (!auth.currentUser) {
        setTasks([]);
        setLoading(false);
        return;
      }

      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch("http://localhost:8080/api/tasks", {
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

  // autoplay goals later
  useEffect(() => {
    if (!goals || goals.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentGoalIndex((prev) => (prev + 1) % goals.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [goals]);

  const handlePrevGoal = () => {
    if (!goals || goals.length === 0) return;
    setCurrentGoalIndex((prev) =>
      prev === 0 ? goals.length - 1 : prev - 1
    );
  };

  const handleNextGoal = () => {
    if (!goals || goals.length === 0) return;
    setCurrentGoalIndex((prev) => (prev + 1) % goals.length);
  };

  const toggleTask = async (id) => {
    if (!auth.currentUser) return;

    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, isComplete: !t.isComplete } : t
      )
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

      setTasks((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, isComplete: task.isComplete } : t
        )
      );
    }
  };

  const firstName = Array.isArray(user) ? user[0]?.firstName : null;
  const name =
    firstName ||
    auth.currentUser?.displayName?.split(" ")[0] ||
    "there";

  return (
    <div className="home">
      {/* HEADER */}
      <header className="home-header">
        <div>
          <h1 className="home-title">Welcome back, {name}</h1>
          <p className="home-date-line">{todayStr}</p>
        </div>
      </header>

      <main className="home-main">
        {/* GOALS */}
        <section className="home-section">
          <div className="home-section-head">
            <h2 className="home-section-title">Your goals</h2>
            <p className="home-section-sub">
              Keep an eye on what matters most first.
            </p>
          </div>

          <div className="goals-shell">
            <button
              type="button"
              className="goal-arrow goal-arrow-left"
              onClick={handlePrevGoal}
              aria-label="Previous goal"
            >
              ‹
            </button>

            <div className="goals-viewport">
              {(!goals || goals.length === 0) && (
                <article className="goal-card goal-card-empty">
                  <h3>No goals yet</h3>
                  <p>
                    Once you start creating goals, they’ll show up here as
                    big focus cards. For now, think about 1–3 things you
                    want this semester.
                  </p>
                </article>
              )}

              {goals && goals.length > 0 && (
                <article className="goal-card">
                  <h3>{goals[currentGoalIndex].title}</h3>
                  {goals[currentGoalIndex].description && (
                    <p>{goals[currentGoalIndex].description}</p>
                  )}
                </article>
              )}
            </div>

            <button
              type="button"
              className="goal-arrow goal-arrow-right"
              onClick={handleNextGoal}
              aria-label="Next goal"
            >
              ›
            </button>
          </div>
        </section>

        {/* TODO LIST */}
        <section className="home-section">
          <div className="home-section-head">
            <h2 className="home-section-title">Today’s to-do</h2>
            <p className="home-section-sub">
              Check things off as you go. Small wins count.
            </p>
          </div>

          <div className="todo-shell">
            {loading ? (
              <p className="todo-empty">Loading your tasks…</p>
            ) : !isLoggedIn ? (
              <p className="todo-empty">
                <Link to="/login" className="todo-link">
                  Sign in from the top navigation to see and check off your
                  tasks from the Dashboard.
                </Link>
              </p>
            ) : tasks.length === 0 ? (
              <p className="todo-empty">
                No tasks yet — add one from the Dashboard or Planner.
              </p>
            ) : (
              <ul className="todo-list">
                {tasks.map((t) => (
                  <li key={t.id} className="todo-item">
                    <label
                      className={`todo-label ${
                        t.isComplete ? "todo-done" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!t.isComplete}
                        onChange={() => toggleTask(t.id)}
                      />
                      <span className="todo-text">
                        {t.title || t.text}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
