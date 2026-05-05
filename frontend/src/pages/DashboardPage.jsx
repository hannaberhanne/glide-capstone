import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { auth } from "../config/firebase.js";
import AlertBanner from "../components/AlertBanner.jsx";
import TaskModal from "../components/TaskModal.jsx";
import useTasks from "../hooks/useTasks";
import useUser from "../hooks/useUser";
import useSchedule from "../hooks/useSchedule.js";
import { apiClient } from "../lib/apiClient.js";
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
    // session storage can fail. not worth breaking dismiss for.
  }
}

export default function DashboardPage() {
  const { user, xp, setXp, refreshUser, userLoading } = useUser();
  const { tasks, fetchTasks, addTask, updateTask, deleteTask, completeTask, loading } = useTasks();
  const {
    blocks: scheduleBlocks,
    fetchBlocks: fetchSchedule,
    completeBlock: completeScheduleBlock,
  } = useSchedule();

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [xpBursts, setXpBursts] = useState([]);
  const [banner, setBanner] = useState(null);
  const [railNote, setRailNote] = useState("");
  const [noteSaveState, setNoteSaveState] = useState("saved");
  const xpAnchorRef = useRef(null);
  const location = useLocation();
  const noteHydratedRef = useRef(false);
  const noteSaveTimeoutRef = useRef(null);
  const lastSavedNoteRef = useRef("");
  const noteSaveErrorShownRef = useRef(false);

  const userRecord = Array.isArray(user) ? user[0] : user;
  const displayName =
    userRecord?.firstName || auth.currentUser?.displayName?.split(" ")[0] || "";

  const today = useMemo(() => startOfDay(new Date()), []);
  const todayKey = useMemo(() => toDayKey(today), [today]);
  const dismissedStorageKey = useMemo(() => `dismissed_tasks_${todayKey}`, [todayKey]);
  const [dismissedTasks, setDismissedTasks] = useState(() =>
    loadDismissedTaskIds(`dismissed_tasks_${toDayKey(startOfDay(new Date()))}`)
  );
  const todayContext = useMemo(
    () => ({
      weekday: new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(today),
      date: new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" }).format(today),
    }),
    [today]
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
  const scheduledTaskBlockById = useMemo(() => {
    const entries = scheduleBlocks
      .filter((block) => block.type !== "break" && block.status !== "completed" && block.taskId)
      .map((block) => [block.taskId, block]);
    return new Map(entries);
  }, [scheduleBlocks]);
  const dashboardTodayTasks = useMemo(() => {
    return todayTasks.map((task) => {
      const block = scheduledTaskBlockById.get(task.taskId);
      return block
        ? { ...task, scheduledBlockId: block.blockId, scheduledStartTime: block.startTime, scheduledReasoning: block.reasoning }
        : task;
    });
  }, [todayTasks, scheduledTaskBlockById]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const name = displayName ? `, ${displayName}` : "";
    if (hour < 12) return `Good morning${name}!`;
    if (hour < 17) return `Good afternoon${name}!`;
    return `Good evening${name}!`;
  }, [displayName]);

  const formatDue = (task) =>
    task.scheduledStartTime || formatDueForToday({ task, parseDueDate, today, todayKey });

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
    if (userLoading) return;

    const storedNote =
      typeof window !== "undefined"
        ? window.localStorage.getItem("glide_today_rail_note") || ""
        : "";
    const nextNote = userRecord?.dashboardNote ?? storedNote;

    setRailNote(nextNote);
    lastSavedNoteRef.current = nextNote;
    noteHydratedRef.current = true;
    setNoteSaveState("saved");

    if (typeof window !== "undefined") {
      window.localStorage.setItem("glide_today_rail_note", nextNote);
    }
  }, [userLoading, userRecord?.dashboardNote]);

  useEffect(() => {
    if (!noteHydratedRef.current || userLoading || !auth.currentUser) return;

    if (typeof window !== "undefined") {
      window.localStorage.setItem("glide_today_rail_note", railNote);
    }

    if (railNote === lastSavedNoteRef.current) return;

    setNoteSaveState("saving");

    if (noteSaveTimeoutRef.current) {
      window.clearTimeout(noteSaveTimeoutRef.current);
    }

    noteSaveTimeoutRef.current = window.setTimeout(async () => {
      try {
        await apiClient.patch(`/api/users/${auth.currentUser.uid}`, { dashboardNote: railNote });
        lastSavedNoteRef.current = railNote;
        setNoteSaveState("saved");
        noteSaveErrorShownRef.current = false;
      } catch (err) {
        console.error("Failed to save dashboard note:", err);
        setNoteSaveState("error");
        if (!noteSaveErrorShownRef.current) {
          setBanner({ message: err?.message || "Failed to save your dashboard note.", type: "error" });
          noteSaveErrorShownRef.current = true;
        }
      }
    }, 400);

    return () => {
      if (noteSaveTimeoutRef.current) {
        window.clearTimeout(noteSaveTimeoutRef.current);
      }
    };
  }, [railNote, userLoading]);

  useEffect(() => {
    if (userLoading || !auth.currentUser) return;
    fetchSchedule(todayKey).catch((err) => {
      setBanner({ message: err?.message || "Failed to load today’s plan.", type: "error" });
    });
  }, [fetchSchedule, todayKey, userLoading]);

  if (loading || userLoading) {
    return (
      <div className="dash dash--loading glide-page" aria-label="Loading your workspace">
        <div className="dash-skeleton">
          <div className="skel skel-title" />
          <div className="skel skel-row" />
          <div className="skel skel-row" />
          <div className="skel skel-row skel-row--short" />
        </div>
      </div>
    );
  }

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

    const createdTask = await addTask({
      title: draftTitle,
      category: "",
      priority: "medium",
      description: "",
      dueAt: bucket === "today" ? today.toISOString() : null,
      estimatedMinutes: 0,
      isComplete: false,
    });
    await fetchTasks();
    setEditingTask(createdTask);
    setShowTaskModal(true);
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
      setBanner({ message: err?.message || "Failed to save task. Please try again.", type: "error" });
    }
  };

  const handleCompleteTask = async (taskId, sourceRect) => {
    try {
      const scheduledBlock = scheduledTaskBlockById.get(taskId);
      const data = scheduledBlock
        ? await completeScheduleBlock(scheduledBlock.blockId, todayKey)
        : await completeTask(taskId);
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
      setBanner({ message: err?.message || "Failed to delete task. Please try again.", type: "error" });
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
    <div className="dash glide-page">
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
        <div className="today-context" aria-label={`Today is ${todayContext.weekday}, ${todayContext.date}`}>
          <span className="today-context-mark" aria-hidden>
            <svg width="19" height="19" viewBox="0 0 19 19" fill="none">
              <path d="M9.5 3.1v1.7M9.5 14.2v1.7M3.1 9.5h1.7M14.2 9.5h1.7M5 5l1.2 1.2M12.8 12.8 14 14M14 5l-1.2 1.2M6.2 12.8 5 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="9.5" cy="9.5" r="2.6" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </span>
          <span className="today-context-copy">
            <span>{todayContext.weekday}</span>
            <strong>{todayContext.date}</strong>
          </span>
        </div>
      </header>

      <div className="today-surface">
        <div className="today-layout">
          <section className="today-sheet" aria-label="Today tasks">
            <UpcomingPanel
              todayTasks={dashboardTodayTasks}
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
            xpForNext={xpModel.xpForNext}
            xpToNext={xpModel.xpToNext}
            xpProgressPct={xpModel.progress}
            streakCalendar={streakCalendar}
            railNote={railNote}
            noteSaveState={noteSaveState}
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
