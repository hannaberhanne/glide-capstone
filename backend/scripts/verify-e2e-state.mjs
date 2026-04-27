import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { admin, db } from '../config/firebase.js';

const CONTEXT_PATH = path.resolve(process.cwd(), '../test-results/e2e/context.json');

async function readContext() {
  const raw = await fs.readFile(CONTEXT_PATH, 'utf8');
  return JSON.parse(raw);
}

async function waitForNotificationEvents(uid, requiredTypes, timeoutMs = 20000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const snap = await db.collection('notification_delivery_events')
      .where('userId', '==', uid)
      .get();

    const events = snap.docs.map((doc) => ({
      eventId: doc.id,
      ...doc.data(),
    }));

    const types = new Set(events.map((event) => event.eventType));
    if (requiredTypes.every((type) => types.has(type))) {
      return events;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const finalSnap = await db.collection('notification_delivery_events')
    .where('userId', '==', uid)
    .get();

  return finalSnap.docs.map((doc) => ({
    eventId: doc.id,
    ...doc.data(),
  }));
}

async function deleteCollectionByUserId(collectionName, uid) {
  const snap = await db.collection(collectionName).where('userId', '==', uid).get();
  if (snap.empty) return 0;

  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snap.size;
}

async function cleanup(uid) {
  const collections = [
    'notification_delivery_events',
    'user_device_tokens',
    'schedule_blocks',
    'tasks',
    'goals',
    'courses',
    'assignments',
    'events',
  ];

  for (const collection of collections) {
    await deleteCollectionByUserId(collection, uid);
  }

  await db.collection('users').doc(uid).delete().catch(() => {});
  await admin.auth().deleteUser(uid).catch(() => {});
}

async function main() {
  const context = await readContext();
  const { uid, email } = context;
  assert.ok(uid, 'Missing uid in e2e context');

  const userSnap = await db.collection('users').doc(uid).get();
  assert.equal(userSnap.exists, true, 'Expected created user document');
  const userData = userSnap.data();

  assert.equal(userData.email, email, 'Saved user email mismatch');
  assert.equal(userData.preferences?.notifications?.emailEnabled, true, 'Email notifications should be enabled');
  assert.equal(userData.preferences?.notifications?.pushEnabled, false, 'Push notifications should remain disabled');
  assert.equal(userData.preferences?.notifications?.notifyDailyPlanReady, true, 'Daily plan toggle should be enabled');
  assert.equal(userData.preferences?.notifications?.notifyMajorReplans, true, 'Major replan toggle should be enabled');

  const taskSnap = await db.collection('tasks')
    .where('userId', '==', uid)
    .where('title', '==', 'Cook dinner')
    .get();
  assert.equal(taskSnap.empty, false, 'Expected dashboard quick-add task to persist');

  const scheduleSnap = await db.collection('schedule_blocks')
    .where('userId', '==', uid)
    .get();
  assert.equal(scheduleSnap.empty, false, 'Expected generated schedule blocks');

  const events = await waitForNotificationEvents(uid, ['daily-plan-ready', 'major-replan']);
  const eventTypes = new Set(events.map((event) => event.eventType));
  assert.equal(eventTypes.has('daily-plan-ready'), true, 'Expected daily-plan-ready notification event');
  assert.equal(eventTypes.has('major-replan'), true, 'Expected major-replan notification event');

  const dailyPlanEmailEvent = events.find(
    (event) => event.eventType === 'daily-plan-ready' && event.channel === 'email'
  );
  assert.ok(dailyPlanEmailEvent, 'Expected queued or suppressed daily-plan-ready email event');

  console.log(`Verified e2e state for ${email}`);
  console.log(`Notification events found: ${events.length}`);

  await cleanup(uid);
  console.log(`Cleaned up temp user ${uid}`);
}

main().catch((error) => {
  console.error('E2E backend verification failed:', error);
  process.exitCode = 1;
});
