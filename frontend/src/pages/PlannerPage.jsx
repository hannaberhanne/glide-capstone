import { useEffect, useMemo, useReducer, useState } from "react";
import { auth } from "../config/firebase.js";
import TaskModal from "../components/TaskModal.jsx";
import useTasks from "../hooks/useTasks";
import PlannerHud from "./planner/PlannerHud.jsx";
import PlannerSidebar from "./planner/PlannerSidebar.jsx";
import PlannerGrid from "./planner/PlannerGrid.jsx";
import AssistOverlay from "./planner/AssistOverlay.jsx";
import {
  addMonths,
  buildPlannerViewModel,
  dayKey,
  monthKey,
  parseMaybeDate,
  isTaskCompleteForToday,
  startOfDay,
  startOfMonth,
} from "./planner/plannerViewModel.js";
import {
  createPlannerEvent,
  createPlannerMachineState,
  getInteractionLocks,
  PLANNER_EVENT_TYPES,
  plannerReducer,
} from "./planner/plannerStateMachine.js";
import "./PlannerPage.css";

function mergeDateWithExistingTime(targetDate, currentDueAt) {
  const next = startOfDay(targetDate);
  const existing = parseMaybeDate(currentDueAt);
  if (existing) {
    next.setHours(existing.getHours(), existing.getMinutes(), 0, 0);
  } else {
    next.setHours(12, 0, 0, 0);
  }
  return next.toISOString();
}

