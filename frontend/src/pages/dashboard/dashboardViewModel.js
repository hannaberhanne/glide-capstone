export const startOfDay = (value) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const toDayKey = (value) => {
  const date = startOfDay(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const taskTitle = (task) => task?.title || task?.text || "Untitled task";

export const parseMaybeDate = (value) => {
  if (!value) return null;
  if (typeof value === "object" && value.seconds) {
    return new Date(value.seconds * 1000);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatEstimate = (minutes) => {
  const total = Number(minutes);
  if (!Number.isFinite(total) || total <= 0) return null;
  if (total < 60) return `${Math.round(total)}m`;
  const hours = total / 60;
  if (Number.isInteger(hours)) return `${hours}h`;
  return `${hours.toFixed(1)}h`;
};

export const getXpLevel = (totalXP) => {
  let level = 0;
  let accumulated = 0;

  while (totalXP >= accumulated + 100 * (level + 1)) {
    accumulated += 100 * (level + 1);
    level += 1;
  }

  const xpForNext = 100 * (level + 1);
  const currentLevelXP = totalXP - accumulated;
  const progress = xpForNext > 0 ? (currentLevelXP / xpForNext) * 100 : 0;

  return {
    level,
    currentLevelXP,
    xpForNext,
    xpToNext: xpForNext - currentLevelXP,
    progress: Math.max(0, Math.min(100, progress)),
  };
};

export const sortOpenTasks = (tasks, parseDueDate) => {
  return [...tasks].sort((a, b) => {
    const dueA = parseDueDate(a);
    const dueB = parseDueDate(b);
    if (dueA && dueB) return dueA - dueB;
    if (dueA) return -1;
    if (dueB) return 1;
    return taskTitle(a).localeCompare(taskTitle(b));
  });
};

export const buildStreakCalendar = ({ completedTasks, today }) => {
  const todayKey = toDayKey(today);
  const completedSet = new Set(completedTasks.map(({ date }) => toDayKey(date)));

  const streakAnchor = startOfDay(today);
  if (!completedSet.has(todayKey)) {
    streakAnchor.setDate(streakAnchor.getDate() - 1);
  }

  const currentStreakKeys = new Set();

  const persistedStreak = (() => {
    if (!completedSet.size) return 0;
    const cursor = new Date(streakAnchor);

    let count = 0;
    while (completedSet.has(toDayKey(cursor))) {
      currentStreakKeys.add(toDayKey(cursor));
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  })();

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const firstVisible = new Date(monthStart);
  firstVisible.setDate(monthStart.getDate() - monthStart.getDay());

  const cells = Array.from({ length: 35 }).map((_, index) => {
    const day = new Date(firstVisible);
    day.setDate(firstVisible.getDate() + index);
    const dayKey = toDayKey(day);
    const inMonth = day.getMonth() === today.getMonth();
    const isPast = inMonth && startOfDay(day) < startOfDay(today);
    const done = completedSet.has(dayKey);
    const previousMonth = day < monthStart;
    const nextMonth = day > monthEnd;

    return {
      key: dayKey,
      dateNumber: day.getDate(),
      inMonth,
      previousMonth,
      nextMonth,
      isToday: dayKey === todayKey,
      isPast,
      done,
      inCurrentStreak: currentStreakKeys.has(dayKey),
      missed: inMonth && isPast && !done,
    };
  });

  const currentWeekIndex = cells.findIndex((cell) => cell.isToday);
  const currentWeek = Math.floor(currentWeekIndex / 7);
  const currentDayOfWeek = startOfDay(today).getDay();

  return {
    streak: persistedStreak,
    previewDays: persistedStreak,
    monthLabel: new Intl.DateTimeFormat("en-US", { month: "long" }).format(today),
    weekdays: ["S", "M", "T", "W", "T", "F", "S"],
    weeks: Array.from({ length: 5 }).map((_, weekIndex) => {
      const isCurrentWeek = currentWeek === weekIndex;
      return {
        key: `week-${weekIndex}`,
        highlighted: isCurrentWeek,
        days: cells.slice(weekIndex * 7, weekIndex * 7 + 7).map((cell, dayIndex) => {
          const banded = isCurrentWeek && dayIndex >= currentDayOfWeek;
          return {
            ...cell,
            crossedOut: cell.previousMonth,
            streaked: cell.inCurrentStreak,
            banded,
            bandStart: banded && dayIndex === currentDayOfWeek,
            bandEnd: banded && dayIndex === 6,
            bandSolo: banded && currentDayOfWeek === 6,
          };
        }),
      };
    }),
  };
};

export const getDashboardTaskBuckets = ({ tasks, today }) => {
  const todayKey = toDayKey(today);
  const parseDueDate = (task) => parseMaybeDate(task?.dueAt);
  const parseCompletedDate = (task) =>
    parseMaybeDate(task?.completedAt || task?.lastCompleted || task?.updatedAt);

  const goalTasks = tasks.filter((task) => task.goalId);
  const incompleteTasks = tasks.filter((task) => !task.isComplete && !task.completedToday && !task.goalId);
  const sortedOpenTasks = sortOpenTasks([...incompleteTasks, ...goalTasks], parseDueDate);

  const overdueTasks = sortedOpenTasks.filter((task) => {
    const due = parseDueDate(task);
    return due ? startOfDay(due) < today : false;
  });

  const dueTodayTasks = sortedOpenTasks.filter((task) => {
    const due = parseDueDate(task);
    return due ? toDayKey(due) === todayKey : false;
  });

  const futureTasks = sortedOpenTasks.filter((task) => {
    const due = parseDueDate(task);
    return due ? startOfDay(due) > today : false;
  });

  const undatedTasks = sortedOpenTasks.filter((task) => !parseDueDate(task));

  const completedTasks = tasks
    .filter((task) => task.isComplete || task.completedToday)
    .map((task) => ({ task, date: parseCompletedDate(task) }))
    .filter((entry) => entry.date);

  return {
    parseDueDate,
    parseCompletedDate,
    incompleteTasks,
    sortedOpenTasks,
    overdueTasks,
    dueTodayTasks,
    futureTasks,
    undatedTasks,
    todayTasks: [...overdueTasks, ...dueTodayTasks],
    upcomingTasks: [...futureTasks, ...undatedTasks],
    completedTasks,
  };
};

export const formatDueForToday = ({ task, parseDueDate, today, todayKey }) => {
  const due = parseDueDate(task);
  if (!due) return "Anytime";

  const dueKey = toDayKey(due);
  const diffDays = Math.round((startOfDay(due) - today) / 86400000);
  const hasTime = !(due.getHours() === 0 && due.getMinutes() === 0);

  if (diffDays < 0) return "Overdue";
  if (dueKey === todayKey) {
    return hasTime
      ? due.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
      : "Today";
  }
  if (diffDays === 1) {
    return hasTime
      ? `Tomorrow ${due.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
      : "Tomorrow";
  }

  return due.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};
