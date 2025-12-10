import { useCallback, useEffect, useRef, useState } from "react";
import { auth } from "../config/firebase";
import useUser from "../hooks/useUser";
import "./GoalsPage.css";

export default function GoalsPage() {
  const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
  const { xp, setXp, refreshUser } = useUser(API_URL);
  const [habits, setHabits] = useState([]);
  const [dailies, setDailies] = useState([]);
  const [badgeToast, setBadgeToast] = useState(null);
  const [zenTab, setZenTab] = useState("reset");
  const zenPanelRef = useRef(null);
  const [activeAction, setActiveAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState("");
  const [formFields, setFormFields] = useState({ title: "", description: "" });
  const scrollToZenPanel = (tab = "reset") => {
    setZenTab(tab);
    if (zenPanelRef.current) {
      zenPanelRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };
  const parseHabits = useCallback(async () => {
    if (!auth.currentUser) return;
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
    }
  }, [API_URL]);

  useEffect(() => {
    parseHabits();
  }, [parseHabits]);

  const fetchTasks = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const filtered = Array.isArray(data)
        ? data.filter((task) => (task.category || "").toLowerCase() === "daily")
        : [];
      setDailies(filtered);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (!badgeToast) return undefined;
    const id = setTimeout(() => setBadgeToast(null), 3600);
    return () => clearTimeout(id);
  }, [badgeToast]);

  const xpLevel = Math.floor((xp || 0) / 100) + 1;
  const xpTarget = 600;
  const xpPct = Math.min(((xp || 0) / xpTarget) * 100, 100);
  const completedHabits = habits.filter(
    (h) =>
      Array.isArray(h.completionHistory) &&
      h.completionHistory.includes(new Date().toISOString().slice(0, 10))
  ).length;
  const zenStatus =
    zenTab === "reset" ? "Reset week scheduled" : "Break mode active";

  const toggleAction = (type) => {
    setActiveAction((prev) => (prev === type ? null : type));
    setFormFields({ title: "", description: "" });
    setActionNotice("");
  };

  const closeAction = () => {
    setActiveAction(null);
    setFormFields({ title: "", description: "" });
  };

  const handleFormChange = (field, value) => {
    setFormFields((prev) => ({ ...prev, [field]: value }));
  };

  const submitHabit = async () => {
    if (!formFields.title.trim()) {
      setActionNotice("Give this habit a title.");
      return;
    }
    if (!auth.currentUser) return;
    setActionLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/habits`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formFields.title.trim(),
          description: formFields.description.trim(),
          xpValue: 12,
        }),
      });
      if (!res.ok) throw new Error("Unable to save habit");
      await parseHabits();
      setActionNotice("Habit saved.");
      closeAction();
    } catch (err) {
      console.error(err);
      setActionNotice("Failed to add habit.");
    } finally {
      setActionLoading(false);
      refreshUser();
    }
  };

  const submitDaily = async () => {
    if (!formFields.title.trim()) {
      setActionNotice("Give this daily a title.");
      return;
    }
    if (!auth.currentUser) return;
    setActionLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/tasks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formFields.title.trim(),
          description: formFields.description.trim(),
          category: "daily",
          xpValue: 8,
        }),
      });
      if (!res.ok) throw new Error("Unable to add daily");
      const created = await res.json();
      setDailies((prev) => [created, ...prev]);
      setActionNotice("Daily added.");
      closeAction();
    } catch (err) {
      console.error(err);
      setActionNotice("Failed to add daily.");
    } finally {
      setActionLoading(false);
      refreshUser();
    }
  };

  const completeDaily = async (taskId) => {
    if (!auth.currentUser) return;
    setActionLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/tasks/${taskId}/complete`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Unable to mark complete");
      const payload = await res.json();
      if (payload.newTotalXP !== undefined) {
        setXp(payload.newTotalXP);
      }
      setActionNotice("Daily completed!");
      fetchTasks();
    } catch (err) {
      console.error(err);
      setActionNotice("Failed to mark complete.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="goals">
      <div className="goals-inner">
        <header className="goals-hero">
          <div>
            <p className="goals-kicker">Habits & Quests</p>
            <h1 className="goals-title">Play nicer with your habits</h1>
            <p className="goals-sub">
              Manage streaks, XP, and quest style routines all in one calm dashboard.
            </p>
          </div>
          <div className="goals-hero-actions">
            <button className="goals-primary">Keep earning XP</button>
            <button className="goals-secondary" onClick={() => scrollToZenPanel("reset")}>
              Reset week
            </button>
          </div>
        </header>

        <section className="xp-board">
          <header>
            <h3>XP bank</h3>
            <span>Level {xpLevel}</span>
          </header>
          <div className="xp-progress">
            <div className="xp-fill" style={{ width: `${xpPct}%` }} />
          </div>
          <p>{completedHabits} quests done today</p>
        </section>

        <section className="goals-toolbar">
          <div className="goals-actions">
            <button type="button" onClick={() => toggleAction("habit")}>
              + Add habit
            </button>
            <button type="button" onClick={() => toggleAction("daily")}>
              + Add daily
            </button>
          </div>
        </section>

        {!activeAction && actionNotice && (
          <p className="action-status">{actionNotice}</p>
        )}

        {activeAction && (
          <section className="quick-form">
            <div className="quick-form-text">
              <h4>{activeAction === "habit" ? "New habit" : "New daily"}</h4>
              <p>
                {activeAction === "habit"
                  ? "Habits repeat automatically. Build consistent behavior."
                  : "Dailies reset every day—finish one to reel in XP."}
              </p>
            </div>
            <div className="quick-form-fields">
              <input
                value={formFields.title}
                onChange={(evt) => handleFormChange("title", evt.target.value)}
                placeholder="Title"
              />
              <textarea
                value={formFields.description}
                onChange={(evt) => handleFormChange("description", evt.target.value)}
                placeholder="Description (optional)"
                rows={2}
              />
              <div className="quick-form-actions">
                <button
                  type="button"
                  className="goals-primary"
                  onClick={activeAction === "habit" ? submitHabit : submitDaily}
                  disabled={actionLoading}
                >
                  {actionLoading
                    ? "Saving..."
                    : activeAction === "habit"
                    ? "Create habit"
                    : "Add daily"}
                </button>
                <button
                  type="button"
                  className="goals-secondary"
                  onClick={closeAction}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
            {actionNotice && <p className="action-notice">{actionNotice}</p>}
          </section>
        )}

        <section className="card-columns">
          <div className="card-column">
            <h2>Habits</h2>
            <div className="primary-card">
              <p>100 XP</p>
              <p>Habits that keep your streak alive.</p>
            </div>
            {(habits.length
              ? habits
              : [{ title: "Build a habit", description: "Add tasks to earn XP" }]).map((habit) => (
              <div className="habit-card" key={habit.habitId || habit.title}>
                <div>
                  <h3>{habit.title || "Untitled habit"}</h3>
                  <p>{habit.description || "Daily actions track XP."}</p>
                </div>
                <span className="habit-chip">XP {habit.xpValue || 10}</span>
              </div>
            ))}
          </div>
          <div className="card-column">
            <h2>Dailies</h2>
            <div className="secondary-card">
              Set repeating quests for each day.
            </div>
            <div className="daily-stack">
              {dailies.length ? (
                dailies.map((daily) => (
                  <div key={daily.taskId} className="daily-card">
                    <div>
                      <h3>{daily.title}</h3>
                      <p>{daily.description || "No extra details."}</p>
                      <small>{daily.xpValue ? `${daily.xpValue} XP` : "XP pending"}</small>
                    </div>
                    <button
                      type="button"
                      className="daily-complete"
                      onClick={() => completeDaily(daily.taskId)}
                      disabled={daily.isComplete || actionLoading}
                    >
                      {daily.isComplete ? "Done" : "Mark done"}
                    </button>
                  </div>
                ))
              ) : (
                <p className="empty-note">Create a daily to see it here.</p>
              )}
            </div>
          </div>
          <div className="card-column">
            <h2>Rewards</h2>
            <div className="reward-grid">
              {Array.from({ length: 6 }, (_, idx) => (
                <div key={idx} className="reward-card">
                  <p>Gems</p>
                  <span>⚒️</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="zen-panel" id="zen-panel" ref={zenPanelRef}>
          <div className="zen-tabs">
            <button className={`zen-tab ${zenTab === "reset" ? "active" : ""}`} onClick={() => setZenTab("reset")}>
              Reset week
            </button>
            <button className={`zen-tab ${zenTab === "break" ? "active" : ""}`} onClick={() => setZenTab("break")}>
              I need a break
            </button>
          </div>
          <div>
            <p className="zen-title">{zenTab === "reset" ? "Pause the pressure" : "Quiet for the day"}</p>
            <p className="zen-body">Glide+ will ease notifications and keep your XP intact.</p>
            <button className="zen-btn">{zenTab === "reset" ? "Reset week" : "Activate break"}</button>
            <p className="zen-status">{zenStatus}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
