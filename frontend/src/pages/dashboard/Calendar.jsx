import { useEffect, useMemo, useState } from "react";
import { auth } from "../../config/firebase";
import "./Calendar.css";

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

export default function Calendar() {
  const API_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(startOfMonth(today));
  const [selected, setSelected] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("month");

  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(cursor);

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

  // Dynamic grid generator
  const grid = useMemo(() => {
    if (view === "month") {
      const start = startOfMonth(cursor);
      const firstVisible = new Date(start);
      firstVisible.setDate(firstVisible.getDate() - firstVisible.getDay());

      return Array.from({ length: 42 }, (_, i) => {
        const d = new Date(firstVisible);
        d.setDate(d.getDate() + i);
        return d;
      });
    }

    if (view === "week") {
      const base = selected || today;
      const startOfWeek = new Date(base);
      startOfWeek.setDate(base.getDate() - base.getDay());

      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + i);
        return d;
      });
    }

    if (view === "day") {
      return [selected || today];
    }

    return [];
  }, [cursor, view, selected, today]);

  const dayTasks = (d) => {
    const key = toKey(d);

    return tasks.filter((t) => {
      if (!t.dueAt) return false;

      const dt =
        typeof t.dueAt === "object" && t.dueAt.seconds
          ? new Date(t.dueAt.seconds * 1000)
          : new Date(t.dueAt);

      return toKey(dt) === key;
    });
  };

  if (loading) return <div>Loading calendar...</div>;

  return (
    <div className="dashboard-calendar" data-view={view}>
      {/* TOP BAR */}
      <header className="calendar-top-bar">
        {/* LEFT TOGGLE */}
        <div className="calendar-view-toggle">
          <span
            className={view === "day" ? "active" : ""}
            onClick={() => setView("day")}
          >
            Daily
          </span>

          <span
            className={view === "week" ? "active" : ""}
            onClick={() => setView("week")}
          >
            Weekly
          </span>

          <span
            className={view === "month" ? "active" : ""}
            onClick={() => setView("month")}
          >
            Monthly
          </span>
        </div>

        {/* RIGHT NAV */}
        <div className="calendar-month-nav">
          <button
            className="month-arrow"
            onClick={() => setCursor(addMonths(cursor, -1))}
          >
            ◀
          </button>

          <h1 className="month-label">{monthLabel}</h1>

          <button
            className="month-arrow"
            onClick={() => setCursor(addMonths(cursor, 1))}
          >
            ▶
          </button>
        </div>
      </header>

      {/* CALENDAR GRID */}
      <section className="calendar">
        {view !== "day" && (
          <div className="weekdays">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
        )}

        <div
          className="month-grid"
          style={{
            gridTemplateColumns:
              view === "month"
                ? "repeat(7, 1fr)"
                : view === "week"
                ? "repeat(7, 1fr)"
                : "repeat(1, 1fr)",
          }}
        >
          {grid.map((d) => {
            const isToday = isSameDay(d, today);
            const isSelected = selected && isSameDay(d, selected);
            const tasksForDay = dayTasks(d);
            const dotCount = Math.min(tasksForDay.length, 3);

            return (
              <button
                key={d.toISOString()}
                className={[
                  "day",
                  isToday ? "today" : "",
                  isSelected ? "selected" : "",
                  tasksForDay.length ? "has-tasks" : "",
                ].join(" ")}
                onClick={() =>
                  setSelected((prev) =>
                    prev && isSameDay(prev, d) ? null : d
                  )
                }
              >
                <div className="date-num">{d.getDate()}</div>

                {tasksForDay.length > 0 && (
                  <div className="day-dots">
                    {Array.from({ length: dotCount }).map((_, idx) => (
                      <span key={idx} />
                    ))}
                    {tasksForDay.length > dotCount && (
                      <span className="dot-more">
                        +{tasksForDay.length - dotCount}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* SELECTED DAY DETAILS */}
      {selected && (
        <div className="dashboard-day-details">
          <h2>
            {new Intl.DateTimeFormat("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            }).format(selected)}
          </h2>

          {dayTasks(selected).length === 0 ? (
            <div className="no-events">No tasks for this day.</div>
          ) : (
            <ul className="event-list">
              {dayTasks(selected).map((t) => (
                <li key={t.taskId} className="event-row">
                  <div className="event-main">
                    <span className="event-title">{t.title}</span>
              
                    <span className="event-due">
                      {t.dueAt
                        ? new Date(
                            typeof t.dueAt === "object" && t.dueAt.seconds
                              ? t.dueAt.seconds * 1000
                              : t.dueAt
                          ).toLocaleString()
                        : "No due date"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
