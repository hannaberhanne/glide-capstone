import { useEffect, useMemo, useState } from "react";
import { auth } from "../config/firebase";
import useUser from "../hooks/useUser";
import PixelIcon from "../components/PixelIcon.jsx";
import "./GoalsPage.css";

const dateKey = (d = new Date()) => d.toISOString().slice(0, 10); // yyyy-mm-dd
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function HabitModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "personal",
    frequency: "daily",
    targetDays: [],
    durationMinutes: 0,
    xpValue: 10,
    icon: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        title: "",
        description: "",
        category: "personal",
        frequency: "daily",
        targetDays: [],
        durationMinutes: 0,
        xpValue: 10,
        icon: "",
      });
    }
  }, [open]);

  if (!open) return null;

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const toggleDay = (day) => {
    setForm((f) => {
      const exists = f.targetDays.includes(day);
      const next = exists ? f.targetDays.filter((d) => d !== day) : [...f.targetDays, day];
      return { ...f, targetDays: next };
    });
  };

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    onSubmit({ ...form, title: form.title.trim() });
  };

  return (
    <div className="habitmodal-overlay" onClick={onClose}>
      <div className="habitmodal" onClick={(e) => e.stopPropagation()}>
        <div className="habitmodal-head">
          <h3>Create Habit</h3>
          <button className="habitmodal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <label className="habitmodal-label">
          Title
          <input
            className="habitmodal-input"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="Study sprint, Morning run..."
          />
        </label>

        <label className="habitmodal-label">
          Description
          <textarea
            className="habitmodal-textarea"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Add context or steps."
          />
        </label>

        <div className="habitmodal-grid">
          <label className="habitmodal-label">
            Category
            <select
              className="habitmodal-input"
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
            >
              <option value="academic">Academic</option>
              <option value="health">Health</option>
              <option value="personal">Personal</option>
            </select>
          </label>

          <label className="habitmodal-label">
            XP Value
            <input
              className="habitmodal-input"
              type="number"
              min="1"
              value={form.xpValue}
              onChange={(e) => update("xpValue", Number(e.target.value))}
            />
          </label>
        </div>

        <div className="habitmodal-grid">
          <label className="habitmodal-label">
            Frequency
            <div className="habitmodal-radio">
              <label>
                <input
                  type="radio"
                  name="frequency"
                  value="daily"
                  checked={form.frequency === "daily"}
                  onChange={() => update("frequency", "daily")}
                />
                Daily
              </label>
              <label>
                <input
                  type="radio"
                  name="frequency"
                  value="weekly"
                  checked={form.frequency === "weekly"}
                  onChange={() => update("frequency", "weekly")}
                />
                Weekly
              </label>
            </div>
          </label>

          <label className="habitmodal-label">
            Duration (minutes)
            <input
              className="habitmodal-input"
              type="number"
              min="0"
              value={form.durationMinutes}
              onChange={(e) => update("durationMinutes", Number(e.target.value))}
              placeholder="e.g. 30"
            />
          </label>
        </div>

        {form.frequency === "weekly" && (
          <div className="habitmodal-days">
            {DAYS.map((d) => (
              <button
                key={d}
                type="button"
                className={`day-pill ${form.targetDays.includes(d) ? "active" : ""}`}
                onClick={() => toggleDay(d)}
              >
                {d}
              </button>
            ))}
          </div>
        )}

        <div className="habitmodal-grid">
          <label className="habitmodal-label">
            Icon (emoji)
            <input
              className="habitmodal-input"
              value={form.icon}
              onChange={(e) => update("icon", e.target.value)}
              placeholder="🔥"
            />
          </label>
        </div>

        <div className="habitmodal-actions">
          <button className="habitmodal-secondary" onClick={onClose}>Cancel</button>
          <button className="habitmodal-primary" onClick={handleSubmit} disabled={!form.title.trim()}>
            Create Habit
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GoalsPage() {
  const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
  const { user, setXp, refreshUser, xp } = useUser(API_URL);
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [badgeToast, setBadgeToast] = useState(null);
  const [zenTab, setZenTab] = useState("reset");
  const [zenStatus, setZenStatus] = useState("");
  const currentUser = useMemo(() => (Array.isArray(user) ? user[0] : null), [user]);
  const badges = useMemo(
    () => Array.isArray(currentUser?.badges) ? currentUser.badges : [],
    [currentUser]
  );
  const displayName =
    currentUser?.firstName ||
    auth.currentUser?.displayName?.split(" ")[0] ||
    "User";

  const fetchHabits = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/habits`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setHabits(data);
      }
    } catch (err) {
      console.error("Failed to fetch habits:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  useEffect(() => {
    if (!badgeToast) return undefined;
    const id = setTimeout(() => setBadgeToast(null), 3600);
    return () => clearTimeout(id);
  }, [badgeToast]);

  const isTodayCompleted = (habit) => {
    const history = Array.isArray(habit.completionHistory) ? habit.completionHistory : [];
    return history.includes(dateKey());
  };

  const handleCreateHabit = async (payload) => {
    if (!auth.currentUser) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/habits`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setShowModal(false);
      await fetchHabits();
    } catch (err) {
      console.error("Failed to create habit:", err);
      alert("Failed to create habit");
    }
  };

  const handleCompleteHabit = async (habitId) => {
    if (!auth.currentUser) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/habits/${habitId}/complete`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      if (typeof data.newTotalXP === "number") {
        setXp(data.newTotalXP);
      }
      await fetchHabits();
      await refreshUser();
      const newBadge = Array.isArray(data.badgesAwarded) ? data.badgesAwarded[0] : null;
      if (newBadge) {
        setBadgeToast(newBadge);
      }
    } catch (err) {
      console.error("Failed to complete habit:", err);
      alert("Failed to complete habit");
    }
  };

  const completedHabits = habits.filter((habit) => isTodayCompleted(habit)).length;
  const tokenBadgesEarned = badges.length;
  const xpLevel = Math.floor((xp || 0) / 100) + 1;
  const xpTarget = 600;
  const xpProgressPct = Math.min(((xp || 0) / xpTarget) * 100, 100);
  const xpToNext = Math.max(0, xpTarget - (xp || 0));
  const isEmpty = !habits.length;

  const handleResetWeek = () => {
    setZenStatus("Reset week scheduled, XP loss paused until Monday.");
  };

  const handleBreak = () => {
    setZenStatus("Break mode activated. Glide+ will pause push notifications for today.");
  };

  return (
    <div className="goals">
      <header className="goals-hero">
        <div>
          <p className="goals-kicker">Habits & Quests</p>
          <h1 className="goals-title">Stay consistent</h1>
          <p className="goals-sub">
            Build streaks, earn XP daily, and keep your routines on track.
          </p>
        </div>
        <div className="goals-hero-actions">
          <button className="goals-cta" onClick={() => setShowModal(true)}>Keep earning XP</button>
        </div>
      </header>

      <section className="goals-banner">
        <div className="goals-banner-profile">
          <div className="goals-banner-avatar">
            {displayName[0].toUpperCase()}
          </div>
          <div>
            <p className="goals-banner-title">You're doing great, {displayName}</p>
            <p className="goals-banner-sub">
              Keep stacking XP streaks. The more consistent you are, the larger your rewards.
            </p>
          </div>
        </div>
        <div className="goals-banner-stats">
          <div>
            <p className="goals-banner-label">XP banked</p>
            <p className="goals-banner-value">{xp?.toLocaleString() ?? 0}</p>
          </div>
          <div>
            <p className="goals-banner-label">Habits tracked</p>
            <p className="goals-banner-value">{habits.length}</p>
          </div>
          <div>
            <p className="goals-banner-label">Badges</p>
            <p className="goals-banner-value">{badges.length}</p>
          </div>
        </div>
        <button className="goals-banner-cta" onClick={() => setShowModal(true)}>
          <span>Keep earning</span>
          <span aria-hidden>→</span>
        </button>
      </section>

      <section className="goals-gameboard">
        <article className="xp-board">
          <div className="xp-board-head">
            <p>XP bank</p>
            <span className="xp-level">Level {xpLevel}</span>
          </div>
          <h3 className="xp-value">{xp?.toLocaleString() ?? 0} XP</h3>
          <p className="xp-note">
            Earn {xpToNext} XP to unlock the next badge and keep your streak strong.
          </p>
          <div className="xp-track">
            <div className="xp-track-fill" style={{ width: `${xpProgressPct}%` }}></div>
          </div>
          <div className="xp-board-meta">
            <div>
              <small>Badges</small>
              <strong>{tokenBadgesEarned}</strong>
            </div>
            <div>
              <small>Daily Adventures</small>
              <strong>{completedHabits}</strong>
            </div>
            <div>
              <small>Active quests</small>
              <strong>{habits.length}</strong>
            </div>
          </div>
        </article>

        <article className="quest-card">
          <div className="quest-card-head">
            <div>
              <p>Daily quests</p>
              <h3>{completedHabits}/{habits.length || 1} completed today</h3>
            </div>
            <span className="pill">Quest log</span>
          </div>
          <p className="quest-card-sub">
            Each completed habit earns XP, keeps your streak alive, and drops you closer to new badges.
          </p>
          <div className="quest-actions">
            <button className="goals-primary" onClick={() => setShowModal(true)}>
              Keep earning XP
            </button>
          </div>
        </article>
      </section>

      {/* moved to bottom */}

      {badgeToast && (
        <div className="badge-toast" role="status">
          <span className="badge-toast-icon">{badgeToast.icon || "🏅"}</span>
          <div>
            <p className="badge-toast-title">Badge earned!</p>
            <p className="badge-toast-copy">{badgeToast.title}</p>
          </div>
        </div>
      )}

      <section className="goals-badges">
        <div className="goals-badges-header">
          <h2>Badges</h2>
          <p>Track streak milestones and celebrate achievements.</p>
        </div>
        {badges.length ? (
          <div className="badges-grid">
            {badges.map((badge) => (
              <article className="badge-card" key={badge.id}>
                <span className="badge-icon">{badge.icon || "🏅"}</span>
                <div className="badge-copy">
                  <h3>{badge.title}</h3>
                  <p>{badge.description}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="badge-empty">
            Unlock your first badge by keeping a habit alive for 7 straight days.
          </p>
        )}
      </section>

      {loading ? (
        <div className="goals-card skeleton" aria-label="Loading habits"></div>
      ) : isEmpty ? (
        <div className="goals-card goals-empty">
          <div className="goals-illustration" aria-hidden>
            🎯
          </div>
          <div className="goals-empty-text">
            <h3>Ready to start a habit?</h3>
            <p>Set a simple daily or weekly quest to earn XP.</p>
          </div>
          <div className="goals-actions">
            <button className="goals-primary" onClick={() => setShowModal(true)}>
              Create your first habit →
            </button>
            <p className="goals-muted">Tip: start with one small, daily action.</p>
          </div>
        </div>
      ) : (
        <section className="daily-quest-section">
          <div className="daily-quest-header">
            <h2>Daily quest list</h2>
            <p>Complete these quests to stack streaks and collect badges.</p>
          </div>
          <div className="habits-grid">
            {habits.map((habit) => {
              const doneToday = isTodayCompleted(habit);
              return (
                <div className="habit-card" key={habit.habitId}>
                  <div className="habit-head">
                    <div className="habit-title-row">
                      <div>
                        <h3 className="habit-title">{habit.title}</h3>
                        <p className="habit-subtitle">
                          {habit.category ? habit.category.charAt(0).toUpperCase() + habit.category.slice(1) : "Personal"}
                        </p>
                      </div>
                    </div>
                    <div className="habit-streak">
                      <span>{habit.currentStreak || 0} day streak</span>
                      <small>Best {habit.longestStreak || 0}</small>
                    </div>
                  </div>
                  <p className="habit-desc">{habit.description || "No description."}</p>
                  <div className="habit-meta">
                    <span className="habit-chip">XP {habit.xpValue || 10}</span>
                    <span className="habit-chip">
                      {habit.frequency === "weekly"
                        ? `Weekly ${Array.isArray(habit.targetDays) ? habit.targetDays.join(", ") : ""}`
                        : "Daily"}
                    </span>
                    <span className="habit-quest-pill">Quest</span>
                  </div>
                  <button
                    className="habit-complete-btn"
                    onClick={() => handleCompleteHabit(habit.habitId)}
                    disabled={doneToday}
                  >
                    {doneToday ? "Completed today" : "Complete Today"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="zen-panel" id="zen-panel">
        <div className="zen-tabs">
          {[
            { key: "reset", label: "Reset week" },
            { key: "break", label: "I need a break" },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`zen-tab ${zenTab === tab.key ? "active" : ""}`}
              onClick={() => setZenTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="zen-content">
          {zenTab === "reset" ? (
            <>
              <p className="zen-title">Pause XP pressure for a fresh week</p>
              <p className="zen-body">
                Reset your streak progress and keep XP loss paused until Monday, perfect for recalibrating after a heavy stretch.
              </p>
              <button className="zen-btn neutral" onClick={handleResetWeek}>
                Reset week
              </button>
            </>
          ) : (
            <>
              <p className="zen-title">Take a gentle break</p>
              <p className="zen-body">
                Quiet mode mutes routine nudges and lets you breathe quietly without nagging XP meters.
              </p>
              <button className="zen-btn" onClick={handleBreak}>
                Activate break
              </button>
            </>
          )}
          {zenStatus && <p className="zen-status">{zenStatus}</p>}
        </div>
      </section>

      <HabitModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreateHabit}
      />
    </div>
  );
}
