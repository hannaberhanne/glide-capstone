import { useEffect, useMemo, useState } from "react";
import { auth } from "../config/firebase.js";
import TaskModal from "../components/TaskModal.jsx";
import "./PlannerPage.css";

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
const toKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

export default function PlannerPage() {
  const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(startOfMonth(today));
  const [selected, setSelected] = useState(today);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replanSuggestions, setReplanSuggestions] = useState([]);
  const [replanLoading, setReplanLoading] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(cursor);

  const selectedLabel = (() => {
    const s = new Date(selected);
    const t = new Date(today);
    s.setHours(0, 0, 0, 0);
    t.setHours(0, 0, 0, 0);
    const diff = s.getTime() - t.getTime();
    const oneDay = 86400000;
    if (diff === 0) return "Today";
    if (diff === -oneDay) return "Yesterday";
    if (diff === oneDay) return "Tomorrow";
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(selected);
  })();

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
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch tasks:", err);
      }
      setLoading(false);
    };
    fetchTasks();
  }, [API_URL]);

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
        body: JSON.stringify({
          perDay: 3,
          apply: false,
          selectedDate: selected.toISOString(),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReplanSuggestions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Replan failed:", err);
    } finally {
      setReplanLoading(false);
    }
  };

  const grid = useMemo(() => {
    const start = startOfMonth(cursor);
    const firstVisible = new Date(start);
    firstVisible.setDate(firstVisible.getDate() - firstVisible.getDay());
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(firstVisible);
      d.setDate(d.getDate() + i);
      cells.push(d);
    }
    return { cells };
  }, [cursor]);

  const dayTasks = (d) => {
    const key = toKey(d);
    return tasks.filter((t) => {
      if (!t.dueAt) return false;
      const dt = typeof t.dueAt === "object" && t.dueAt.seconds
        ? new Date(t.dueAt.seconds * 1000)
        : new Date(t.dueAt);
      return toKey(dt) === key;
    });
  };

  const formatSuggested = (value) => {
    if (!value) return "n/a";
    const d = typeof value === "string" ? new Date(value) : new Date(value.seconds * 1000);
    return isNaN(d.getTime()) ? "n/a" : d.toLocaleString();
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleSubmitTask = async (payload) => {
    if (!auth.currentUser) return;
    const token = await auth.currentUser.getIdToken();
    const baseBody = {
      title: payload.title,
      description: payload.description || "",
      dueAt: payload.dueAt || null,
      estimatedMinutes:
        payload.estimatedMinutes !== undefined
          ? payload.estimatedMinutes
          : payload.estimatedTime !== undefined
            ? ((Number(payload.estimatedTime) <= 12 ? Number(payload.estimatedTime) * 60 : Number(payload.estimatedTime)) || 0)
            : 0,
      priority: payload.priority || "medium",
      category: payload.category || "academic",
    };
    try {
      if (editingTask?.taskId) {
        const res = await fetch(`${API_URL}/api/tasks/${editingTask.taskId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(baseBody),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } else {
        const res = await fetch(`${API_URL}/api/tasks`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(baseBody),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }
      setShowTaskModal(false);
      setEditingTask(null);
      // refresh tasks
      const res = await fetch(`${API_URL}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setTasks(data);
      }
    } catch (err) {
      console.error("Failed to save task:", err);
    }
  };

  const handleCompleteTask = async (taskId) => {
    if (!auth.currentUser) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/tasks/${taskId}/complete`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // refresh tasks
        const refresh = await fetch(`${API_URL}/api/tasks`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (refresh.ok) {
          const list = await refresh.json();
          if (Array.isArray(list)) setTasks(list);
        }
      }
    } catch (err) {
      console.error("Failed to complete task:", err);
    }
  };

  if (loading) return <div className="loading">Loading calendar...</div>;

  return (
    <div className="planner">
      <header className="planner-header">
        <button className="month-arrow" onClick={() => setCursor(addMonths(cursor, -1))}>
          ◀
        </button>
        <h1 className="month-label">{monthLabel}</h1>
        <button className="month-arrow" onClick={() => setCursor(addMonths(cursor, 1))}>
          ▶
        </button>
      </header>

      <section className="calendar">
        <div className="weekdays">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div className="weekday" key={d}>{d}</div>
          ))}
        </div>

        <div className="month-grid">
          {grid.cells.map((d) => {
            const isToday = isSameDay(d, today);
            const isSelected = isSameDay(d, selected);
            const tasksForDay = dayTasks(d);
            const dotCount = Math.min(tasksForDay.length, 3);
            return (
              <button
                key={d.toISOString()}
                className={["day", isToday ? "today" : "", isSelected ? "selected" : "", tasksForDay.length ? "has-tasks" : ""].join(" ")}
                onClick={() => setSelected(d)}
              >
                <div className="date-num">{d.getDate()}</div>
                {tasksForDay.length > 0 && (
                  <div className="day-dots" aria-label={`${tasksForDay.length} tasks`}>
                    {Array.from({ length: dotCount }).map((_, idx) => (
                      <span key={idx} />
                    ))}
                    {tasksForDay.length > dotCount && (
                      <span className="dot-more">+{Math.min(tasksForDay.length - dotCount, 9)}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {tasks.length === 0 && (
          <div className="planner-empty">
            <div className="planner-empty-icon" aria-hidden>📝</div>
            <div>
              <div className="planner-empty-title">No tasks yet</div>
              <div className="planner-empty-sub">Add a task to start filling your calendar.</div>
            </div>
          </div>
        )}
      </section>

      <aside className="day-details">
        <div className="day-header">
          <h2 className="day-title">{selectedLabel}</h2>
          <button className="ai-btn" onClick={openCreateModal}>+ Add Task</button>
        </div>

        {dayTasks(selected).length === 0 ? (
          <div className="no-events">No tasks for this day.</div>
        ) : (
          <ul className="event-list">
            {dayTasks(selected).map((t) => (
              <li key={t.taskId} className="event-row">
                <button
                  className={`event-check ${t.isComplete ? "checked" : ""}`}
                  onClick={() => handleCompleteTask(t.taskId)}
                  aria-label={t.isComplete ? "Completed" : "Mark complete"}
                >
                  {t.isComplete ? "✓" : ""}
                </button>
                <div>
                  <div className="event-text-row">
                    <span className="event-time">{t.priority || "task"}</span>
                    <button className="event-text-btn" onClick={() => openEditModal(t)}>
                      {t.title}
                    </button>
                  </div>
                  <div className="event-meta">
                    {t.dueAt
                      ? (typeof t.dueAt === "object" && t.dueAt.seconds
                        ? new Date(t.dueAt.seconds * 1000).toLocaleString()
                        : new Date(t.dueAt).toLocaleString())
                      : "No due date"}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="planner-ai">
          <div className="planner-ai-head">
            <div>
              <p className="ai-kicker">Focus assist</p>
              <h3 className="ai-title">Smart scheduling</h3>
              <p className="ai-sub">
                Let AI propose an order for the selected day using due dates, priority, overdue items, and effort. Apply from the suggestions.
              </p>
            </div>
            <button className="ai-btn" onClick={handleReplan} disabled={replanLoading}>
              {replanLoading ? "Thinking..." : "Suggest schedule"}
            </button>
          </div>
          {replanSuggestions.length === 0 ? (
            <div className="ai-empty">No suggestions yet. Run a suggestion to get a plan.</div>
          ) : (
            <ul className="ai-list">
              {replanSuggestions.slice(0, 3).map((t, idx) => (
                <li key={t.taskId || idx} className="ai-item">
                  <div className="ai-item-head">
                    <span className="ai-pill">{t.priority || "task"}</span>
                    <span className="ai-meta">{formatSuggested(t.suggestedDate)}</span>
                  </div>
                  <div className="ai-text">{t.title}</div>
                  <div className="ai-meta">Score: {t._score ?? "n/a"} {t._missed ? "• Missed" : ""}</div>
                  {t._explanation && <div className="ai-meta">{t._explanation}</div>}
                </li>
              ))}
              {replanSuggestions.length > 3 && (
                <div className="ai-meta">More suggestions available—open Today to generate a full plan.</div>
              )}
            </ul>
          )}
        </div>
      </aside>
      <TaskModal
        open={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setEditingTask(null);
        }}
        onSubmit={handleSubmitTask}
        initialTask={
          editingTask || {
            dueAt: selected,
            category: "academic",
          }
        }
      />
    </div>
  );
}
