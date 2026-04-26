import test from 'node:test';
import assert from 'node:assert';
import { evaluateRoutineStreakBadge } from '../domain/routineBadges.js';

test('awards badge when routine streak hits 7 and user does not already have it', () => {
  const badge = evaluateRoutineStreakBadge(7, []);
  assert.strictEqual(badge?.id, 'routine-7-day-streak');
  assert.strictEqual(badge?.title, '7-Day Routine Mastery');
});

test('does not award routine badge below threshold', () => {
  const badge = evaluateRoutineStreakBadge(5, []);
  assert.strictEqual(badge, null);
});

test('does not award duplicate routine badge', () => {
  const badge = evaluateRoutineStreakBadge(10, [{ id: 'routine-7-day-streak' }]);
  assert.strictEqual(badge, null);
});
