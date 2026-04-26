const STREAK_BADGE = {
  id: 'routine-7-day-streak',
  title: '7-Day Routine Mastery',
  description: 'Maintain a week-long streak on this routine',
  icon: '🏅',
};

const evaluateRoutineStreakBadge = (currentStreak = 0, userBadges = []) => {
  const alreadyHas = Array.isArray(userBadges) && userBadges.some((badge) => badge?.id === STREAK_BADGE.id);
  if (currentStreak >= 7 && !alreadyHas) {
    return { ...STREAK_BADGE };
  }
  return null;
};

export { STREAK_BADGE, evaluateRoutineStreakBadge };
