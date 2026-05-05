import { useEffect, useMemo, useReducer, useState } from "react";
import { auth } from "../config/firebase.js";
import TaskModal from "../components/TaskModal.jsx";
import AlertBanner from "../components/AlertBanner.jsx";
import useTasks from "../hooks/useTasks";
import useSchedule from "../hooks/useSchedule.js";
import PlannerHud from "./planner/PlannerHud.jsx";
import PlannerGrid from "./planner/PlannerGrid.jsx";
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
  const today = useMemo(() => startOfDay(new Date()), []);
  const [cursor, setCursor] = useState(() => startOfMonth(today));
  const [assistSuggestions, setAssistSuggestions] = useState([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [dragHoverDayKey, setDragHoverDayKey] = useState(null);
  const [overflowBusy, setOverflowBusy] = useState(false);
  const [overflowToast, setOverflowToast] = useState("");
  const [banner, setBanner] = useState(null);
  const { tasks, loading, fetchTasks, addTask, updateTask, completeTask } = useTasks();
  const {
    blocks: scheduleBlocks,
    scheduleLoading,
    generating: scheduleBusy,
    completingBlockId,
    removingBlockId,
    fetchBlocks,
    generateSchedule,
    completeBlock: completeScheduleBlock,
    removeBlock: removeScheduleBlock,
  } = useSchedule();

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

  useEffect(() => {
    if (!auth.currentUser) return;
    fetchBlocks(viewModel.selectedDay.key).catch((err) => {
      setBanner({ message: err?.message || "Failed to load the day plan.", type: "error" });
    });
  }, [fetchBlocks, viewModel.selectedDay.key]);

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
      setBanner({ message: err?.message || "Failed to save task. Please try again.", type: "error" });
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
      setBanner({ message: err?.message || "Failed to complete task. Please try again.", type: "error" });
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

  const handleSelectDay = (day) => {
    dispatch(
      createPlannerEvent(PLANNER_EVENT_TYPES.SELECT_DAY, {
        dayKey: day.key,
        overflowCount: day.overflowTasks.length,
      })
    );
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

  const handleGenerateSchedule = async () => {
    try {
      await generateSchedule(viewModel.selectedDay.key);
      setBanner({
        message: `Generated a plan for ${viewModel.selectedDay.dayName}.`,
        type: "success",
      });
    } catch (err) {
      setBanner({
        message: err?.message || "Unable to generate a plan right now.",
        type: "error",
      });
    }
  };

  const handleRemoveScheduleBlock = async (blockId) => {
    try {
      await removeScheduleBlock(blockId);
    } catch (err) {
      setBanner({ message: err?.message || "Unable to remove that block.", type: "error" });
    }
  };

  const handleCompleteScheduleBlock = async (blockId) => {
    const block = scheduleBlocks.find((b) => b.blockId === blockId);
    try {
      if (block?.taskId) {
        await updateTask(block.taskId, { dueAt: viewModel.selectedDay.date });
        await removeScheduleBlock(blockId);
        await fetchTasks();
        setBanner({ message: "Added to your day.", type: "success" });
      } else {
        const data = await completeScheduleBlock(blockId, viewModel.selectedDay.key);
        await fetchTasks();
        if (data?.xpGained > 0) {
          setBanner({ message: `Completed. +${Math.round(data.xpGained)} XP.`, type: "success" });
        } else {
          setBanner({ message: "Block completed.", type: "success" });
        }
      }
    } catch (err) {
      setBanner({ message: err?.message || "Unable to accept that block.", type: "error" });
    }
  };

  const showToday = monthKey(cursor) !== monthKey(today);

  const handleToday = () => {
    const m = startOfMonth(today);
    dispatch(createPlannerEvent(PLANNER_EVENT_TYPES.NAVIGATE_MONTH, { monthKey: monthKey(m) }));
    setCursor(m);
    setAssistSuggestions([]);
    setDragHoverDayKey(null);
    window.setTimeout(() => {
      dispatch(createPlannerEvent(PLANNER_EVENT_TYPES.MONTH_TRANSITION_COMPLETE));
    }, 180);
  };

  const handlePrevMonth = () => {
    const next = addMonths(cursor, -1);
    dispatch(createPlannerEvent(PLANNER_EVENT_TYPES.NAVIGATE_MONTH, { monthKey: monthKey(next) }));
    setCursor(next);
    setAssistSuggestions([]);
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
      {banner && <AlertBanner message={banner.message} type={banner.type} onClose={() => setBanner(null)} />}
      <div className="planner-shell">
        <section className="planner-stage">
          <PlannerHud
            monthLabel={viewModel.monthLabel}
            onPrev={handlePrevMonth}
            onNext={handleNextMonth}
            showToday={showToday}
            onToday={handleToday}
          />

          <PlannerGrid
            weekdays={viewModel.weekdays}
            days={viewModel.days}
            selectedDay={viewModel.selectedDay}
            dragHoverDayKey={dragHoverDayKey}
            assistActive={plannerState.assist.active}
            draggingDisabled={interactionLocks.dragDisabled}
            overflowBusy={overflowBusy}
            scheduleBlocks={scheduleBlocks}
            scheduleLoading={scheduleLoading}
            generating={scheduleBusy}
            completingBlockId={completingBlockId}
            removingBlockId={removingBlockId}
            onSelectDay={handleSelectDay}
            onDragStartTask={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOverDay={handleDragOverDay}
            onDropOnDay={handleDropOnDay}
            onEditTask={openEditModal}
            onCompleteTask={handleCompleteTask}
            onReturnOverflow={handleReturnOverflow}
            onAddTask={openCreateModal}
            onGenerateSchedule={handleGenerateSchedule}
            onCompleteBlock={handleCompleteScheduleBlock}
            onRemoveBlock={handleRemoveScheduleBlock}
          />
        </section>
      </div>

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