export default function PlannerPage() {
  const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
  const today = useMemo(() => startOfDay(new Date()), []);
  const [cursor, setCursor] = useState(() => startOfMonth(today));
  const [assistSuggestions, setAssistSuggestions] = useState([]);
  const [assistSummary, setAssistSummary] = useState("");
  const [assistLoading, setAssistLoading] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [dragHoverDayKey, setDragHoverDayKey] = useState(null);
  const [overflowBusy, setOverflowBusy] = useState(false);
  const [overflowToast, setOverflowToast] = useState("");
  const { tasks, loading, fetchTasks, addTask, updateTask, completeTask } = useTasks(API_URL);

  const [plannerState, dispatch] = useReducer(
    plannerReducer,
    createPlannerMachineState({
      monthKey: monthKey(cursor),
      selectedDayKey: dayKey(today),
      selectedDayOverflowCount: 0,
    })
  );

  const viewModel = useMemo(
    () =>
      buildPlannerViewModel({
        tasks,
        cursor,
        today,
        selectedDayKey: plannerState.selectedDayKey || dayKey(today),
        assistSuggestions,
      }),
    [tasks, cursor, today, plannerState.selectedDayKey, assistSuggestions]
  );

  const interactionLocks = useMemo(() => getInteractionLocks(plannerState), [plannerState]);

  useEffect(() => {
    dispatch(
      createPlannerEvent(PLANNER_EVENT_TYPES.HYDRATE_MONTH, {
        monthKey: viewModel.monthKey,
        selectedDayKey: viewModel.selectedDay.key,
        selectedDayOverflowCount: viewModel.selectedDay.overflowTasks.length,
      })
    );
  }, [viewModel.monthKey, viewModel.selectedDay.key, viewModel.selectedDay.overflowTasks.length]);

  useEffect(() => {
    if (!overflowToast) return undefined;
    const timeout = window.setTimeout(() => setOverflowToast(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [overflowToast]);

  const openCreateModal = () => {
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleSubmitTask = async (payload) => {
    const baseBody = {
      title: payload.title,
      description: payload.description || "",
      dueAt: payload.dueAt || null,
      estimatedMinutes:
        payload.estimatedMinutes !== undefined
          ? payload.estimatedMinutes
          : payload.estimatedTime !== undefined
            ? ((Number(payload.estimatedTime) <= 12
                ? Number(payload.estimatedTime) * 60
                : Number(payload.estimatedTime)) || 0)
            : 0,
      priority: payload.priority || "medium",
      category: payload.category || "academic",
    };

    try {
      if (editingTask?.taskId) {
        await updateTask(editingTask.taskId, baseBody);
      } else {
        await addTask({ ...baseBody, isComplete: false });
      }
      setShowTaskModal(false);
      setEditingTask(null);
      await fetchTasks();
    } catch (err) {
      console.error("Failed to save task:", err);
      alert(err?.message || "Failed to save task. Please try again.");
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      const data = await completeTask(taskId);
      if (data?.success) {
        await fetchTasks();
      }
    } catch (err) {
      console.error("Failed to complete task:", err);
      alert(err?.message || "Failed to complete task. Please try again.");
    }
  };

  const handleDragStart = (event, task, from) => {
    if (interactionLocks.dragDisabled || isTaskCompleteForToday(task)) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", task.taskId);
    dispatch(createPlannerEvent(PLANNER_EVENT_TYPES.START_DRAG, { taskId: task.taskId, from }));
  };

  const handleDragEnd = () => {
    setDragHoverDayKey(null);
    dispatch(createPlannerEvent(PLANNER_EVENT_TYPES.CANCEL_DRAG));
  };

  const handleDragOverDay = (event, day) => {
    if (interactionLocks.dragDisabled) return;
    event.preventDefault();
    setDragHoverDayKey(day.key);
    dispatch(createPlannerEvent(PLANNER_EVENT_TYPES.HOVER_DROP_TARGET, { dayKey: day.key }));
  };

  const handleDropOnDay = async (event, day) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/plain") || plannerState.drag.taskId;
    setDragHoverDayKey(null);
    if (!taskId) return;

    const task = tasks.find((item) => item.taskId === taskId);
    if (!task) return;

    try {
      await updateTask(taskId, { dueAt: mergeDateWithExistingTime(day.date, task.dueAt) });
      dispatch(
        createPlannerEvent(PLANNER_EVENT_TYPES.DROP_ON_DAY, {
          dayKey: day.key,
          overflowCount: day.key === viewModel.selectedDay.key ? Math.max(0, viewModel.selectedDay.tasks.length - 4) : 0,
        })
      );
      if (plannerState.assist.active) {
        setAssistSuggestions((prev) => prev.filter((item) => item.taskId !== taskId));
      }
    } catch (err) {
      console.error("Failed to move task onto day:", err);
    }
  };

  const handleDropToBacklog = async (event) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/plain") || plannerState.drag.taskId;
    setDragHoverDayKey(null);
    if (!taskId) return;
    try {
      await updateTask(taskId, { dueAt: null });
      dispatch(createPlannerEvent(PLANNER_EVENT_TYPES.DROP_TO_BACKLOG));
    } catch (err) {
      console.error("Failed to return task to backlog:", err);
    }
  };

  const handleDragOverBacklog = (event) => {
    if (interactionLocks.dragDisabled) return;
    event.preventDefault();
  };

  const handleSelectDay = (day) => {
    dispatch(
      createPlannerEvent(PLANNER_EVENT_TYPES.SELECT_DAY, {
        dayKey: day.key,
        overflowCount: day.overflowTasks.length,
      })
    );
  };

  const toggleAssist = async () => {
    if (assistLoading) return;

    if (plannerState.assist.active) {
      setAssistSuggestions([]);
      setAssistSummary("");
      dispatch(createPlannerEvent(PLANNER_EVENT_TYPES.TOGGLE_ASSIST, { enabled: false }));
      return;
    }

    if (!auth.currentUser) return;

    const openTasks = tasks.filter((task) => !isTaskCompleteForToday(task));
    if (!openTasks.length) {
      setAssistSummary("Add at least one open task before asking Assist to place work.");
      dispatch(createPlannerEvent(PLANNER_EVENT_TYPES.TOGGLE_ASSIST, { enabled: true }));
      return;
    }

    setAssistLoading(true);
    dispatch(createPlannerEvent(PLANNER_EVENT_TYPES.TOGGLE_ASSIST, { enabled: true }));

    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/ai/replan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          perDay: 3,
          apply: false,
          selectedDate: viewModel.selectedDay.date.toISOString(),
          instruction: "Create calm, balanced placements for this week.",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const suggestions = Array.isArray(data)
        ? data
        : Array.isArray(data?.suggestions)
          ? data.suggestions
          : [];
      setAssistSuggestions(suggestions);
      setAssistSummary(
        data?.summary ||
          (suggestions.length
            ? "Ghost placements are visible across the month. Tap one to accept it."
            : "No useful assist placements came back for the current workload.")
      );
      dispatch(createPlannerEvent(PLANNER_EVENT_TYPES.LOAD_ASSIST_SUGGESTIONS, { suggestions }));
    } catch (err) {
      console.error("Assist failed:", err);
      setAssistSuggestions([]);
      setAssistSummary(err?.message || "Unable to generate assist suggestions right now.");
    } finally {
      setAssistLoading(false);
    }
  };

  const handleAcceptSuggestion = async (suggestion) => {
    if (!suggestion?.taskId) return;
    dispatch(createPlannerEvent(PLANNER_EVENT_TYPES.ACCEPT_ASSIST_SUGGESTION, { taskId: suggestion.taskId }));
    try {
      await updateTask(suggestion.taskId, {
        dueAt: suggestion.suggestedDate || suggestion.date || viewModel.selectedDay.date.toISOString(),
        priority: suggestion.priority || undefined,
      });
      setAssistSuggestions((prev) => prev.filter((item) => item.taskId !== suggestion.taskId));
      dispatch(createPlannerEvent(PLANNER_EVENT_TYPES.LOAD_ASSIST_SUGGESTIONS, {
        suggestions: assistSuggestions.filter((item) => item.taskId !== suggestion.taskId),
      }));
    } catch (err) {
      console.error("Failed to accept assist suggestion:", err);
    }
  };

  const handleRejectSuggestion = (suggestion) => {
    setAssistSuggestions((prev) => prev.filter((item) => item.taskId !== suggestion.taskId));
    dispatch(createPlannerEvent(PLANNER_EVENT_TYPES.REJECT_ASSIST_SUGGESTION, { taskId: suggestion.taskId }));
  };

  const handleReturnOverflow = async () => {
    const overflowTasks = viewModel.selectedDay.overflowTasks;
    if (!overflowTasks.length) return;

    setOverflowBusy(true);
    dispatch(
      createPlannerEvent(PLANNER_EVENT_TYPES.REDISTRIBUTE_OVERFLOW_REQUEST, {
        dayKey: viewModel.selectedDay.key,
        taskIds: overflowTasks.map((task) => task.taskId),
      })
    );

    try {
      for (const task of overflowTasks) {
        await updateTask(task.taskId, { dueAt: null });
        await new Promise((resolve) => window.setTimeout(resolve, 90));
      }
      await fetchTasks();
      setOverflowToast("Spillway emptied. Tasks returned to backlog.");
      dispatch(createPlannerEvent(PLANNER_EVENT_TYPES.REDISTRIBUTE_OVERFLOW_COMPLETE));
    } catch (err) {
      console.error("Failed to return overflow to backlog:", err);
    } finally {
      setOverflowBusy(false);
    }
  };

  const handlePrevMonth = () => {
    const next = addMonths(cursor, -1);
    dispatch(createPlannerEvent(PLANNER_EVENT_TYPES.NAVIGATE_MONTH, { monthKey: monthKey(next) }));
    setCursor(next);
    setAssistSuggestions([]);
    setAssistSummary("");
    setDragHoverDayKey(null);
    window.setTimeout(() => {
      dispatch(createPlannerEvent(PLANNER_EVENT_TYPES.MONTH_TRANSITION_COMPLETE));
    }, 180);
  };

  const handleNextMonth = () => {
    const next = addMonths(cursor, 1);
    dispatch(createPlannerEvent(PLANNER_EVENT_TYPES.NAVIGATE_MONTH, { monthKey: monthKey(next) }));
    setCursor(next);
    setAssistSuggestions([]);
    setAssistSummary("");
    setDragHoverDayKey(null);
    window.setTimeout(() => {
      dispatch(createPlannerEvent(PLANNER_EVENT_TYPES.MONTH_TRANSITION_COMPLETE));
    }, 180);
  };

  if (loading) {
    return <div className="planner-loading">Building planner…</div>;
  }

  return (
    <div className={`planner-page ${plannerState.assist.active ? "is-assist-active" : ""}`.trim()}>
      <div className="planner-shell">
        <PlannerSidebar
          tasks={viewModel.backlogTasks}
          draggingTaskId={plannerState.drag.taskId}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDropToBacklog={handleDropToBacklog}
          onDragOverBacklog={handleDragOverBacklog}
          onEdit={openEditModal}
          onAddTask={openCreateModal}
        />

        <section className="planner-stage">
          <PlannerHud
            monthLabel={viewModel.monthLabel}
            assistActive={plannerState.assist.active}
            assistBusy={assistLoading || interactionLocks.assistDisabled}
            onPrev={handlePrevMonth}
            onNext={handleNextMonth}
            onToggleAssist={toggleAssist}
          />

          <PlannerGrid
            weekdays={viewModel.weekdays}
            days={viewModel.days}
            selectedDay={viewModel.selectedDay}
            dragHoverDayKey={dragHoverDayKey}
            assistActive={plannerState.assist.active}
            draggingDisabled={interactionLocks.dragDisabled}
            overflowBusy={overflowBusy}
            onSelectDay={handleSelectDay}
            onDragStartTask={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOverDay={handleDragOverDay}
            onDropOnDay={handleDropOnDay}
            onEditTask={openEditModal}
            onCompleteTask={handleCompleteTask}
            onAcceptSuggestion={handleAcceptSuggestion}
            onRejectSuggestion={handleRejectSuggestion}
            onReturnOverflow={handleReturnOverflow}
            onAddTask={openCreateModal}
          />
        </section>
      </div>

      <AssistOverlay
        active={plannerState.assist.active}
        loading={assistLoading}
        onExit={() => {
          setAssistSuggestions([]);
          setAssistSummary("");
          dispatch(createPlannerEvent(PLANNER_EVENT_TYPES.TOGGLE_ASSIST, { enabled: false }));
        }}
        summary={assistSummary}
      />

      {overflowToast ? <div className="planner-toast">{overflowToast}</div> : null}

      <TaskModal
        open={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setEditingTask(null);
        }}
        onSubmit={handleSubmitTask}
        initialTask={
          editingTask || {
            dueAt: viewModel.selectedDay.date,
            category: "academic",
          }
        }
      />
    </div>
  );
}
