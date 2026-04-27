import assert from 'node:assert/strict';
import { db } from '../config/firebase.js';
import {
  buildDueSoonTaskNotificationCandidate,
  buildStreakRiskNotificationCandidate,
  processNotificationEvent,
  queueDailyPlanReadyNotification,
  queueMajorReplanNotification,
  queueNotificationEvent,
  registerUserDeviceToken,
  sendPushNotification,
  purgeInactiveDeviceTokens,
} from '../services/notificationService.js';

function makeUser(uid) {
  return {
    userId: uid,
    email: `${uid}@example.com`,
    timezone: 'America/New_York',
    preferences: {
      notifications: {
        pushEnabled: true,
        emailEnabled: true,
        quietHoursStart: '',
        quietHoursEnd: '',
        timezone: 'America/New_York',
        notifyDailyPlanReady: true,
        notifyMissedBlocks: true,
        notifyDueSoonTasks: true,
        notifyStreakRisk: true,
        notifyMajorReplans: true,
      },
    },
  };
}

async function deleteCollectionByUserId(collectionName, uid) {
  const snap = await db.collection(collectionName).where('userId', '==', uid).get();
  if (snap.empty) return;

  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

async function cleanup(uid) {
  await deleteCollectionByUserId('notification_delivery_events', uid);
  await deleteCollectionByUserId('user_device_tokens', uid);
  await db.collection('users').doc(uid).delete().catch(() => {});
}

async function main() {
  const uid = `notification-smoke-${Date.now()}`;
  const user = makeUser(uid);

  try {
    await db.collection('users').doc(uid).set(user);

    const dailyPlan = await queueDailyPlanReadyNotification({
      userId: uid,
      date: '2026-04-27',
      blocksCreated: 4,
      actionableBlocksCreated: 3,
      rationale: 'Smoke test',
      now: new Date('2026-04-27T13:00:00.000Z'),
    });
    assert.equal(dailyPlan.queued, 2);

    const majorReplan = await queueMajorReplanNotification({
      userId: uid,
      date: '2026-04-27',
      plannedWindowStart: '2026-04-27',
      plannedWindowEnd: '2026-05-03',
      blocksCreated: 6,
      actionableBlocksCreated: 5,
      now: new Date('2026-04-27T13:05:00.000Z'),
    });
    assert.equal(majorReplan.queued, 2);

    const dueSoonCandidate = buildDueSoonTaskNotificationCandidate({
      user,
      task: {
        taskId: 'task-smoke',
        title: 'Study for midterm',
        dueAt: '2026-04-27T20:00:00.000Z',
        priority: 'high',
        xpValue: 60,
        isComplete: false,
      },
      now: new Date('2026-04-27T13:00:00.000Z'),
    });
    assert.ok(dueSoonCandidate);

    const streakRiskCandidate = buildStreakRiskNotificationCandidate({
      user,
      goal: {
        goalId: 'goal-smoke',
        type: 'routine',
        title: 'Read 20 minutes',
        frequency: 'daily',
        streak: 4,
        completedToday: false,
        completionHistory: [],
      },
      now: new Date('2026-04-27T23:15:00.000Z'),
    });
    assert.ok(streakRiskCandidate);

    await queueNotificationEvent({
      userId: uid,
      ...dueSoonCandidate,
      now: new Date('2026-04-27T13:00:00.000Z'),
    });
    await queueNotificationEvent({
      userId: uid,
      ...streakRiskCandidate,
      now: new Date('2026-04-27T23:15:00.000Z'),
    });

    const eventSnap = await db.collection('notification_delivery_events')
      .where('userId', '==', uid)
      .get();
    const events = eventSnap.docs.map((doc) => ({
      eventId: doc.id,
      ...doc.data(),
    }));

    const dailyPlanEmailEvent = events.find((event) => event.eventType === 'daily-plan-ready' && event.channel === 'email');
    const dailyPlanPushEvent = events.find((event) => event.eventType === 'daily-plan-ready' && event.channel === 'push');
    const replanPushEvent = events.find((event) => event.eventType === 'major-replan' && event.channel === 'push');
    const dueSoonEmailEvent = events.find((event) => event.eventType === 'due-soon-task' && event.channel === 'email');
    assert.ok(dailyPlanEmailEvent);
    assert.ok(dailyPlanPushEvent);
    assert.ok(replanPushEvent);
    assert.ok(dueSoonEmailEvent);

    const sentEmail = await processNotificationEvent({
      event: dailyPlanEmailEvent,
      user,
      now: new Date('2026-04-27T13:10:00.000Z'),
      senders: {
        email: async () => ({ providerMessageId: 'email-smoke-1' }),
      },
    });
    assert.equal(sentEmail.status, 'sent');

    const suppressedPush = await processNotificationEvent({
      event: dailyPlanPushEvent,
      user,
      now: new Date('2026-04-27T13:10:00.000Z'),
      senders: {
        push: async () => ({ providerMessageId: 'push-should-not-run' }),
      },
    });
    assert.equal(suppressedPush.status, 'suppressed');
    assert.equal(suppressedPush.reason, 'missing-device-token');

    await registerUserDeviceToken({
      userId: uid,
      token: 'fake-fcm-token',
      platform: 'web',
      provider: 'fcm',
      now: '2026-04-27T13:11:00.000Z',
    });

    const sentPush = await processNotificationEvent({
      event: replanPushEvent,
      user,
      now: new Date('2026-04-27T13:12:00.000Z'),
      senders: {
        push: async () => ({ providerMessageId: 'push-smoke-1' }),
      },
    });
    assert.equal(sentPush.status, 'sent');

    const cooldownEventRef = db.collection('notification_delivery_events').doc();
    await cooldownEventRef.set({
      userId: uid,
      eventType: 'major-replan',
      channel: 'push',
      status: 'queued',
      retryCount: 0,
      dedupeKey: `major-replan:${uid}:planner-manual:2026-04-27`,
      metadata: { source: 'smoke-cooldown' },
      createdAt: new Date('2026-04-27T13:20:00.000Z'),
      updatedAt: new Date('2026-04-27T13:20:00.000Z'),
    });

    const cooldownCandidateRef = db.collection('notification_delivery_events').doc();
    await cooldownCandidateRef.set({
      userId: uid,
      eventType: 'major-replan',
      channel: 'push',
      status: 'queued',
      retryCount: 0,
      dedupeKey: `major-replan:${uid}:planner-manual:2026-04-27:second`,
      metadata: { source: 'smoke-candidate' },
      createdAt: new Date('2026-04-27T13:25:00.000Z'),
      updatedAt: new Date('2026-04-27T13:25:00.000Z'),
    });

    const cooldownEvent = {
      eventId: cooldownCandidateRef.id,
      userId: uid,
      eventType: 'major-replan',
      channel: 'push',
      dedupeKey: `major-replan:${uid}:planner-manual:2026-04-27:second`,
      retryCount: 0,
      metadata: {},
    };

    const cooldownResult = await processNotificationEvent({
      event: cooldownEvent,
      user,
      now: new Date('2026-04-27T13:25:00.000Z'),
      senders: {
        push: async () => ({ providerMessageId: 'push-smoke-2' }),
      },
    });
    assert.equal(cooldownResult.status, 'suppressed');
    assert.equal(cooldownResult.reason, 'cooldown');

    const retryableEvent = {
      eventId: 'evt-retryable',
      userId: uid,
      eventType: 'due-soon-task',
      channel: 'email',
      dedupeKey: `due-soon-task:${uid}:task-smoke:2026-04-27T20`,
      retryCount: 0,
      metadata: {},
    };
    const retryableResult = await processNotificationEvent({
      event: retryableEvent,
      user,
      now: new Date('2026-04-27T13:30:00.000Z'),
      senders: {
        email: async () => {
          const error = new Error('Temporary outage');
          error.retryable = true;
          error.code = 'provider-timeout';
          throw error;
        },
      },
      persistUpdate: async () => {},
    });
    assert.equal(retryableResult.status, 'failed');
    assert.equal(retryableResult.retryable, true);
    assert.equal(retryableResult.retryCount, 1);

    const deactivatedTokenIds = [];
    const invalidPushResult = await sendPushNotification({
      event: { eventType: 'major-replan', metadata: {} },
      target: {
        tokens: ['fake-fcm-token'],
        tokenIds: ['tok-invalid'],
      },
      messagingClient: {
        async sendEachForMulticast() {
          return {
            successCount: 0,
            failureCount: 1,
            responses: [
              {
                success: false,
                error: {
                  code: 'messaging/registration-token-not-registered',
                  message: 'Token expired',
                },
              },
            ],
          };
        },
      },
      deactivateTokens: async ({ tokenIds }) => {
        deactivatedTokenIds.push(...tokenIds);
      },
    }).catch((error) => error);
    assert.equal(invalidPushResult.code, 'invalid-device-token');
    assert.deepEqual(deactivatedTokenIds, ['tok-invalid']);

    const purgeCollection = {
      where() {
        return this;
      },
      async get() {
        return {
          docs: [
            {
              ref: { id: 'tok-stale' },
              data: () => ({
                active: false,
                lastSeenAt: '2026-03-01T00:00:00.000Z',
              }),
            },
          ],
        };
      },
    };
    const purged = [];
    const purgeResult = await purgeInactiveDeviceTokens({
      olderThanDays: 30,
      now: new Date('2026-04-27T00:00:00.000Z'),
      collection: purgeCollection,
      createBatch: () => ({
        delete(ref) {
          purged.push(ref.id);
        },
        async commit() {},
      }),
    });
    assert.equal(purgeResult.deletedCount, 1);
    assert.deepEqual(purged, ['tok-stale']);

    console.log(`Notification hardening smoke passed for ${uid}`);
  } finally {
    await cleanup(uid);
  }
}

main().catch((error) => {
  console.error('Notification hardening smoke failed:', error);
  process.exitCode = 1;
});
