import { useMemo, useState } from "react";
import { auth } from "../config/firebase.js";
import "./DashboardPage.css";
import DashboardHero from "./dashboard/DashboardHero.jsx";
import UpcomingPanel from "./dashboard/UpcomingPanel.jsx";
import TaskModal from "../components/TaskModal.jsx";
import Calendar from "./dashboard/Calendar";
import useTasks from "../hooks/useTasks";
import useUser from "../hooks/useUser";
import useCanvasStatus from "../hooks/useCanvasStatus";

export default function DashboardPage() {
  const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
  const { user, xp, setXp, refreshUser } = useUser(API_URL);
  const { tasks, fetchTasks, addTask, updateTask, deleteTask, completeTask } = useTasks(API_URL);
  const { canvasStatus, statusLoading } = useCanvasStatus(API_URL);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [streak] = useState(4);

  const userRecord = Array.isArray(user) ? user[0] : user;
  const displayName =
    userRecord?.firstName ||
    auth.currentUser?.displayName?.split(" ")[0] ||
    "User";

  const todayStr = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(new Date()),
    []
  );

  const parseDueDate = (t) => {
    if (!t.dueAt) return null;
    if (typeof t.dueAt === "object" && t.dueAt.seconds) {
      return new Date(t.dueAt.seconds * 1000);
    }
    const d = new Date(t.dueAt);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatDue = (t) => {
    const d = parseDueDate(t);
    if (!d) return "No due date";
    return d.toLocaleString();
  };

  const canvasConnected = !!canvasStatus?.hasToken;
  const canvasLabel = (() => {
    if (statusLoading) return "Checking Canvas...";
    if (!canvasConnected || !canvasStatus?.lastSync) return "Canvas not connected";
    const raw = canvasStatus.lastSync;
    const d = raw?.seconds ? new Date(raw.seconds * 1000) : new Date(raw);
    return isNaN(d.getTime()) ? "Canvas synced" : `Canvas synced ${d.toLocaleDateString()}`;
  })();

  const todayTasks = useMemo(() => {
    return tasks.filter((t) => {
      const d = parseDueDate(t);
      if (!d) return false;
      const today = new Date();
      return d.toDateString() === today.toDateString();
    }).length;
  }, [tasks]);

  const openCreateModal = () => {
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleSubmitTask = async (payload) => {
    try {
      if (editingTask?.taskId) {
        await updateTask(editingTask.taskId, {
          ...payload,
          estimatedMinutes:
            payload.estimatedMinutes !== undefined
              ? payload.estimatedMinutes
              : payload.estimatedTime !== undefined
                ? ((Number(payload.estimatedTime) <= 12 ? Number(payload.estimatedTime) * 60 : Number(payload.estimatedTime)) || 0)
                : 0,
        });
      } else {
        await addTask({
          ...payload,
          isComplete: false,
          estimatedMinutes:
            payload.estimatedMinutes !== undefined
              ? payload.estimatedMinutes
              : payload.estimatedTime !== undefined
                ? ((Number(payload.estimatedTime) <= 12 ? Number(payload.estimatedTime) * 60 : Number(payload.estimatedTime)) || 0)
                : 0,
        });
      }
      setShowTaskModal(false);
      setEditingTask(null);
    } catch (err) {
      console.error("Failed to save task:", err);
      alert("Failed to save task. Please try again.");
    }
  };

  const handleQuickAdd = async (payload) => {
    try {
      await addTask(payload);
    } catch (err) {
      console.error("Failed to add task:", err);
      alert("Failed to add task. Please try again.");
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await deleteTask(taskId);
    } catch (err) {
      console.error("Failed to delete task:", err);
      alert("Failed to delete task. Please try again.");
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      const data = await completeTask(taskId);
      if (data?.success) {
        if (typeof data.newTotalXP === "number") {
          setXp(data.newTotalXP);
        }
        fetchTasks();
        refreshUser();
      }
    } catch (err) {
      console.error("Failed to complete task:", err);
    }
  };

  return (
    <div className="dash">
      <DashboardHero
        todayStr={todayStr}
        displayName={displayName}
        canvasLabel={canvasLabel}
        canvasConnected={canvasConnected}
        statusLoading={statusLoading}
      />

      

      

      <UpcomingPanel
        tasks={tasks}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        onQuickAdd={handleQuickAdd}
        onComplete={handleCompleteTask}
        onEdit={openEditModal}
        onDelete={handleDeleteTask}
        formatDue={formatDue}
        openCreateModal={openCreateModal}
      />

      <TaskModal
        open={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setEditingTask(null);
        }}
        onSubmit={handleSubmitTask}
        initialTask={editingTask}
      />

      <Calendar/>

    </div>
  );
}
