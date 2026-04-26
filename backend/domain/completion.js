import { computeLevel } from './xp.js';
import { evaluateRoutineStreakBadge } from './routineBadges.js';

export function dateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export function normalizeXpValue(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const xp = Number(value);
  if (!Number.isFinite(xp)) {
    return null;
  }

  return Math.max(0, Math.round(xp));
}

export function streakBonus(streak) {
  if (streak === 21) return 15;
  if (streak === 7) return 5;
  return 0;
}

export function buildTaskCompletionOutcome({ task, userData, todayKey, generatedXp }) {
  if (task.lastCompleted === todayKey) {
    return {
      already: true,
      xpSource: 'none',
      xpGained: 0,
      newTotalXP: userData.totalXP || 0,
      newLevel: userData.level ?? computeLevel(userData.totalXP || 0),
    };
  }

  const storedXp = normalizeXpValue(task.xpValue);
  const xpGained = storedXp ?? generatedXp ?? 50;
  const newTotalXP = (userData.totalXP || 0) + xpGained;
  const newLevel = computeLevel(newTotalXP);

  return {
    already: false,
    xpSource: 'task',
    xpGained,
    newTotalXP,
    newLevel,
    taskXpValue: storedXp === null ? xpGained : storedXp,
  };
}

export function buildRoutineGoalCompletionOutcome({
  goal,
  userData,
  todayKey,
  yesterdayKey,
  userBadges = [],
}) {
  const history = Array.isArray(goal.completionHistory) ? goal.completionHistory : [];

  if (history.includes(todayKey)) {
    return {
      already: true,
      xpSource: 'none',
      xpGained: 0,
      newTotalXP: userData.totalXP || 0,
      newLevel: userData.level ?? computeLevel(userData.totalXP || 0),
      currentStreak: goal.streak || 0,
      badgesAwarded: [],
    };
  }

  const hasYesterday = history.includes(yesterdayKey);
  const newStreak = hasYesterday ? (goal.streak || 0) + 1 : 1;
  const newLongestStreak = Math.max(goal.longestStreak || 0, newStreak);
  const totalCompletions = (goal.totalCompletions || 0) + 1;
  const baseXP = normalizeXpValue(goal.xpValue) ?? 10;
  const bonusXp = streakBonus(newStreak);
  const xpGained = baseXP + bonusXp;
  const newTotalXP = (userData.totalXP || 0) + xpGained;
  const newLevel = computeLevel(newTotalXP);
  const badgeRecord = evaluateRoutineStreakBadge(newStreak, userBadges);

  return {
    already: false,
    xpSource: 'routine',
    xpGained,
    newTotalXP,
    newLevel,
    newStreak,
    newLongestStreak,
    totalCompletions,
    badgesAwarded: badgeRecord ? [badgeRecord] : [],
  };
}

export function buildProjectGoalCompletionOutcome({ goal, userData, todayKey }) {
  const completionHistory = Array.isArray(goal.completionHistory) ? goal.completionHistory : [];
  const alreadyCompleted = (goal.totalCompletions || 0) > 0 || completionHistory.length > 0;

  if (alreadyCompleted) {
    return {
      already: true,
      xpSource: 'none',
      xpGained: 0,
      newTotalXP: userData.totalXP || 0,
      newLevel: userData.level ?? computeLevel(userData.totalXP || 0),
    };
  }

  const xpGained = normalizeXpValue(goal.xpValue) ?? 25;
  const newTotalXP = (userData.totalXP || 0) + xpGained;
  const newLevel = computeLevel(newTotalXP);

  return {
    already: false,
    xpSource: 'project',
    xpGained,
    newTotalXP,
    newLevel,
    completedOn: todayKey,
    totalCompletions: 1,
  };
}
