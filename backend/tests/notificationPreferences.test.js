import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDefaultNotificationPreferences,
  normalizeNotificationPreferences,
} from '../domain/notificationPreferences.js';

test('buildDefaultNotificationPreferences uses timezone fallback', () => {
  const prefs = buildDefaultNotificationPreferences('America/Chicago');

  assert.equal(prefs.timezone, 'America/Chicago');
  assert.equal(prefs.pushEnabled, false);
  assert.equal(prefs.notifyDueSoonTasks, true);
});

test('normalizeNotificationPreferences hydrates legacy booleans into canonical triggers', () => {
  const prefs = normalizeNotificationPreferences({
    incoming: undefined,
    existing: undefined,
    legacyNotifications: false,
    legacyWeeklySummary: false,
    timezoneFallback: 'America/New_York',
  });

  assert.equal(prefs.notifyDueSoonTasks, false);
  assert.equal(prefs.notifyDailyPlanReady, false);
  assert.equal(prefs.pushEnabled, false);
  assert.equal(prefs.emailEnabled, false);
});

test('normalizeNotificationPreferences sanitizes invalid quiet hours and preserves canonical values', () => {
  const prefs = normalizeNotificationPreferences({
    incoming: {
      pushEnabled: true,
      quietHoursStart: '25:99',
      quietHoursEnd: '21:15',
      notifyMajorReplans: false,
    },
    existing: {
      emailEnabled: true,
      quietHoursStart: '08:30',
      notifyDueSoonTasks: false,
    },
    timezoneFallback: 'America/Los_Angeles',
  });

  assert.equal(prefs.pushEnabled, true);
  assert.equal(prefs.emailEnabled, true);
  assert.equal(prefs.quietHoursStart, '');
  assert.equal(prefs.quietHoursEnd, '21:15');
  assert.equal(prefs.notifyDueSoonTasks, false);
  assert.equal(prefs.notifyMajorReplans, false);
  assert.equal(prefs.timezone, 'America/Los_Angeles');
});

