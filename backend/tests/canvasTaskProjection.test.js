import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCanvasTaskSyncFields,
  DEFAULT_TASK_CATEGORY,
  TASK_SOURCE,
  isCanvasLinkedTask,
  normalizeCanvasDueAt,
  normalizeCanvasTitle,
} from '../domain/canvasTaskProjection.js';

test('normalizeCanvasTitle falls back when title is empty', () => {
  assert.equal(normalizeCanvasTitle('   '), 'Untitled assignment');
  assert.equal(normalizeCanvasTitle('Essay draft'), 'Essay draft');
});

test('normalizeCanvasDueAt returns null for invalid values and ISO for valid dates', () => {
  assert.equal(normalizeCanvasDueAt(''), null);
  assert.equal(normalizeCanvasDueAt('not-a-date'), null);
  assert.equal(normalizeCanvasDueAt('2026-04-09T15:30:00Z'), '2026-04-09T15:30:00.000Z');
});

test('buildCanvasTaskSyncFields maps assignment data into task sync fields', () => {
  const updatedAt = { mock: 'timestamp' };
  const fields = buildCanvasTaskSyncFields({
    uid: 'user-1',
    courseId: 'course-7',
    courseCode: 'ENG101',
    assignmentId: 'assignment-3',
    updatedAt,
    assignmentData: {
      canvasId: 'canvas-55',
      canvasUrl: 'https://canvas.example/assignment/55',
      description: '<p>Draft the essay.</p>',
      dueDate: '2026-04-10T12:00:00Z',
      title: 'Essay Draft',
      totalPoints: 87.9,
    },
  });

  assert.deepEqual(fields, {
    assignmentId: 'assignment-3',
    canvasAssignmentId: 'canvas-55',
    canvasUrl: 'https://canvas.example/assignment/55',
    category: DEFAULT_TASK_CATEGORY,
    courseCode: 'ENG101',
    courseId: 'course-7',
    description: '<p>Draft the essay.</p>',
    dueAt: '2026-04-10T12:00:00.000Z',
    source: TASK_SOURCE,
    syncedFromCanvas: true,
    title: 'Essay Draft',
    updatedAt,
    userId: 'user-1',
    xpValue: 87,
  });
});

test('isCanvasLinkedTask recognizes multiple legacy and current link markers', () => {
  assert.equal(isCanvasLinkedTask({ syncedFromCanvas: true }), true);
  assert.equal(isCanvasLinkedTask({ source: 'canvas' }), true);
  assert.equal(isCanvasLinkedTask({ canvasAssignmentId: 'abc123' }), true);
  assert.equal(isCanvasLinkedTask({ source: 'manual' }), false);
});
