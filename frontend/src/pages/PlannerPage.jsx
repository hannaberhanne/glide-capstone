import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { auth } from "../config/firebase.js";
import "./PlannerPage.css";

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
const toKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function PlannerPage() {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(startOfMonth(today));
  const [selected, setSelected] = useState(today);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventText, setNewEventText] = useState("");

  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(cursor);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }
      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch("http://localhost:5001/api/events", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setEvents(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch events:", err);
      }
      setLoading(false);
    };
    fetchEvents();
  }, []);

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

  const dayEvents = (d) => {
    const key = toKey(d);
    return events.filter((e) => e.date === key);
  };

  const handleAddEvent = async () => {
    if (!newEventTime.trim() || !newEventText.trim() || !auth.currentUser) return;

    try {
      const token = await auth.currentUser.getIdToken();
      const eventData = {
        date: toKey(selected),
        time: newEventTime.trim(),
        text: newEventText.trim(),
      };

      const res = await fetch("http://localhost:5001/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(eventData),
      });

      const newEvent = await res.json();
      setEvents((prev) => [...prev, newEvent]);
      setNewEventTime("");
      setNewEventText("");
      setShowAddModal(false);
    } catch (err) {
      console.error("Failed to add event:", err);
      alert("Failed to add event");
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!auth.currentUser) return;

    try {
      const token = await auth.currentUser.getIdToken();
      await fetch(`http://localhost:5001/api/events/${eventId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err) {
      console.error("Failed to delete event:", err);
      alert("Failed to delete event");
    }
  };

  if (loading) return <div className="loading">Loading calendar...</div>;

  return (
    <div className="planner">
      <header className="planner-header">
        <div className="nav-left">
          <button className="ghost" onClick={() => setCursor(addMonths(cursor, -1))}>◀</button>
          <h1 className="month">{monthLabel}</h1>
          <button className="ghost" onClick={() => setCursor(addMonths(cursor, +1))}>▶</button>
        </div>
        <div className="nav-right">
          <Link className="nav-btn" to="/">Home</Link>
          <Link className="nav-btn" to="/dashboard">Dashboard</Link>
          <button className="pill" onClick={() => { setCursor(startOfMonth(today)); setSelected(today); }}>Today</button>
        </div>
      </header>

      <section className="calendar">
        <div className="weekdays">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="weekday">{d}</div>
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
                className={["day", inMonth ? "in" : "out", weekend ? "weekend" : "", isToday ? "today" : "", isSelected ? "selected" : ""].join(" ")}
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

      <aside className="day-details">
        <div className="day-header">
          <div className="day-title">
            {new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(selected)}
          </div>
          <button className="primary" onClick={() => setShowAddModal(true)}>+ Add Event</button>
        </div>

        {dayEvents(selected).length === 0 ? (
          <div className="empty">No events for this day.</div>
        ) : (
          <ul className="event-list">
            {dayEvents(selected).map((e) => (
              <li key={e.id} className="event-row">
                <div className="badge">{e.time}</div>
                <div className="event-text">{e.text}</div>
                <button className="delete-btn" onClick={() => handleDeleteEvent(e.id)} aria-label="Delete event">×</button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Event</h2>
            <p className="modal-date">{new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(selected)}</p>
            <input type="text" placeholder="Time (e.g., 2:00 PM)" value={newEventTime} onChange={(e) => setNewEventTime(e.target.value)} />
            <input type="text" placeholder="Event description" value={newEventText} onChange={(e) => setNewEventText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddEvent()} />
            <div className="modal-actions">
              <button onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="primary" onClick={handleAddEvent} disabled={!newEventTime.trim() || !newEventText.trim()}>Add Event</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}