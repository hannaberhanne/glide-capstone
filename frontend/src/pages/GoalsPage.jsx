import { useEffect, useState, useCallback } from "react";
import { LuTarget, LuPlus } from "react-icons/lu";
import "./GoalsPage.css";
import AddGoal from "../components/AddGoal.jsx";
import EditGoal from "../components/EditGoal.jsx";
import AlertBanner from "../components/AlertBanner";
import { auth } from "../config/firebase.js";
import useUser from "../hooks/useUser.js";
import { computeBadges } from "../utils/badgeSystem.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const TODAY = new Date().toISOString().slice(0, 10);
const MS_PER_DAY = 86400000;

function streakFontSize(n) {
  if (n === 0) return 32;
  if (n < 7)  return 40;
  if (n < 14) return 48;
  if (n < 21) return 54;
  return 64;
}

function computeTrend(history) {
  if (!Array.isArray(history) || history.length === 0) return null;
  const now = Date.now();
  const count = (min, max) => history.filter(d => {
    const diff = (now - new Date(d).getTime()) / MS_PER_DAY;
    return diff >= min && diff < max;
  }).length;
  const hasHistory = history.some(d => (now - new Date(d).getTime()) / MS_PER_DAY >= 7);
  if (!hasHistory) return null;
  const delta = count(0, 7) - count(7, 14);
  return { dir: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat', delta: Math.abs(delta) };
}

function GoalHeatmap({ completionHistory, color }) {
  if (!Array.isArray(completionHistory) || completionHistory.length === 0) return null;
  const weeks = [[], [], []];
  for (let i = 20; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    weeks[Math.floor((20 - i) / 7)].push({
      key,
      filled: completionHistory.includes(key),
      isToday: i === 0,
    });
  }
  return (
    <div className="goal-heatmap">
      {weeks.map((week, wi) => (
        <div key={wi} className="goal-heatmap-week">
          {week.map(({ key, filled, isToday }) => (
            <span
              key={key}
              className="goal-heatmap-dot"
              style={
                filled ? { background: color }
                : isToday ? { boxShadow: `inset 0 0 0 2px ${color}` }
                : {}
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function BadgeItem({ badge, locked }) {
  return (
    <div className={`badge-item${locked ? " badge-item--locked" : ""}`} title={badge.description}>
      <div className="badge-item-svg" dangerouslySetInnerHTML={{ __html: badge.svg }} />
      <span className="badge-item-label">{badge.label}</span>
      {locked && <span className="badge-item-hint">{badge.description}</span>}
    </div>
  );
}

function GoalCard({ goal, onDelete, onEdit, onTaskComplete, mountDelay }) {
  const tasks = goal.taskDetails || [];
  const streak = goal.streak || 0;
  const longest = goal.longestStreak || 0;
  const [floats, setFloats] = useState([]);
  const [pending, setPending] = useState(null);
  const [glowing, setGlowing] = useState(false);

  const undone = tasks.filter(t => t.lastCompleted !== TODAY);
  const done   = tasks.filter(t => t.lastCompleted === TODAY);
  const pct    = tasks.length > 0 ? Math.round((done.length / tasks.length) * 100) : 0;
  const trend  = computeTrend(goal.completionHistory);
  const isPB   = streak > 0 && streak >= longest;
  const is21   = streak >= 21;

  const handleMark = async (e, task) => {
    e.stopPropagation();
    if (task.lastCompleted === TODAY || pending === task.taskId) return;
    setPending(task.taskId);
    const xp = await onTaskComplete(task);
    setPending(null);
    if (xp) {
      const id = Date.now();
      setFloats(f => [...f, { id, xp }]);
      setTimeout(() => setFloats(f => f.filter(fl => fl.id !== id)), 700);
      setGlowing(true);
      setTimeout(() => setGlowing(false), 600);
    }
  };

  return (
    <div
      className={`goal-card${glowing ? ' goal-card--glow' : ''}`}
      style={{
        borderTopColor: goal.color,
        backgroundColor: `${goal.color}1c`,
        animationDelay: `${mountDelay}ms`,
      }}
      onClick={() => onEdit(goal)}
    >
      {floats.map(f => (
        <span key={f.id} className="xp-float" style={{ color: goal.color }}>
          +{f.xp} XP
        </span>
      ))}

      <button
        type="button"
        className="goal-delete-btn"
        onClick={e => { e.stopPropagation(); onDelete(goal.goalId); }}
        aria-label={`Delete ${goal.title}`}
      >×</button>

      <div className={`goal-card-top${streak === 0 ? ' goal-card-top--no-streak' : ''}`}>
        <div className="goal-card-left">
          <h3 className="goal-card-title">{goal.title}</h3>

          {tasks.length > 0 && (
            <div className="goal-progress-row">
              <div className="goal-progress-track">
                <div
                  className="goal-progress-fill"
                  style={{ width: `${pct}%`, background: goal.color }}
                />
              </div>
              <span className="goal-progress-frac">{done.length}/{tasks.length}</span>
              {trend && (
                <span className={`goal-trend goal-trend--${trend.dir}`}>
                  {trend.dir === 'up' ? '↑' : trend.dir === 'down' ? '↓' : '—'}
                  {trend.delta > 0 && trend.dir !== 'flat' ? ` ${trend.delta}` : ''}
                </span>
              )}
            </div>
          )}

          <GoalHeatmap completionHistory={goal.completionHistory} color={goal.color} />
        </div>

        {streak > 0 && (
          <div className="goal-card-streak">
            {isPB && <span className="goal-pb-badge">BEST</span>}
            <span
              className={`goal-streak-num${is21 ? ' goal-streak-num--pulse' : ''}`}
              style={{ fontSize: streakFontSize(streak), color: goal.color }}
            >
              {streak}
            </span>
            <span className="goal-streak-unit">DAY STREAK</span>
            {longest > streak && (
              <span className="goal-streak-record">↑ {longest} record</span>
            )}
          </div>
        )}
      </div>

      {tasks.length > 0 && (
        <ul className="goal-task-list">
          {undone.map(task => (
            <li
              key={task.taskId || task.title}
              className="goal-task-item"
              onClick={e => handleMark(e, task)}
            >
              <span className="goal-task-mark" style={{ color: goal.color }}>
                {pending === task.taskId ? '·' : '—'}
              </span>
              <span className="goal-task-name">{task.title}</span>
            </li>
          ))}
          {done.length > 0 && undone.length > 0 && (
            <li className="goal-task-sep" />
          )}
          {done.map(task => (
            <li key={task.taskId || task.title} className="goal-task-item goal-task-item--done">
              <span className="goal-task-mark" style={{ color: goal.color }}>✓</span>
              <span className="goal-task-name">{task.title}</span>
            </li>
          ))}
        </ul>
      )}

      <span className="goal-edit-hint" style={{ color: goal.color }}>Edit →</span>
    </div>
  );
}

function TodayBar({ goals }) {
  const all  = goals.flatMap(g => g.taskDetails || []);
  const done = all.filter(t => t.lastCompleted === TODAY).length;
  if (all.length === 0 || done === 0) return null;
  const pct     = Math.round((done / all.length) * 100);
  const allDone = done === all.length;
  return (
    <div className="today-bar">
      <div className="today-bar-track">
        <div
          className={`today-bar-fill${allDone ? ' today-bar-fill--done' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="today-bar-text">
        {allDone ? 'All done today ✓' : `${done} / ${all.length} today`}
      </span>
    </div>
  );
}

function EmptyGoals({ onAdd }) {
  return (
    <div className="goals-empty glide-empty">
      <div className="goals-empty-icon-wrap">
        <LuTarget size={28} />
      </div>
      <h2 className="goals-empty-heading">No goals yet</h2>
      <p className="goals-empty-sub">
        Create your first goal to start tracking progress and earning XP.
      </p>
      <button type="button" className="goals-empty-cta glide-btn glide-btn--primary" onClick={onAdd}>
        Create your first goal
      </button>
    </div>
  );
}

export default function GoalsPage() {
  const { user, xp } = useUser();
  const [quote, setQuote]         = useState(null);
  const [banner, setBanner]       = useState(null);
  const [goals, setGoals]         = useState([]);
  const [tasks, setTasks]         = useState([]);
  const [showAdd, setShowAdd]     = useState(false);
  const [editing, setEditing]     = useState(null);

  const level         = user?.level ?? 0;
  const currentStreak = goals.length ? Math.max(...goals.map(g => g.streak || 0)) : 0;
  const bestStreak    = goals.length ? Math.max(...goals.map(g => g.longestStreak || 0)) : 0;
  const hasNoStreak   = currentStreak === 0 && bestStreak === 0;
  const { earned, locked } = computeBadges({ xp, level, goals, tasks });

  const allTasks  = goals.flatMap(g => g.taskDetails || []);
  const doneToday = allTasks.filter(t => t.lastCompleted === TODAY).length;
  const showDot   = allTasks.length > 0 && doneToday === allTasks.length;

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/quotes`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setQuote(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async user => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [gr, tr] = await Promise.all([
          fetch(`${API_BASE_URL}/api/goals`, { headers, credentials: "include" }),
          fetch(`${API_BASE_URL}/api/tasks`, { headers, credentials: "include" }),
        ]);
        const [gd, td] = await Promise.all([gr.json(), tr.json()]);
        if (!gr.ok) throw new Error(gd.error);
        if (!tr.ok) throw new Error(td.error);
        setTasks(td);
        setGoals(gd.map(g => ({ ...g, taskDetails: td.filter(t => t.goalId === g.goalId) })));
      } catch (err) {
        console.error(err);
        setBanner({ message: "Error loading goals", type: "error" });
      }
    });
    return () => unsub();
  }, []);

  const handleTaskComplete = useCallback(async task => {
    try {
      const token = await auth.currentUser?.getIdToken();
      // Goal tasks use lastCompleted for daily reset — don't use /complete (sets isComplete permanently)
      const res = await fetch(`${API_BASE_URL}/api/tasks/${task.taskId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ lastCompleted: TODAY }),
      });
      if (!res.ok) return null;
      setGoals(prev => prev.map(g => {
        if (g.goalId !== task.goalId) return g;
        return {
          ...g,
          taskDetails: (g.taskDetails || []).map(t =>
            t.taskId === task.taskId ? { ...t, lastCompleted: TODAY } : t
          ),
        };
      }));
      return task.xpValue || 10;
    } catch (err) {
      console.error("Complete task error:", err);
      return null;
    }
  }, []);

  const refreshTasks = async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;
    const res = await fetch(`${API_BASE_URL}/api/tasks`, {
      headers: { Authorization: `Bearer ${token}` }, credentials: "include",
    });
    const td = await res.json();
    if (!res.ok) return;
    setTasks(td);
    setGoals(prev => prev.map(g => ({ ...g, taskDetails: td.filter(t => t.goalId === g.goalId) })));
  };

  const handleGoalCreated = g => {
    setGoals(prev => [...prev, { ...g, taskDetails: [] }]);
    setBanner({ message: "Goal created." });
    setShowAdd(false);
  };

  const handleGoalUpdated = async g => {
    await refreshTasks();
    setGoals(prev => prev.map(p =>
      p.goalId === g.goalId ? { ...g, taskDetails: tasks.filter(t => t.goalId === g.goalId) } : p
    ));
    setBanner({ message: "Goal updated." });
    setEditing(null);
  };

  const handleDelete = async id => {
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/goals/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || d.message);
      setGoals(prev => prev.filter(g => g.goalId !== id));
      setBanner({ message: "Goal deleted." });
    } catch (err) {
      setBanner({ message: err.message || "Error deleting goal", type: "error" });
    }
  };

  const quoteText = quote?.text
    ? quote.text.replace(/^["'"'“‘]+|["'"'”’]+$/g, '').trim()
    : null;

  return (
    <>
      <div className="goals-page glide-page">
        <header className="goals-header glide-page-header">
          <div>
            <div className="goals-title-row">
              {showDot && <span className="goals-done-dot" />}
              <h1 className="goals-title glide-page-title">Goals</h1>
            </div>
            {quoteText && (
              <p className="goals-quote">{quoteText} — {quote.author}</p>
            )}
          </div>
          <button type="button" className="goals-new-btn glide-btn glide-btn--primary" onClick={() => setShowAdd(true)}>
            + New Goal
          </button>
        </header>

        <div className="goals-body glide-main-rail-layout">
          <div className="goals-main">
            <div className="goals-section-row">
              <p className="goals-section-label">
                <LuTarget size={12} />
                {goals.length} {goals.length === 1 ? 'Goal' : 'Goals'}
                {doneToday > 0 && (
                  <span className="goals-section-done"> · {doneToday} done today</span>
                )}
              </p>
            </div>

            <TodayBar goals={goals} />

            {goals.length === 0 ? (
              <EmptyGoals onAdd={() => setShowAdd(true)} />
            ) : (
              <div className={`goals-list glide-two-card-grid${goals.length % 2 === 1 ? " goals-list--odd" : ""}`}>
                {goals.map((goal, idx) => (
                  <GoalCard
                    key={goal.goalId}
                    goal={goal}
                    onDelete={handleDelete}
                    onEdit={setEditing}
                    onTaskComplete={handleTaskComplete}
                    mountDelay={idx * 60}
                  />
                ))}
              </div>
            )}
          </div>

          <aside className="goals-rail">
            <div className="rail-panel glide-panel">
              <p className="rail-label">Streak</p>
              {hasNoStreak ? (
                <p className="rail-no-streak">Complete a goal to start your streak.</p>
              ) : (
                <div className="rail-streaks">
                  <div className="rail-streak-block">
                    <span className="rail-streak-num rail-streak-current">{currentStreak}</span>
                    <span className="rail-streak-tag">Current</span>
                  </div>
                  <div className="rail-streak-divider" />
                  <div className="rail-streak-block">
                    <span className="rail-streak-num rail-streak-best">{bestStreak}</span>
                    <span className="rail-streak-tag">Best</span>
                  </div>
                </div>
              )}
            </div>

            <div className="rail-panel glide-panel">
              <p className="rail-label">
                Badges
                {earned.length > 0 && (
                  <span className="rail-badge-count">{earned.length}</span>
                )}
              </p>
              {earned.length > 0 && (
                <div className="badge-grid">
                  {earned.map(b => <BadgeItem key={b.id} badge={b} locked={false} />)}
                </div>
              )}
              {locked.length > 0 && (
                <div className="badge-grid badge-grid--locked">
                  {locked.map(b => <BadgeItem key={b.id} badge={b} locked={true} />)}
                </div>
              )}
              {earned.length === 0 && locked.length === 0 && (
                <p className="rail-no-streak">Complete goals and build streaks to earn badges.</p>
              )}
            </div>
          </aside>
        </div>
      </div>

      {showAdd  && <AddGoal onClose={() => setShowAdd(false)} onGoalCreated={handleGoalCreated} />}
      {editing  && <EditGoal goal={editing} onClose={() => setEditing(null)} onGoalUpdated={handleGoalUpdated} />}
      {banner   && <AlertBanner message={banner.message} type={banner.type} onClose={() => setBanner(null)} />}
    </>
  );
}
