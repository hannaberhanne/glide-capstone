import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDueSoonTaskNotificationCandidate,
  buildNotificationDeliveryEvent,
  buildNotificationDedupeKey,
  buildNotificationEmailPayload,
  buildNotificationEmailTemplate,
  buildNotificationError,
  buildNotificationAuditMetadata,
  buildNotificationPushPayload,
  buildStreakRiskNotificationCandidate,
  buildUserDeviceTokenRecord,
  classifyNotificationFailure,
  createNotificationSenders,
  countActionableScheduleBlocks,
  findNotificationCooldownConflict,
  getNotificationCooldownMinutes,
  NOTIFICATION_MAX_RETRIES,
  purgeInactiveDeviceTokens,
  processNotificationEvent,
  queueCanvasWorkloadChangeNotification,
  registerUserDeviceToken,
  resolveNotificationTarget,
  resolveNotificationEvent,
  sendEmailNotification,
  sendPushNotification,
  updateUserDeviceToken,
  NOTIFICATION_DELIVERY_EVENT_COLLECTION,
  USER_DEVICE_TOKEN_COLLECTION,
} from '../services/notificationService.js';

test('exports canonical notification collections', () => {
  assert.equal(USER_DEVICE_TOKEN_COLLECTION, 'user_device_tokens');
  assert.equal(NOTIFICATION_DELIVERY_EVENT_COLLECTION, 'notification_delivery_events');
});

test('buildUserDeviceTokenRecord creates a multi-device-safe token model', () => {
  const record = buildUserDeviceTokenRecord({
    tokenId: 'tok-1',
    userId: 'user-1',
    token: 'device-token',
    platform: 'ios',
    now: '2026-04-27T00:00:00.000Z',
  });

  assert.equal(record.tokenId, 'tok-1');
  assert.equal(record.userId, 'user-1');
  assert.equal(record.provider, 'fcm');
  assert.equal(record.platform, 'ios');
  assert.equal(record.active, true);
  assert.equal(record.lastSeenAt, '2026-04-27T00:00:00.000Z');
});

test('buildNotificationDeliveryEvent creates a persisted event model with dedupe key', () => {
  const event = buildNotificationDeliveryEvent({
    eventId: 'evt-1',
    userId: 'user-1',
    eventType: 'due-soon-task',
    channel: 'push',
    dedupeKey: 'due-soon-task:user-1:task-1:window',
    relatedTaskId: 'task-1',
    metadata: { dueAt: '2026-04-27T09:00:00.000Z' },
    now: '2026-04-27T00:00:00.000Z',
  });

  assert.equal(event.eventId, 'evt-1');
  assert.equal(event.status, 'queued');
  assert.equal(event.retryCount, 0);
  assert.equal(event.relatedTaskId, 'task-1');
  assert.equal(event.dedupeKey, 'due-soon-task:user-1:task-1:window');
});

