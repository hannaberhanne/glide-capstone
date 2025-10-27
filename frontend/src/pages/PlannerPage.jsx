import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./PlannerPage.css";

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
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
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(startOfMonth(today));
  const [selected, setSelected] = useState(today);

  // Dummy events
  const events = useMemo(
    () => ({
      "2025-10-26": [
        { time: "4:00 PM", text: "Finish COMS essay outline" },
        { time: "6:30 PM", text: "Gym — pull day" },
        { time: "8:00 PM", text: "Call mom" },
      ],
      "2025-10-27": [{ time: "9:00 AM", text: "Email Prof. Collins" }],
    }),
    []
  );

  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(cursor);

  const grid = useMemo(() => {
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);

    const firstVisible = new Date(start);
    firstVisible.setDate(firstVisible.getDate() - firstVisible.getDay());

    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(firstVisible);
      d.setDate(d.getDate() + i);
      cells.push(d);
    }

    return { start, end, cells };
  }, [cursor]);

  const dayEvents = (d) => events[toKey(d)] ?? [];

  return (
    <div className="planner">
      {/* Top bar */}
      <header className="planner-header">
        <div className="nav-left">
          <button className="ghost" onClick={() => setCursor(addMonths(cursor, -1))}>
            ◀
          </button>
          <h1 className="month">{monthLabel}</h1>
          <button className="ghost" onClick={() => setCursor(addMonths(cursor, +1))}>
            ▶
          </button>
        </div>

        <div className="nav-right">
          <Link className="nav-btn" to="/">Home</Link>
          <Link className="nav-btn" to="/dashboard">Dashboard</Link>
          <button
            className="pill"
            onClick={() => {
              setCursor(startOfMonth(today));
              setSelected(today);
            }}
          >
            Today
          </button>
        </div>
      </header>

      {/* Calendar */}
      <section className="calendar">
        <div className="weekdays">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="weekday">
              {d}
            </div>
          ))}
        </div>

        <div className="month-grid">
          {grid.cells.map((d) => {
            const inMonth = d.getMonth() === cursor.getMonth();
            const isToday = isSameDay(d, today);
            const isSelected = isSameDay(d, selected);
            const weekend = d.getDay() === 0 || d.getDay() === 6;
            const evts = dayEvents(d);
            const show = evts.slice(0, 3);
            const more = Math.max(0, evts.length - show.length);

            return (
              <button
                key={d.toISOString()}
                className={[
                  "day",
                  inMonth ? "in" : "out",
                  weekend ? "weekend" : "",
                  isToday ? "today" : "",
                  isSelected ? "selected" : "",
                ].join(" ")}
                onClick={() => setSelected(d)}
                title={d.toDateString()}
              >
                <div className="day-head">
                  <span className="date-num">{d.getDate()}</span>
                </div>

                <div className="events-mini">
                  {show.map((e, i) => (
                    <div key={i} className="pill-mini" title={`${e.time} — ${e.text}`}>
                      <span className="dot" />
                      <span className="pill-text">{e.text}</span>
                    </div>
                  ))}
                  {more > 0 && <div className="more">+{more} more</div>}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Day details */}
      <aside className="day-details">
        <div className="day-header">
          <div className="day-title">
            {new Intl.DateTimeFormat("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            }).format(selected)}
          </div>
          <button className="primary" onClick={() => alert("Add event coming soon!")}>
            + Add Event
          </button>
        </div>

        {dayEvents(selected).length === 0 ? (
          <div className="empty">No events for this day.</div>
        ) : (
          <ul className="event-list">
            {dayEvents(selected).map((e, i) => (
              <li key={i} className="event-row">
                <div className="badge">{e.time}</div>
                <div className="event-text">{e.text}</div>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
