const STREAK_BADGE = {
  id: 'habit-7-day-streak',
  title: '7-Day Habit Mastery',
  description: 'Maintain a week-long streak on this habit',
  icon: '🏅',
};

const evaluateStreakBadge = (currentStreak = 0, userBadges = []) => {
  const alreadyHas = Array.isArray(userBadges) && userBadges.some((badge) => badge?.id === STREAK_BADGE.id);
  if (currentStreak >= 7 && !alreadyHas) {
    return { ...STREAK_BADGE };
  }
  return null;
};

export { STREAK_BADGE, evaluateStreakBadge };
