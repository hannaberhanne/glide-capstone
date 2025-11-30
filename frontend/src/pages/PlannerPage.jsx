import { useEffect, useMemo, useState } from "react";
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
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

export default function PlannerPage() {
  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
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

  /* -------------------------
     CORRECTED LABEL LOGIC
     ------------------------- */
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

  /* -------------------------
     FETCH EVENTS
     ------------------------- */
  useEffect(() => {
    const fetchEvents = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(`${API_URL}/api/events`, {
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

  /* -------------------------
     CALENDAR GRID
     ------------------------- */
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

  const dayEvents = (d) => {
    const key = toKey(d);
    return events.filter((e) => e.date === key);
  };

  /* -------------------------
     ADD EVENT
     ------------------------- */
  const handleAddEvent = async () => {
    if (!newEventText.trim() || !newEventTime.trim()) return;

    try {
      const token = await auth.currentUser.getIdToken();
      const eventData = {
        date: toKey(selected),
        time: newEventTime,
        text: newEventText,
      };

      const res = await fetch("http://localhost:5001/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(eventData),
      });

      const newEvt = await res.json();
      setEvents((prev) => [...prev, newEvt]);
      setNewEventTime("");
      setNewEventText("");
      setShowAddModal(false);
    } catch (err) {
      console.error("Add event error:", err);
    }
  };

  /* -------------------------
     DELETE EVENT
     ------------------------- */
  const handleDeleteEvent = async (id) => {
    try {
      const token = await auth.currentUser.getIdToken();
      await fetch(`http://localhost:5001/api/events/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error("Delete event error:", err);
    }
  };

  if (loading) return <div className="loading">Loading calendar...</div>;

  return (
    <div className="planner">

      {/* Month Header */}
      <header className="planner-header">
        <button className="month-arrow" onClick={() => setCursor(addMonths(cursor, -1))}>
          ◀
        </button>

        <h1 className="month-label">{monthLabel}</h1>

        <button className="month-arrow" onClick={() => setCursor(addMonths(cursor, 1))}>
          ▶
        </button>
      </header>

      {/* CALENDAR */}
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

            return (
              <button
                key={d.toISOString()}
                className={[
                  "day",
                  isToday ? "today" : "",
                  isSelected ? "selected" : "",
                ].join(" ")}
                onClick={() => setSelected(d)}
              >
                <div className="date-num">{d.getDate()}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* RIGHT PANEL */}
      <aside className="day-details">
        <div className="day-header">
          <h2 className="day-title">{selectedLabel}</h2>
          <button className="add-event-btn" onClick={() => setShowAddModal(true)}>
            + Add Event
          </button>
        </div>

        {dayEvents(selected).length === 0 ? (
          <div className="no-events">No events for this day.</div>
        ) : (
          <ul className="event-list">
            {dayEvents(selected).map((evt) => (
              <li key={evt.id} className="event-row">
                <span className="event-time">{evt.time}</span>
                <span className="event-text">{evt.text}</span>
                <button className="delete-btn" onClick={() => handleDeleteEvent(evt.id)}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Event</h2>
            <p className="modal-date">{selectedLabel}</p>

            <input
              placeholder="Time (e.g., 4:30 PM)"
              value={newEventTime}
              onChange={(e) => setNewEventTime(e.target.value)}
            />
            <input
              placeholder="Event"
              value={newEventText}
              onChange={(e) => setNewEventText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddEvent()}
            />

            <div className="modal-actions">
              <button onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="primary" onClick={handleAddEvent}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}