test('resolveNotificationEvent suppresses disabled push channel', () => {
  const result = resolveNotificationEvent({
    user: {
      timezone: 'America/New_York',
      preferences: {
        notifications: {
          pushEnabled: false,
          emailEnabled: true,
        },
      },
    },
    eventType: 'daily-plan-ready',
    channel: 'push',
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'channel-disabled');
});

test('resolveNotificationEvent suppresses disabled event trigger', () => {
  const result = resolveNotificationEvent({
    user: {
      timezone: 'America/New_York',
      preferences: {
        notifications: {
          pushEnabled: true,
          emailEnabled: true,
          notifyMissedBlocks: false,
        },
      },
    },
    eventType: 'missed-block',
    channel: 'push',
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'trigger-disabled');
});

test('resolveNotificationEvent allows send when quiet hours are blank', () => {
  const result = resolveNotificationEvent({
    user: {
      timezone: 'America/New_York',
      preferences: {
        notifications: {
          pushEnabled: true,
          emailEnabled: true,
          quietHoursStart: '',
          quietHoursEnd: '',
        },
      },
    },
    eventType: 'daily-plan-ready',
    channel: 'push',
    now: new Date('2026-04-27T15:00:00.000Z'),
  });

  assert.equal(result.allowed, true);
  assert.equal(result.reason, null);
});

test('resolveNotificationEvent suppresses inside same-day quiet hours', () => {
  const result = resolveNotificationEvent({
    user: {
      timezone: 'America/New_York',
      preferences: {
        notifications: {
          pushEnabled: true,
          emailEnabled: true,
          quietHoursStart: '09:00',
          quietHoursEnd: '17:00',
        },
      },
    },
    eventType: 'daily-plan-ready',
    channel: 'push',
    now: new Date('2026-04-27T14:30:00'),
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'quiet-hours');
});

test('resolveNotificationEvent suppresses inside overnight quiet hours', () => {
  const result = resolveNotificationEvent({
    user: {
      timezone: 'America/New_York',
      preferences: {
        notifications: {
          pushEnabled: true,
          emailEnabled: true,
          quietHoursStart: '22:00',
          quietHoursEnd: '07:00',
        },
      },
    },
    eventType: 'streak-risk',
    channel: 'push',
    now: new Date('2026-04-27T23:30:00'),
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'quiet-hours');
});

test('resolveNotificationEvent uses the user timezone for quiet hours', () => {
  const result = resolveNotificationEvent({
    user: {
      timezone: 'America/Los_Angeles',
      preferences: {
        notifications: {
          pushEnabled: true,
          emailEnabled: true,
          timezone: 'America/Los_Angeles',
          quietHoursStart: '09:00',
          quietHoursEnd: '17:00',
        },
      },
    },
    eventType: 'daily-plan-ready',
    channel: 'push',
    now: new Date('2026-04-27T19:30:00.000Z'),
  });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'quiet-hours');
});

test('buildNotificationDedupeKey composes stable keys', () => {
  const key = buildNotificationDedupeKey({
    eventType: 'due-soon-task',
    userId: 'user-1',
    taskId: 'task-1',
    windowKey: '2026-04-27T09',
  });

  assert.equal(key, 'due-soon-task:user-1:task-1:2026-04-27T09');
});

test('countActionableScheduleBlocks ignores breaks', () => {
  const count = countActionableScheduleBlocks([
    { type: 'task' },
    { type: 'routine' },
    { type: 'break' },
    { type: 'task' },
  ]);

  assert.equal(count, 3);
});

test('buildDueSoonTaskNotificationCandidate returns candidate for important due-soon task', () => {
  const candidate = buildDueSoonTaskNotificationCandidate({
    user: {
      userId: 'user-1',
      timezone: 'America/New_York',
      preferences: {
        notifications: {
          timezone: 'America/New_York',
        },
      },
    },
    task: {
      taskId: 'task-1',
      title: 'Study for exam',
      dueAt: '2026-04-27T09:00:00.000Z',
      priority: 'high',
      xpValue: 40,
      isComplete: false,
    },
    now: new Date('2026-04-27T02:00:00.000Z'),
  });

  assert.equal(candidate.eventType, 'due-soon-task');
  assert.equal(candidate.relatedTaskId, 'task-1');
  assert.equal(candidate.metadata.title, 'Study for exam');
});

test('buildDueSoonTaskNotificationCandidate skips non-urgent low-importance tasks', () => {
  const candidate = buildDueSoonTaskNotificationCandidate({
    user: {
      userId: 'user-1',
      timezone: 'America/New_York',
    },
    task: {
      taskId: 'task-1',
      title: 'Read article',
      dueAt: '2026-04-28T18:00:00.000Z',
      priority: 'low',
      xpValue: 10,
      isComplete: false,
    },
    now: new Date('2026-04-27T02:00:00.000Z'),
  });

  assert.equal(candidate, null);
});

test('buildStreakRiskNotificationCandidate returns candidate for active evening routine streak', () => {
  const candidate = buildStreakRiskNotificationCandidate({
    user: {
      userId: 'user-1',
      timezone: 'America/New_York',
      preferences: {
        notifications: {
          timezone: 'America/New_York',
        },
      },
    },
    goal: {
      goalId: 'goal-1',
      type: 'routine',
      title: 'Read 20 minutes',
      frequency: 'daily',
      streak: 6,
      completedToday: false,
      completionHistory: [],
    },
    now: new Date('2026-04-27T23:30:00.000Z'),
  });

  assert.equal(candidate.eventType, 'streak-risk');
  assert.equal(candidate.relatedGoalId, 'goal-1');
  assert.equal(candidate.metadata.currentStreak, 6);
});

test('buildStreakRiskNotificationCandidate skips routines outside evening risk window', () => {
  const candidate = buildStreakRiskNotificationCandidate({
    user: {
      userId: 'user-1',
      timezone: 'America/New_York',
    },
    goal: {
      goalId: 'goal-1',
      type: 'routine',
      title: 'Read 20 minutes',
      frequency: 'daily',
      streak: 6,
      completedToday: false,
      completionHistory: [],
    },
    now: new Date('2026-04-27T16:00:00.000Z'),
  });

  assert.equal(candidate, null);
});

test('queueCanvasWorkloadChangeNotification skips no-op sync summaries', async () => {
  const result = await queueCanvasWorkloadChangeNotification({
    userId: 'user-1',
    syncSummary: {
      materialTaskChanges: 1,
    },
  });

  assert.equal(result.skipped, 1);
  assert.equal(result.reason, 'below-threshold');
});

test('registerUserDeviceToken creates a new record for unseen token', async () => {
  const writes = [];
  const collection = {
    where() {
      return this;
    },
    async get() {
      return { empty: true, docs: [] };
    },
    doc(id = 'tok-1') {
      return {
        id,
        async set(payload) {
          writes.push({ id, payload });
        },
      };
    },
  };

  const result = await registerUserDeviceToken({
    userId: 'user-1',
    token: 'raw-token',
    platform: 'ios',
    collection,
    now: '2026-04-27T00:00:00.000Z',
  });

  assert.equal(result.created, true);
  assert.equal(result.record.platform, 'ios');
  assert.equal(writes.length, 1);
});

test('registerUserDeviceToken reactivates an existing token', async () => {
  const setCalls = [];
  const doc = {
    id: 'tok-1',
    data: () => ({ userId: 'user-1', token: 'raw-token', active: false }),
    ref: {
      async set(payload) {
        setCalls.push(payload);
      },
    },
  };

  const collection = {
    where() {
      return this;
    },
    async get() {
      return { empty: false, docs: [doc] };
    },
  };

  const result = await registerUserDeviceToken({
    userId: 'user-1',
    token: 'raw-token',
    collection,
    now: '2026-04-27T00:00:00.000Z',
  });

  assert.equal(result.created, false);
  assert.equal(result.reactivated, true);
  assert.equal(setCalls[0].active, true);
});

test('updateUserDeviceToken updates an owned token record', async () => {
  const mergeWrites = [];
  const collection = {
    doc() {
      return {
        async get() {
          return {
            exists: true,
            data: () => ({ userId: 'user-1', active: true, provider: 'fcm', platform: 'web' }),
          };
        },
        async set(payload) {
          mergeWrites.push(payload);
        },
      };
    },
  };

  const result = await updateUserDeviceToken({
    tokenId: 'tok-1',
    userId: 'user-1',
    active: false,
    collection,
    now: '2026-04-27T00:00:00.000Z',
  });

  assert.equal(result.active, false);
  assert.equal(mergeWrites[0].active, false);
});

test('buildNotificationPushPayload maps planner route and ids', () => {
  const payload = buildNotificationPushPayload({
    event: {
      eventType: 'major-replan',
      relatedTaskId: 'task-1',
      relatedGoalId: 'goal-1',
      relatedBlockId: 'block-1',
      metadata: {},
    },
    target: {
      tokens: ['token-a'],
    },
  });

  assert.equal(payload.notification.title, 'Glide');
  assert.equal(payload.data.route, '/planner');
  assert.equal(payload.data.relatedTaskId, 'task-1');
});

test('buildNotificationEmailTemplate maps daily plan ready copy', () => {
  const template = buildNotificationEmailTemplate({
    event: {
      eventType: 'daily-plan-ready',
      metadata: {},
    },
  });

  assert.equal(template.subject, 'Your Glide plan is ready');
  assert.match(template.text, /plan is ready/i);
});

test('buildNotificationEmailPayload maps resend payload fields', () => {
  const payload = buildNotificationEmailPayload({
    event: {
      eventType: 'due-soon-task',
      metadata: {
        title: 'Study for exam',
      },
    },
    target: {
      email: 'student@example.com',
    },
    fromEmail: 'Glide <team@example.com>',
    toEmailOverride: '',
  });

  assert.equal(payload.from, 'Glide <team@example.com>');
  assert.deepEqual(payload.to, ['student@example.com']);
  assert.match(payload.subject, /Study for exam/);
});

test('buildNotificationEmailPayload honors RESEND_TO_EMAIL style override', () => {
  const payload = buildNotificationEmailPayload({
    event: {
      eventType: 'daily-plan-ready',
      metadata: {},
    },
    target: {
      email: 'student@example.com',
    },
    fromEmail: 'Glide <team@example.com>',
    toEmailOverride: 'Glide <delivered@resend.dev>',
  });

  assert.deepEqual(payload.to, ['delivered@resend.dev']);
});

test('resolveNotificationTarget returns push tokens for active devices', async () => {
  const result = await resolveNotificationTarget({
    event: { channel: 'push', userId: 'user-1' },
    user: { userId: 'user-1' },
    loadTokens: async () => [
      { tokenId: 'tok-1', token: 'abc' },
      { tokenId: 'tok-2', token: 'xyz' },
    ],
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.target.tokens, ['abc', 'xyz']);
});

test('resolveNotificationTarget suppresses missing email channel', async () => {
  const result = await resolveNotificationTarget({
    event: { channel: 'email', userId: 'user-1' },
    user: { userId: 'user-1', email: '' },
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'missing-email-channel');
});

test('buildNotificationAuditMetadata preserves context and adds audit fields', () => {
  const metadata = buildNotificationAuditMetadata({
    metadata: { source: 'schedule-generate' },
    attemptedAt: '2026-04-27T00:00:00.000Z',
    suppressionReason: 'duplicate',
    processedChannels: ['push'],
  });

  assert.equal(metadata.source, 'schedule-generate');
  assert.equal(metadata.suppressionReason, 'duplicate');
  assert.equal(metadata.attemptedAt, '2026-04-27T00:00:00.000Z');
});

test('getNotificationCooldownMinutes returns configured windows', () => {
  assert.equal(getNotificationCooldownMinutes('major-replan', 'push'), 120);
  assert.equal(getNotificationCooldownMinutes('unknown-event', 'push'), 0);
});

test('findNotificationCooldownConflict detects recent queued or sent events', async () => {
  const collection = {
    where() {
      return this;
    },
    async get() {
      return {
        docs: [
          {
            id: 'evt-recent',
            data: () => ({
              eventType: 'major-replan',
              channel: 'push',
              status: 'sent',
              createdAt: '2026-04-27T11:30:00.000Z',
            }),
          },
          {
            id: 'evt-old',
            data: () => ({
              eventType: 'major-replan',
              channel: 'push',
              status: 'sent',
              createdAt: '2026-04-27T05:00:00.000Z',
            }),
          },
        ],
      };
    },
  };

  const conflict = await findNotificationCooldownConflict({
    userId: 'user-1',
    eventType: 'major-replan',
    channel: 'push',
    now: new Date('2026-04-27T12:00:00.000Z'),
    cooldownMinutes: 120,
    collection,
  });

  assert.equal(conflict.eventId, 'evt-recent');
});

test('classifyNotificationFailure preserves retryable error intent', () => {
  const failure = classifyNotificationFailure(
    buildNotificationError({
      message: 'Provider timeout',
      retryable: true,
      code: 'provider-timeout',
    })
  );

  assert.equal(failure.reason, 'provider-timeout');
  assert.equal(failure.retryable, true);
});

test('processNotificationEvent suppresses disabled channel', async () => {
  const updates = [];
  const result = await processNotificationEvent({
    event: {
      eventId: 'evt-1',
      userId: 'user-1',
      eventType: 'daily-plan-ready',
      channel: 'push',
      dedupeKey: 'daily-plan-ready:user-1:2026-04-27',
      retryCount: 0,
      metadata: {},
    },
    user: {
      userId: 'user-1',
      timezone: 'America/New_York',
      preferences: {
        notifications: {
          pushEnabled: false,
          emailEnabled: true,
        },
      },
    },
    persistUpdate: async (payload) => updates.push(payload),
  });

  assert.equal(result.status, 'suppressed');
  assert.equal(result.reason, 'channel-disabled');
  assert.equal(updates[0].updates.status, 'suppressed');
});

test('processNotificationEvent suppresses duplicate queued event', async () => {
  const updates = [];
  const result = await processNotificationEvent({
    event: {
      eventId: 'evt-1',
      userId: 'user-1',
      eventType: 'daily-plan-ready',
      channel: 'email',
      dedupeKey: 'daily-plan-ready:user-1:2026-04-27',
      retryCount: 0,
      metadata: {},
    },
    user: {
      userId: 'user-1',
      email: 'student@example.com',
      timezone: 'America/New_York',
      preferences: {
        notifications: {
          pushEnabled: true,
          emailEnabled: true,
        },
      },
    },
    hasDuplicate: async () => true,
    persistUpdate: async (payload) => updates.push(payload),
  });

  assert.equal(result.status, 'suppressed');
  assert.equal(result.reason, 'duplicate');
  assert.equal(updates[0].updates.metadata.suppressionReason, 'duplicate');
});

test('processNotificationEvent suppresses events inside cooldown window', async () => {
  const updates = [];
  const result = await processNotificationEvent({
    event: {
      eventId: 'evt-cooldown',
      userId: 'user-1',
      eventType: 'major-replan',
      channel: 'push',
      dedupeKey: 'major-replan:user-1:schedule-replan:2026-04-27',
      retryCount: 0,
      metadata: {},
    },
    user: {
      userId: 'user-1',
      timezone: 'America/New_York',
      preferences: {
        notifications: {
          pushEnabled: true,
          emailEnabled: true,
        },
      },
    },
    hasDuplicate: async () => false,
    findCooldownConflict: async () => ({
      eventId: 'evt-older',
      createdAt: '2026-04-27T11:45:00.000Z',
    }),
    persistUpdate: async (payload) => updates.push(payload),
  });

  assert.equal(result.status, 'suppressed');
  assert.equal(result.reason, 'cooldown');
  assert.equal(updates[0].updates.status, 'suppressed');
  assert.equal(updates[0].updates.metadata.suppressionReason, 'cooldown');
  assert.equal(updates[0].updates.metadata.cooldownWindowMinutes, 120);
});

test('processNotificationEvent sends through channel sender when eligible', async () => {
  const updates = [];
  let senderCalled = false;
  const result = await processNotificationEvent({
    event: {
      eventId: 'evt-1',
      userId: 'user-1',
      eventType: 'daily-plan-ready',
      channel: 'email',
      dedupeKey: 'daily-plan-ready:user-1:2026-04-27',
      retryCount: 0,
      metadata: { date: '2026-04-27' },
    },
    user: {
      userId: 'user-1',
      email: 'student@example.com',
      timezone: 'America/New_York',
      preferences: {
        notifications: {
          pushEnabled: true,
          emailEnabled: true,
        },
      },
    },
    hasDuplicate: async () => false,
    senders: {
      email: async () => {
        senderCalled = true;
        return { providerMessageId: 'msg-1' };
      },
    },
    persistUpdate: async (payload) => updates.push(payload),
  });

  assert.equal(senderCalled, true);
  assert.equal(result.status, 'sent');
  assert.equal(updates[0].updates.status, 'sent');
  assert.equal(updates[0].updates.metadata.providerMessageId, 'msg-1');
});

test('sendPushNotification deactivates invalid tokens and returns provider ids on success', async () => {
  const deactivated = [];
  const result = await sendPushNotification({
    event: {
      eventType: 'daily-plan-ready',
      relatedTaskId: null,
      relatedGoalId: null,
      relatedBlockId: null,
      metadata: {},
    },
    target: {
      tokens: ['token-a', 'token-b'],
      tokenIds: ['tok-1', 'tok-2'],
    },
    messagingClient: {
      async sendEachForMulticast() {
        return {
          successCount: 1,
          failureCount: 1,
          responses: [
            { success: true, messageId: 'msg-1' },
            { success: false, error: { code: 'messaging/registration-token-not-registered', message: 'bad token' } },
          ],
        };
      },
    },
    deactivateTokens: async ({ tokenIds }) => {
      deactivated.push(...tokenIds);
    },
  });

  assert.equal(result.providerMessageId, 'msg-1');
  assert.deepEqual(deactivated, ['tok-2']);
});

test('sendPushNotification throws retryable error when provider is temporarily unavailable', async () => {
  await assert.rejects(
    () =>
      sendPushNotification({
        event: {
          eventType: 'daily-plan-ready',
          metadata: {},
        },
        target: {
          tokens: ['token-a'],
          tokenIds: ['tok-1'],
        },
        messagingClient: {
          async sendEachForMulticast() {
            return {
              successCount: 0,
              failureCount: 1,
              responses: [
                { success: false, error: { code: 'messaging/server-unavailable', message: 'try later' } },
              ],
            };
          },
        },
      }),
    (error) => {
      assert.equal(error.retryable, true);
      assert.equal(error.code, 'messaging/server-unavailable');
      return true;
    }
  );
});

test('createNotificationSenders exposes a push sender', async () => {
  const senders = createNotificationSenders({
    messagingClient: {
      async sendEachForMulticast() {
        return {
          successCount: 1,
          failureCount: 0,
          responses: [{ success: true, messageId: 'msg-1' }],
        };
      },
    },
  });

  const result = await senders.push({
    event: {
      eventType: 'daily-plan-ready',
      metadata: {},
    },
    target: {
      tokens: ['token-a'],
      tokenIds: ['tok-1'],
    },
    now: new Date('2026-04-27T00:00:00.000Z'),
  });

  assert.equal(result.providerMessageId, 'msg-1');
});

test('sendEmailNotification returns provider id on resend success', async () => {
  const result = await sendEmailNotification({
    event: {
      eventType: 'daily-plan-ready',
      metadata: {},
    },
    target: {
      email: 'student@example.com',
    },
    resendApiKey: 'test-key',
    fromEmail: 'Glide <team@example.com>',
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return { id: 'email-123' };
      },
    }),
  });

  assert.equal(result.providerMessageId, 'email-123');
});

test('sendEmailNotification treats resend 5xx as retryable', async () => {
  await assert.rejects(
    () =>
      sendEmailNotification({
        event: {
          eventType: 'daily-plan-ready',
          metadata: {},
        },
        target: {
          email: 'student@example.com',
        },
        resendApiKey: 'test-key',
        fetchImpl: async () => ({
          ok: false,
          status: 503,
          async json() {
            return { message: 'temporary outage' };
          },
        }),
      }),
    (error) => {
      assert.equal(error.retryable, true);
      assert.equal(error.code, 'resend-503');
      return true;
    }
  );
});

test('sendEmailNotification treats resend 4xx as permanent', async () => {
  await assert.rejects(
    () =>
      sendEmailNotification({
        event: {
          eventType: 'daily-plan-ready',
          metadata: {},
        },
        target: {
          email: 'student@example.com',
        },
        resendApiKey: 'test-key',
        fetchImpl: async () => ({
          ok: false,
          status: 422,
          async json() {
            return { message: 'bad payload' };
          },
        }),
      }),
    (error) => {
      assert.equal(error.retryable, false);
      assert.equal(error.code, 'resend-422');
      return true;
    }
  );
});

test('createNotificationSenders exposes an email sender', async () => {
  let capturedBody = null;
  const senders = createNotificationSenders({
    fetchImpl: async (_url, init) => {
      capturedBody = JSON.parse(init.body);
      return {
        ok: true,
        async json() {
          return { id: 'email-123' };
        },
      };
    },
    resendApiKey: 'test-key',
    fromEmail: 'Glide <team@example.com>',
    toEmailOverride: '',
  });

  const result = await senders.email({
    event: {
      eventType: 'major-replan',
      metadata: {},
    },
    target: {
      email: 'student@example.com',
    },
  });

  assert.equal(result.providerMessageId, 'email-123');
  assert.equal(capturedBody.from, 'Glide <team@example.com>');
  assert.deepEqual(capturedBody.to, ['student@example.com']);
});

test('purgeInactiveDeviceTokens removes stale inactive records', async () => {
  const deletedIds = [];
  const collection = {
    where() {
      return this;
    },
    async get() {
      return {
        docs: [
          {
            id: 'tok-stale',
            data: () => ({
              active: false,
              lastSeenAt: '2026-03-01T00:00:00.000Z',
            }),
            ref: { id: 'tok-stale' },
          },
          {
            id: 'tok-fresh',
            data: () => ({
              active: false,
              lastSeenAt: '2026-04-20T00:00:00.000Z',
            }),
            ref: { id: 'tok-fresh' },
          },
        ],
      };
    },
  };

  const batch = {
    delete(ref) {
      deletedIds.push(ref.id);
    },
    async commit() {},
  };

  const result = await purgeInactiveDeviceTokens({
    olderThanDays: 30,
    now: new Date('2026-04-27T00:00:00.000Z'),
    collection,
    createBatch: () => batch,
  });

  assert.equal(result.deletedCount, 1);
  assert.deepEqual(deletedIds, ['tok-stale']);
});

test('processNotificationEvent records retryable failure and increments retry count', async () => {
  const updates = [];
  const result = await processNotificationEvent({
    event: {
      eventId: 'evt-1',
      userId: 'user-1',
      eventType: 'daily-plan-ready',
      channel: 'email',
      dedupeKey: 'daily-plan-ready:user-1:2026-04-27',
      retryCount: 1,
      metadata: {},
    },
    user: {
      userId: 'user-1',
      email: 'student@example.com',
      timezone: 'America/New_York',
      preferences: {
        notifications: {
          pushEnabled: true,
          emailEnabled: true,
        },
      },
    },
    hasDuplicate: async () => false,
    senders: {
      email: async () => {
        throw buildNotificationError({
          message: 'Temporary outage',
          retryable: true,
          code: 'provider-timeout',
        });
      },
    },
    persistUpdate: async (payload) => updates.push(payload),
  });

  assert.equal(result.status, 'failed');
  assert.equal(result.retryable, true);
  assert.equal(result.retryCount, 2);
  assert.equal(updates[0].updates.retryCount, 2);
  assert.equal(updates[0].updates.metadata.lastError, 'Temporary outage');
});

test('processNotificationEvent stops at retry limit without calling sender', async () => {
  const updates = [];
  let senderCalled = false;
  const result = await processNotificationEvent({
    event: {
      eventId: 'evt-1',
      userId: 'user-1',
      eventType: 'daily-plan-ready',
      channel: 'email',
      dedupeKey: 'daily-plan-ready:user-1:2026-04-27',
      retryCount: NOTIFICATION_MAX_RETRIES,
      metadata: {},
    },
    user: {
      userId: 'user-1',
      email: 'student@example.com',
      timezone: 'America/New_York',
      preferences: {
        notifications: {
          pushEnabled: true,
          emailEnabled: true,
        },
      },
    },
    senders: {
      email: async () => {
        senderCalled = true;
        return { providerMessageId: 'msg-1' };
      },
    },
    persistUpdate: async (payload) => updates.push(payload),
  });

  assert.equal(senderCalled, false);
  assert.equal(result.status, 'failed');
  assert.equal(result.reason, 'retry-limit');
  assert.equal(updates[0].updates.status, 'failed');
});
