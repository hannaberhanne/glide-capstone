import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { auth } from "../config/firebase.js";
import AlertBanner from "../components/AlertBanner.jsx";
import TaskModal from "../components/TaskModal.jsx";
import useTasks from "../hooks/useTasks";
import useUser from "../hooks/useUser";
import UpcomingPanel from "./dashboard/UpcomingPanel.jsx";
import DashboardRail from "./dashboard/DashboardRail.jsx";
import {
  buildStreakCalendar,
  formatDueForToday,
  formatEstimate,
  getDashboardTaskBuckets,
  getXpLevel,
  startOfDay,
  toDayKey,
} from "./dashboard/dashboardViewModel.js";
import "./DashboardPage.css";

function loadDismissedTaskIds(key) {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissedTaskIds(key, ids) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify([...ids]));
  } catch {
    // Ignore storage failures; dismissal can fall back to in-memory state.
  }
}

export default function DashboardPage() {
  const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
  const { user, xp, setXp, refreshUser } = useUser(API_URL);
  const { tasks, fetchTasks, addTask, updateTask, deleteTask, completeTask } = useTasks(API_URL);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [xpBursts, setXpBursts] = useState([]);
  const [banner, setBanner] = useState(null);
  const [railNote, setRailNote] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("glide_today_rail_note") || "";
  });
  const xpAnchorRef = useRef(null);
  const location = useLocation();

  const userRecord = Array.isArray(user) ? user[0] : user;
  const displayName =
    userRecord?.firstName || auth.currentUser?.displayName?.split(" ")[0] || "User";

  const today = useMemo(() => startOfDay(new Date()), []);
  const todayKey = useMemo(() => toDayKey(today), [today]);
  const dismissedStorageKey = useMemo(() => `dismissed_tasks_${todayKey}`, [todayKey]);
  const [dismissedTasks, setDismissedTasks] = useState(() =>
    loadDismissedTaskIds(`dismissed_tasks_${toDayKey(startOfDay(new Date()))}`)
  );
  const todayStr = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(new Date()),
    []
  );

  const {
    parseDueDate,
    incompleteTasks,
    todayTasks,
    upcomingTasks,
    completedTasks,
  } = useMemo(
    () =>
      getDashboardTaskBuckets({
        tasks: tasks.filter((task) => !dismissedTasks.has(task.taskId)),
        today,
      }),
    [tasks, dismissedTasks, today]
  );

  const xpModel = useMemo(() => getXpLevel(Number(xp) || 0), [xp]);
  const streakCalendar = useMemo(
    () => buildStreakCalendar({ completedTasks, today }),
    [completedTasks, today]
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return `Good morning, ${displayName}!`;
    if (hour < 17) return `Good afternoon, ${displayName}!`;
    return `Good evening, ${displayName}!`;
  }, []);

  const formatDue = (task) =>
    formatDueForToday({ task, parseDueDate, today, todayKey });

  useEffect(() => {
    if (!location.state?.streakData) return;

    const { loginStreak, alreadyLoggedInToday } = location.state.streakData;
    if (!alreadyLoggedInToday) {
      const message =
        loginStreak === 1
          ? "Streak started. Come back tomorrow to keep it going."
          : `${loginStreak}-day login streak. Keep it up.`;
      setBanner({ message, type: "success" });
    } else {
      setBanner({ message: "Welcome back.", type: "info" });
    }

    window.history.replaceState({}, document.title);
  }, [location.state]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("glide_today_rail_note", railNote);
  }, [railNote]);

  const openCreateModal = () => {
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleQuickAddTask = async (title, bucket = "today") => {
    const draftTitle = title.trim();
    if (!draftTitle) return;

    await addTask({
      title: draftTitle,
      category: "academic",
      priority: "medium",
      description: "",
      dueAt: bucket === "today" ? today.toISOString() : null,
      estimatedMinutes: 0,
      isComplete: false,
    });
    await fetchTasks();
  };

  const handleSubmitTask = async (payload) => {
    try {
      const estimatedMinutes =
        payload.estimatedMinutes !== undefined
          ? payload.estimatedMinutes
          : payload.estimatedTime !== undefined
            ? ((Number(payload.estimatedTime) <= 12
                ? Number(payload.estimatedTime) * 60
                : Number(payload.estimatedTime)) || 0)
            : 0;

      if (editingTask?.taskId) {
        await updateTask(editingTask.taskId, { ...payload, estimatedMinutes });
      } else {
        await addTask({ ...payload, isComplete: false, estimatedMinutes });
      }
      await fetchTasks();
      setShowTaskModal(false);
      setEditingTask(null);
    } catch (err) {
      console.error("Failed to save task:", err);
      alert(err?.message || "Failed to save task. Please try again.");
    }
  };

  const handleCompleteTask = async (taskId, sourceRect) => {
    try {
      const data = await completeTask(taskId);
      if (!data?.success) return;

      if (typeof data.newTotalXP === "number") {
        setXp(data.newTotalXP);
      }
      if (
        typeof window !== "undefined" &&
        sourceRect &&
        xpAnchorRef.current &&
        Number(data.xpGained) > 0
      ) {
        const targetRect = xpAnchorRef.current.getBoundingClientRect();
        const burstId = `${taskId}-${Date.now()}`;
        setXpBursts((prev) => [
          ...prev,
          {
            id: burstId,
            label: `+${Math.round(data.xpGained)} XP`,
            startX: sourceRect.left + sourceRect.width / 2,
            startY: sourceRect.top + sourceRect.height / 2,
            endX: targetRect.left + targetRect.width * 0.7,
            endY: targetRect.top + targetRect.height / 2,
          },
        ]);
        window.setTimeout(() => {
          setXpBursts((prev) => prev.filter((burst) => burst.id !== burstId));
        }, 950);
      }
      fetchTasks();
      refreshUser();
    } catch (err) {
      console.error("Failed to complete task:", err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await deleteTask(taskId);
    } catch (err) {
      console.error("Failed to delete task:", err);
      alert(err?.message || "Failed to delete task. Please try again.");
    }
  };

  const handleDismissTask = (taskId) => {
    setDismissedTasks((prev) => {
      const next = new Set(prev);
      next.add(taskId);
      saveDismissedTaskIds(dismissedStorageKey, next);
      return next;
    });
  };

  return (
    <div className="dash">
      {banner && (
        <AlertBanner
          message={banner.message}
          type={banner.type}
          onClose={() => setBanner(null)}
        />
      )}

      <header className="today-page-head" aria-labelledby="today-heading">
        <h1 className="today-sheet-title" id="today-heading">
          {greeting}
        </h1>
        <p className="today-sheet-date" aria-label="Today date">
          {todayStr}
        </p>
        <div className="today-page-icons" aria-hidden>
          <span className="today-page-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4" />
              <path
                d="M8 1.8v2M8 12.2v2M1.8 8h2M12.2 8h2M3.3 3.3l1.4 1.4M11.3 11.3l1.4 1.4M12.7 3.3l-1.4 1.4M4.7 11.3l-1.4 1.4"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="today-page-icon">
            <svg width="18" height="16" viewBox="0 0 18 16" fill="none">
              <path
                d="M4.2 11.8h7.5a3.1 3.1 0 0 0 .2-6.2 4 4 0 0 0-7.7 1.1A2.7 2.7 0 0 0 4.2 11.8Z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </header>

      <div className="today-surface">
        <div className="today-layout">
          <section className="today-sheet" aria-label="Today tasks">
            <UpcomingPanel
              todayTasks={todayTasks}
              upcomingTasks={upcomingTasks}
              hasAnyTasks={incompleteTasks.length > 0}
              onComplete={handleCompleteTask}
              onEdit={openEditModal}
              onDelete={handleDeleteTask}
              onDismiss={handleDismissTask}
              formatDue={formatDue}
              formatEstimate={formatEstimate}
              parseDueDate={parseDueDate}
              openCreateModal={openCreateModal}
              onQuickAdd={handleQuickAddTask}
            />
          </section>

          <DashboardRail
            level={xpModel.level}
            nextLevel={xpModel.level + 1}
            currentLevelXP={xpModel.currentLevelXP}
            xpProgressPct={xpModel.progress}
            streakCalendar={streakCalendar}
            railNote={railNote}
            onRailNoteChange={setRailNote}
            xpAnchorRef={xpAnchorRef}
          />
        </div>
      </div>

      <div className="today-xp-bursts" aria-hidden>
        {xpBursts.map((burst) => (
          <span
            key={burst.id}
            className="today-xp-burst"
            style={{
              "--xp-start-x": `${burst.startX}px`,
              "--xp-start-y": `${burst.startY}px`,
              "--xp-end-x": `${burst.endX}px`,
              "--xp-end-y": `${burst.endY}px`,
            }}
          >
            {burst.label}
          </span>
        ))}
      </div>

      <TaskModal
        open={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setEditingTask(null);
        }}
        onSubmit={handleSubmitTask}
        initialTask={editingTask}
      />
    </div>
  );
}
