const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function defaultTimezone(timezoneFallback) {
  if (typeof timezoneFallback === 'string' && timezoneFallback.trim()) {
    return timezoneFallback.trim();
  }
  return 'America/New_York';
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeTime(value, fallback = '') {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const next = String(value).trim();
  return TIME_PATTERN.test(next) ? next : fallback;
}

function sanitizeBoolean(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

export function buildDefaultNotificationPreferences(timezoneFallback) {
  return {
    pushEnabled: false,
    emailEnabled: false,
    quietHoursStart: '',
    quietHoursEnd: '',
    timezone: defaultTimezone(timezoneFallback),
    notifyDailyPlanReady: true,
    notifyMissedBlocks: true,
    notifyDueSoonTasks: true,
    notifyStreakRisk: true,
    notifyMajorReplans: true,
  };
}

function sanitizeNotificationSource(source, defaults) {
  if (!isPlainObject(source)) {
    return { ...defaults };
  }

  return {
    pushEnabled: sanitizeBoolean(source.pushEnabled, defaults.pushEnabled),
    emailEnabled: sanitizeBoolean(source.emailEnabled, defaults.emailEnabled),
    quietHoursStart: sanitizeTime(source.quietHoursStart, defaults.quietHoursStart),
    quietHoursEnd: sanitizeTime(source.quietHoursEnd, defaults.quietHoursEnd),
    timezone:
      typeof source.timezone === 'string' && source.timezone.trim()
        ? source.timezone.trim()
        : defaults.timezone,
    notifyDailyPlanReady: sanitizeBoolean(
      source.notifyDailyPlanReady,
      defaults.notifyDailyPlanReady
    ),
    notifyMissedBlocks: sanitizeBoolean(
      source.notifyMissedBlocks,
      defaults.notifyMissedBlocks
    ),
    notifyDueSoonTasks: sanitizeBoolean(
      source.notifyDueSoonTasks,
      defaults.notifyDueSoonTasks
    ),
    notifyStreakRisk: sanitizeBoolean(
      source.notifyStreakRisk,
      defaults.notifyStreakRisk
    ),
    notifyMajorReplans: sanitizeBoolean(
      source.notifyMajorReplans,
      defaults.notifyMajorReplans
    ),
  };
}

export function normalizeNotificationPreferences({
  incoming,
  existing,
  legacyNotifications,
  legacyWeeklySummary,
  timezoneFallback,
}) {
  const defaults = buildDefaultNotificationPreferences(timezoneFallback);
  const base = sanitizeNotificationSource(existing, defaults);

  const withLegacy = {
    ...base,
    notifyDueSoonTasks:
      typeof legacyNotifications === 'boolean'
        ? legacyNotifications
        : base.notifyDueSoonTasks,
    notifyDailyPlanReady:
      typeof legacyWeeklySummary === 'boolean'
        ? legacyWeeklySummary
        : base.notifyDailyPlanReady,
  };

  if (typeof incoming === 'boolean') {
    return {
      ...withLegacy,
      notifyDueSoonTasks: incoming,
    };
  }

  if (!isPlainObject(incoming)) {
    return withLegacy;
  }

  return sanitizeNotificationSource({ ...withLegacy, ...incoming }, defaults);
}

function parseMinutes(value) {
  if (typeof value !== 'string' || !TIME_PATTERN.test(value)) {
    return null;
  }
  const [hours, minutes] = value.split(':').map(Number);
  return (hours * 60) + minutes;
}

function resolveDateInTimezone(now, timezone) {
  const fallbackTimezone = defaultTimezone(timezone);

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: fallbackTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    const parts = formatter.formatToParts(now);
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
    const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0');
    return (hour * 60) + minute;
  } catch {
    return (now.getHours() * 60) + now.getMinutes();
  }
}

function eventToggleKey(eventType) {
  switch (eventType) {
    case 'daily-plan-ready':
      return 'notifyDailyPlanReady';
    case 'missed-block':
      return 'notifyMissedBlocks';
    case 'due-soon-task':
      return 'notifyDueSoonTasks';
    case 'streak-risk':
      return 'notifyStreakRisk';
    case 'major-replan':
      return 'notifyMajorReplans';
    default:
      return null;
  }
}

function isWithinQuietHours(now, quietHoursStart, quietHoursEnd, timezone) {
  const start = parseMinutes(quietHoursStart);
  const end = parseMinutes(quietHoursEnd);
  if (start === null || end === null) {
    return false;
  }

  const currentMinutes = resolveDateInTimezone(now, timezone);
  if (start === end) {
    return true;
  }
  if (start < end) {
    return currentMinutes >= start && currentMinutes < end;
  }
  return currentMinutes >= start || currentMinutes < end;
}

export function resolveNotificationEligibility({
  user,
  eventType,
  channel,
  now = new Date(),
}) {
  const prefs = normalizeNotificationPreferences({
    incoming: user?.preferences?.notifications,
    existing: user?.preferences?.notifications,
    legacyNotifications: user?.notifications,
    legacyWeeklySummary: user?.weeklySummary,
    timezoneFallback: user?.timezone,
  });

  if (channel === 'push' && !prefs.pushEnabled) {
    return { allowed: false, suppressed: true, reason: 'channel-disabled', preferences: prefs };
  }

  if (channel === 'email' && !prefs.emailEnabled) {
    return { allowed: false, suppressed: true, reason: 'channel-disabled', preferences: prefs };
  }

  const toggleKey = eventToggleKey(eventType);
  if (toggleKey && !prefs[toggleKey]) {
    return { allowed: false, suppressed: true, reason: 'trigger-disabled', preferences: prefs };
  }

  if (!prefs.timezone) {
    return { allowed: false, suppressed: true, reason: 'missing-timezone', preferences: prefs };
  }

  if (isWithinQuietHours(now, prefs.quietHoursStart, prefs.quietHoursEnd, prefs.timezone)) {
    return { allowed: false, suppressed: true, reason: 'quiet-hours', preferences: prefs };
  }

  return { allowed: true, suppressed: false, reason: null, preferences: prefs };
}
