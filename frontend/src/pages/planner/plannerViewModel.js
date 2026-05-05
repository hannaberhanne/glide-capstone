export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const startOfDay = (value) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const startOfMonth = (value) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

export const addMonths = (value, amount) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
};

export const dayKey = (value) => {
  const date = startOfDay(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const monthKey = (value) => {
  const date = startOfMonth(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export const parseMaybeDate = (value) => {
  if (!value) return null;
  if (typeof value === "object" && value.seconds) {
    return new Date(value.seconds * 1000);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const isTaskCompleteForToday = (task) =>
  task?.isComplete === true || task?.completedToday === true;

export const formatMonthLabel = (value) =>
  new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(value);

export const formatSelectedDayTitle = (value, today = new Date()) => {
  const subject = startOfDay(value);
  const reference = startOfDay(today);
  const diff = Math.round((subject - reference) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(subject);
};

export const sortPlannerTasks = (tasks = []) => {
  return [...tasks].sort((a, b) => {
    const completeDelta =
      Number(isTaskCompleteForToday(a)) - Number(isTaskCompleteForToday(b));
    if (completeDelta !== 0) return completeDelta;

    const dueA = parseMaybeDate(a?.dueAt);
    const dueB = parseMaybeDate(b?.dueAt);
    if (dueA && dueB && dueA.getTime() !== dueB.getTime()) {
      return dueA - dueB;
    }
    if (dueA && !dueB) return -1;
    if (!dueA && dueB) return 1;

    const priRank = { high: 0, medium: 1, low: 2 };
    const priA = priRank[(a?.priority || "medium").toLowerCase()] ?? 1;
    const priB = priRank[(b?.priority || "medium").toLowerCase()] ?? 1;
    if (priA !== priB) return priA - priB;

    return String(a?.title || "").localeCompare(String(b?.title || ""));
  });
};

export const estimateLabel = (task) => {
  const minutes = Number(task?.estimatedMinutes ?? task?.estimatedTime ?? 0) || 0;
  if (!minutes) return null;
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
};

export const taskSourceLabel = (task) => {
  if (task?.canvasAssignmentId || task?.canvasCourseId) return "Canvas";
  return null;
};

export const taskDueTimeLabel = (task) => {
  const due = parseMaybeDate(task?.dueAt);
  if (!due) return null;
  const hasTime = !(due.getHours() === 0 && due.getMinutes() === 0);
  if (!hasTime) return null;
  return due.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export const buildPlannerViewModel = ({ tasks, cursor, today, selectedDayKey, assistSuggestions = [] }) => {
  const currentMonth = startOfMonth(cursor);
  const currentMonthKey = monthKey(currentMonth);
  const todayValue = startOfDay(today);
  const monthStart = startOfMonth(currentMonth);
  const firstVisible = new Date(monthStart);
  firstVisible.setDate(firstVisible.getDate() - firstVisible.getDay());

  const cutoff = new Date(todayValue.getTime() - 21 * 24 * 60 * 60 * 1000);
  const scheduledByDay = new Map();
  const backlogTasks = [];

  sortPlannerTasks(tasks).forEach((task) => {
    const due = parseMaybeDate(task?.dueAt);
    if (!due) {
      backlogTasks.push(task);
      return;
    }
    if (startOfDay(due) < startOfDay(cutoff)) return;
    const key = dayKey(due);
    if (!scheduledByDay.has(key)) {
      scheduledByDay.set(key, []);
    }
    scheduledByDay.get(key).push(task);
  });

  const ghostsByDay = new Map();
  assistSuggestions.forEach((item) => {
    const key = dayKey(item.suggestedDate || item.date || today);
    if (!ghostsByDay.has(key)) ghostsByDay.set(key, []);
    ghostsByDay.get(key).push(item);
  });

  const days = Array.from({ length: 42 }).map((_, index) => {
    const date = new Date(firstVisible);
    date.setDate(firstVisible.getDate() + index);
    const key = dayKey(date);
    const inMonth = date.getMonth() === currentMonth.getMonth() && date.getFullYear() === currentMonth.getFullYear();
    const tasksForDay = sortPlannerTasks(scheduledByDay.get(key) || []);
    const overflowTasks = tasksForDay.slice(5);
    const chipTasks = tasksForDay.slice(0, 2);

    let loadState = "empty";
    if (tasksForDay.length >= 6) loadState = "overloaded";
    else if (tasksForDay.length >= 3) loadState = "steady";
    else if (tasksForDay.length >= 1) loadState = "light";

    const isToday = dayKey(date) === dayKey(todayValue);
    return {
      key,
      date,
      dateNumber: date.getDate(),
      dayName: new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date),
      inMonth,
      isToday,
      isPast: !isToday && dayKey(date) < dayKey(todayValue),
      isSelected: key === selectedDayKey,
      tasks: tasksForDay,
      visibleTasks: tasksForDay.slice(0, 5),
      overflowTasks,
      chipTasks,
      extraChipCount: Math.max(0, tasksForDay.length - chipTasks.length),
      loadState,
      ghosts: ghostsByDay.get(key) || [],
    };
  });

  const selectedDay =
    days.find((day) => day.key === selectedDayKey) ||
    days.find((day) => day.key === dayKey(today) && day.inMonth) ||
    days.find((day) => day.inMonth) ||
    days[0];

  return {
    monthLabel: formatMonthLabel(currentMonth),
    monthKey: currentMonthKey,
    weekdays: WEEKDAY_LABELS,
    backlogTasks,
    days,
    selectedDay,
    scheduledCount: tasks.length - backlogTasks.length,
  };
};
