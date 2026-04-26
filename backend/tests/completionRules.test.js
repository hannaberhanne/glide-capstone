import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProjectGoalCompletionOutcome,
  buildRoutineGoalCompletionOutcome,
  buildTaskCompletionOutcome,
} from '../domain/completion.js';

test('task completion awards XP once and computes next level', () => {
  const result = buildTaskCompletionOutcome({
    task: {
      title: 'Write outline',
      xpValue: 75,
      lastCompleted: '',
    },
    userData: {
      totalXP: 40,
      level: 0,
    },
    todayKey: '2026-04-26',
    generatedXp: null,
  });

  assert.equal(result.already, false);
  assert.equal(result.xpSource, 'task');
  assert.equal(result.xpGained, 75);
  assert.equal(result.newTotalXP, 115);
  assert.equal(result.newLevel, 1);
});

test('task completion is idempotent on the same day', () => {
  const result = buildTaskCompletionOutcome({
    task: {
      title: 'Read chapter',
      xpValue: 30,
      lastCompleted: '2026-04-26',
    },
    userData: {
      totalXP: 90,
      level: 0,
    },
    todayKey: '2026-04-26',
    generatedXp: null,
  });

  assert.equal(result.already, true);
  assert.equal(result.xpSource, 'none');
  assert.equal(result.xpGained, 0);
  assert.equal(result.newTotalXP, 90);
});

test('routine goal completion continues streak, awards milestone bonus, and unlocks badge', () => {
  const result = buildRoutineGoalCompletionOutcome({
    goal: {
      type: 'routine',
      xpValue: 10,
      streak: 6,
      longestStreak: 6,
      totalCompletions: 6,
      completionHistory: ['2026-04-25'],
    },
    userData: {
      totalXP: 120,
      level: 1,
      badges: [],
    },
    todayKey: '2026-04-26',
    yesterdayKey: '2026-04-25',
    userBadges: [],
  });

  assert.equal(result.already, false);
  assert.equal(result.xpSource, 'routine');
  assert.equal(result.newStreak, 7);
  assert.equal(result.newLongestStreak, 7);
  assert.equal(result.totalCompletions, 7);
  assert.equal(result.xpGained, 15);
  assert.equal(result.badgesAwarded.length, 1);
  assert.equal(result.badgesAwarded[0].id, 'routine-7-day-streak');
});

test('routine goal completion resets streak after a gap', () => {
  const result = buildRoutineGoalCompletionOutcome({
    goal: {
      type: 'routine',
      xpValue: 12,
      streak: 5,
      longestStreak: 8,
      totalCompletions: 12,
      completionHistory: ['2026-04-20'],
    },
    userData: {
      totalXP: 120,
      level: 1,
      badges: [],
    },
    todayKey: '2026-04-26',
    yesterdayKey: '2026-04-25',
    userBadges: [],
  });

  assert.equal(result.already, false);
  assert.equal(result.newStreak, 1);
  assert.equal(result.newLongestStreak, 8);
  assert.equal(result.xpGained, 12);
});

test('project goal completion is a one-time flat bonus', () => {
  const first = buildProjectGoalCompletionOutcome({
    goal: {
      type: 'project',
      xpValue: 50,
      totalCompletions: 0,
      completionHistory: [],
    },
    userData: {
      totalXP: 80,
      level: 0,
    },
    todayKey: '2026-04-26',
  });

  assert.equal(first.already, false);
  assert.equal(first.xpSource, 'project');
  assert.equal(first.xpGained, 50);
  assert.equal(first.totalCompletions, 1);

  const repeat = buildProjectGoalCompletionOutcome({
    goal: {
      type: 'project',
      xpValue: 50,
      totalCompletions: 1,
      completionHistory: ['2026-04-26'],
    },
    userData: {
      totalXP: 130,
      level: 1,
    },
    todayKey: '2026-04-27',
  });

  assert.equal(repeat.already, true);
  assert.equal(repeat.xpSource, 'none');
  assert.equal(repeat.xpGained, 0);
});
