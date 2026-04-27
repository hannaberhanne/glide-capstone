import { admin, db } from '../config/firebase.js';
import { resolveNotificationEligibility } from '../domain/notificationPreferences.js';

export const USER_DEVICE_TOKEN_COLLECTION = 'user_device_tokens';
export const NOTIFICATION_DELIVERY_EVENT_COLLECTION = 'notification_delivery_events';
export const NOTIFICATION_MAX_RETRIES = 3;
const DEFAULT_CHANNELS = ['push', 'email'];
const ACTIONABLE_BLOCK_TYPES = new Set(['task', 'routine']);
const IMPORTANT_TASK_XP_THRESHOLD = 50;
const DUE_SOON_WINDOW_HOURS = 12;
const STREAK_RISK_START_HOUR = 18;
const STREAK_RISK_END_HOUR = 21;
export const NOTIFICATION_COOLDOWN_MINUTES = {
  'daily-plan-ready': { push: 180, email: 360 },
  'major-replan': { push: 120, email: 180 },
  'due-soon-task': { push: 120, email: 180 },
  'streak-risk': { push: 240, email: 240 },
  'missed-block': { push: 60, email: 120 },
};

export function buildUserDeviceTokenRecord({
  tokenId,
  userId,
  token,
  provider = 'fcm',
  platform = 'web',
  active = true,
  now = new Date().toISOString(),
}) {
  return {
    tokenId: tokenId || null,
    userId,
    provider,
    token,
    platform,
    active,
    lastSeenAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildNotificationDeliveryEvent({
  eventId,
  userId,
  eventType,
  channel,
  dedupeKey,
  status = 'queued',
  retryCount = 0,
  relatedTaskId = null,
  relatedGoalId = null,
  relatedBlockId = null,
  metadata = {},
  now = new Date().toISOString(),
}) {
  return {
    eventId: eventId || null,
    userId,
    eventType,
    channel,
    status,
    retryCount,
    dedupeKey,
    relatedTaskId,
    relatedGoalId,
    relatedBlockId,
    metadata,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildNotificationError({ message, retryable = false, code = null }) {
  const error = new Error(message);
  error.retryable = retryable;
  if (code) {
    error.code = code;
  }
  return error;
}

function toEpochMillis(value) {
  if (!value) return null;
  if (typeof value?.toMillis === 'function') {
    return value.toMillis();
  }
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function getUserDeviceTokenCollection() {
  return db.collection(USER_DEVICE_TOKEN_COLLECTION);
}

export async function listUserDeviceTokens({
  userId,
  collection = getUserDeviceTokenCollection(),
}) {
  const snap = await collection.where('userId', '==', userId).get();
  return snap.docs.map((doc) => ({
    tokenId: doc.id,
    ...doc.data(),
  }));
}

export function resolveNotificationEvent({
  user,
  eventType,
  channel,
  now = new Date(),
}) {
  return resolveNotificationEligibility({
    user,
    eventType,
    channel,
    now,
  });
}

function normalizeEventMetadata(metadata) {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? { ...metadata }
    : {};
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function getTimeZoneParts(date, timezone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  });

  const parts = formatter.formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value ?? '';
  const weekdayMap = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    second: Number(get('second')),
    weekdayShort: get('weekday'),
    dayIndex: weekdayMap[get('weekday')] ?? null,
    dateKey: `${get('year')}-${get('month')}-${get('day')}`,
  };
}

function startOfHourKey(date, timezone) {
  const parts = getTimeZoneParts(date, timezone);
  return `${parts.dateKey}T${pad(parts.hour)}`;
}

function isRoutineScheduledForToday(goal, localDayIndex) {
  if (!goal || goal.type !== 'routine') {
    return false;
  }

  if (goal.frequency !== 'weekly') {
    return true;
  }

  return Array.isArray(goal.targetDays) && goal.targetDays.includes(localDayIndex);
}

function isTaskImportant(task, hoursUntilDue) {
  if (!task) return false;
  const priority = String(task.priority || '').toLowerCase();
  const xpValue = Number(task.xpValue) || 0;
  return priority === 'high' || xpValue >= IMPORTANT_TASK_XP_THRESHOLD || hoursUntilDue <= 3;
}

export function buildNotificationDedupeKey({
  eventType,
  userId,
  date,
  taskId,
  goalId,
  source,
  windowKey,
}) {
  const parts = [eventType, userId];
  if (taskId) parts.push(taskId);
  if (goalId) parts.push(goalId);
  if (source) parts.push(source);
  if (date) parts.push(date);
  if (windowKey) parts.push(windowKey);
  return parts.join(':');
}

function buildPushRoute(event) {
  switch (event.eventType) {
    case 'daily-plan-ready':
    case 'major-replan':
      return '/planner';
    case 'streak-risk':
      return '/goals';
    case 'due-soon-task':
    case 'missed-block':
    default:
      return '/dashboard';
  }
}

export function buildPushNotificationContent({ event }) {
  const metadata = normalizeEventMetadata(event.metadata);

  switch (event.eventType) {
    case 'daily-plan-ready':
      return {
        title: 'Glide',
        body: 'Your plan is ready.',
      };
    case 'major-replan':
      return {
        title: 'Glide',
        body: 'Your schedule changed. Review the new plan.',
      };
    case 'due-soon-task':
      return {
        title: 'Glide',
        body: metadata.title
          ? `${metadata.title} is due soon.`
          : 'You have a task due soon.',
      };
    case 'streak-risk':
      return {
        title: 'Glide',
        body: metadata.title
          ? `Your ${metadata.title} streak is at risk.`
          : 'One of your routines is at risk.',
      };
    case 'missed-block':
      return {
        title: 'Glide',
        body: 'You missed a planned block. Jump back in when you can.',
      };
    default:
      return {
        title: 'Glide',
        body: 'You have a new update.',
      };
  }
}

export function buildNotificationEmailTemplate({ event }) {
  const metadata = normalizeEventMetadata(event.metadata);
  const route = buildPushRoute(event);

  switch (event.eventType) {
    case 'daily-plan-ready':
      return {
        subject: 'Your Glide plan is ready',
        text: 'Your day plan is ready. Open Glide to review it.',
        html: `<p>Your day plan is ready. Open Glide to review it.</p><p><a href="${route}">Open Planner</a></p>`,
      };
    case 'major-replan':
      return {
        subject: 'Your Glide schedule changed',
        text: 'Your workload changed and Glide has a new plan ready for review.',
        html: `<p>Your workload changed and Glide has a new plan ready for review.</p><p><a href="${route}">Review the plan</a></p>`,
      };
    case 'due-soon-task':
      return {
        subject: metadata.title ? `${metadata.title} is due soon` : 'A task is due soon',
        text: metadata.title
          ? `${metadata.title} is due soon. Open Glide to see the details.`
          : 'You have a task due soon. Open Glide to see the details.',
        html: `<p>${metadata.title ? `<strong>${metadata.title}</strong> is due soon.` : 'You have a task due soon.'}</p><p><a href="${route}">Open Dashboard</a></p>`,
      };
    case 'streak-risk':
      return {
        subject: metadata.title ? `Your ${metadata.title} streak is at risk` : 'A routine streak is at risk',
        text: metadata.title
          ? `Your ${metadata.title} streak is at risk. Open Glide to stay on track.`
          : 'One of your routine streaks is at risk. Open Glide to stay on track.',
        html: `<p>${metadata.title ? `Your <strong>${metadata.title}</strong> streak is at risk.` : 'One of your routine streaks is at risk.'}</p><p><a href="${route}">Open Goals</a></p>`,
      };
    case 'missed-block':
      return {
        subject: 'You missed a Glide block',
        text: 'One of your planned blocks was missed. Open Glide to reset the day.',
        html: `<p>One of your planned blocks was missed. Open Glide to reset the day.</p><p><a href="${route}">Open Dashboard</a></p>`,
      };
    default:
      return {
        subject: 'Glide update',
        text: 'You have a new update in Glide.',
        html: `<p>You have a new update in Glide.</p><p><a href="${route}">Open Glide</a></p>`,
      };
  }
}

export function buildNotificationPushPayload({ event, target }) {
  const { title, body } = buildPushNotificationContent({ event });
  return {
    tokens: target.tokens,
    notification: {
      title,
      body,
    },
    data: {
      eventType: event.eventType,
      route: buildPushRoute(event),
      relatedTaskId: event.relatedTaskId || '',
      relatedGoalId: event.relatedGoalId || '',
      relatedBlockId: event.relatedBlockId || '',
    },
  };
}

export function buildNotificationEmailPayload({
  event,
  target,
  fromEmail = process.env.GLIDE_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'Glide <notifications@glideapp.dev>',
  toEmailOverride = process.env.RESEND_TO_EMAIL || '',
}) {
  const template = buildNotificationEmailTemplate({ event });
  const resolvedToEmail = typeof toEmailOverride === 'string' && toEmailOverride.trim()
    ? toEmailOverride.trim().match(/<([^>]+)>/)?.[1] || toEmailOverride.trim()
    : target.email;
  return {
    from: fromEmail,
    to: [resolvedToEmail],
    subject: template.subject,
    text: template.text,
    html: template.html,
  };
}

async function loadUser(userId) {
  const userSnap = await db.collection('users').doc(userId).get();
  if (!userSnap.exists) {
    return null;
  }
  return { userId, ...userSnap.data() };
}

async function loadActiveDeviceTokens(userId) {
  const snap = await getUserDeviceTokenCollection()
    .where('userId', '==', userId)
    .where('active', '==', true)
    .get();

  return snap.docs.map((doc) => ({
    tokenId: doc.id,
    ...doc.data(),
  }));
}

export async function registerUserDeviceToken({
  userId,
  token,
  provider = 'fcm',
  platform = 'web',
  now = new Date().toISOString(),
  collection = getUserDeviceTokenCollection(),
}) {
  const normalizedToken = typeof token === 'string' ? token.trim() : '';
  if (!userId || !normalizedToken) {
    throw new Error('userId and token are required');
  }

  const existingSnap = await collection
    .where('userId', '==', userId)
    .where('token', '==', normalizedToken)
    .get();

  if (!existingSnap.empty) {
    const doc = existingSnap.docs[0];
    const updates = {
      provider,
      platform,
      active: true,
      lastSeenAt: now,
      updatedAt: now,
    };
    await doc.ref.set(updates, { merge: true });
    return {
      tokenId: doc.id,
      created: false,
      reactivated: true,
      record: {
        tokenId: doc.id,
        ...doc.data(),
        ...updates,
        token: normalizedToken,
      },
    };
  }

  const ref = collection.doc();
  const record = buildUserDeviceTokenRecord({
    tokenId: ref.id,
    userId,
    token: normalizedToken,
    provider,
    platform,
    active: true,
    now,
  });
  await ref.set(record);

  return {
    tokenId: ref.id,
    created: true,
    reactivated: false,
    record,
  };
}

export async function updateUserDeviceToken({
  tokenId,
  userId,
  active,
  platform,
  provider,
  now = new Date().toISOString(),
  collection = getUserDeviceTokenCollection(),
}) {
  const ref = collection.doc(tokenId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error('Token not found');
  }

  const data = snap.data();
  if (data.userId !== userId) {
    throw new Error('Not authorized to update this token');
  }

  const updates = {
    updatedAt: now,
  };
  if (typeof active === 'boolean') updates.active = active;
  if (platform) updates.platform = platform;
  if (provider) updates.provider = provider;

  await ref.set(updates, { merge: true });

  return {
    tokenId,
    ...data,
    ...updates,
  };
}

export async function deactivateUserDeviceTokens({
  tokenIds = [],
  now = new Date().toISOString(),
  collection = getUserDeviceTokenCollection(),
}) {
  const ids = tokenIds.filter(Boolean);
  if (!ids.length) {
    return { deactivatedCount: 0 };
  }

  const batch = db.batch();
  ids.forEach((tokenId) => {
    batch.set(
      collection.doc(tokenId),
      {
        active: false,
        updatedAt: now,
      },
      { merge: true }
    );
  });
  await batch.commit();
  return { deactivatedCount: ids.length };
}

async function findExistingNotificationDuplicate({
  userId,
  dedupeKey,
  channel,
  excludeEventId = null,
}) {
  const snap = await db.collection(NOTIFICATION_DELIVERY_EVENT_COLLECTION)
    .where('userId', '==', userId)
    .where('channel', '==', channel)
    .where('dedupeKey', '==', dedupeKey)
    .where('status', 'in', ['queued', 'sent'])
    .get();

  return snap.docs.some((doc) => doc.id !== excludeEventId);
}

export function getNotificationCooldownMinutes(eventType, channel) {
  const eventCooldown = NOTIFICATION_COOLDOWN_MINUTES[eventType];
  if (!eventCooldown) return 0;
  return Number(eventCooldown[channel]) || 0;
}

export async function findNotificationCooldownConflict({
  userId,
  eventType,
  channel,
  now = new Date(),
  cooldownMinutes = getNotificationCooldownMinutes(eventType, channel),
  excludeEventId = null,
  collection = db.collection(NOTIFICATION_DELIVERY_EVENT_COLLECTION),
}) {
  if (!cooldownMinutes || cooldownMinutes <= 0) {
    return null;
  }

  const cutoffMs = now.getTime() - (cooldownMinutes * 60 * 1000);
  const snap = await collection.where('userId', '==', userId).get();

  const matches = snap.docs
    .map((doc) => ({
      eventId: doc.id,
      ...doc.data(),
    }))
    .filter((entry) => {
      if (entry.eventId === excludeEventId) return false;
      if (entry.eventType !== eventType) return false;
      if (entry.channel !== channel) return false;
      if (!['queued', 'sent'].includes(entry.status)) return false;
      const createdAtMs = toEpochMillis(entry.createdAt) ?? toEpochMillis(entry.updatedAt);
      return createdAtMs !== null && createdAtMs >= cutoffMs;
    })
    .sort((left, right) => {
      const leftMs = toEpochMillis(left.createdAt) ?? toEpochMillis(left.updatedAt) ?? 0;
      const rightMs = toEpochMillis(right.createdAt) ?? toEpochMillis(right.updatedAt) ?? 0;
      return rightMs - leftMs;
    });

  return matches[0] || null;
}

function getSuppressedResult({ reason, eventId }) {
  return {
    status: 'suppressed',
    suppressed: true,
    sent: false,
    failed: false,
    reason,
    eventId,
  };
}

function getFailedResult({ reason, retryable, eventId, retryCount }) {
  return {
    status: 'failed',
    suppressed: false,
    sent: false,
    failed: true,
    reason,
    retryable,
    eventId,
    retryCount,
  };
}

function getSentResult({ eventId, providerMessageId = null, target = null }) {
  return {
    status: 'sent',
    suppressed: false,
    sent: true,
    failed: false,
    reason: null,
    eventId,
    providerMessageId,
    target,
  };
}

export function isRetryableNotificationError(error) {
  return Boolean(error?.retryable);
}

export function classifyNotificationFailure(error) {
  if (!error) {
    return {
      reason: 'unknown-error',
      retryable: false,
      message: 'Unknown notification error',
    };
  }

  return {
    reason: error.code || 'delivery-error',
    retryable: isRetryableNotificationError(error),
    message: error.message || 'Notification delivery failed',
  };
}

export async function resolveNotificationTarget({
  event,
  user,
  loadTokens = loadActiveDeviceTokens,
}) {
  if (event.channel === 'push') {
    const tokens = await loadTokens(user.userId || event.userId);
    if (!tokens.length) {
      return { ok: false, reason: 'missing-device-token' };
    }
    return {
      ok: true,
      target: {
        provider: 'fcm',
        tokens: tokens.map((token) => token.token),
        tokenIds: tokens.map((token) => token.tokenId),
      },
    };
  }

  if (event.channel === 'email') {
    const email = typeof user.email === 'string' ? user.email.trim() : '';
    if (!email) {
      return { ok: false, reason: 'missing-email-channel' };
    }
    return {
      ok: true,
      target: {
        provider: 'resend',
        email,
      },
    };
  }

  return { ok: false, reason: 'unsupported-channel' };
}

export function buildNotificationAuditMetadata({
  metadata = {},
  attemptedAt,
  suppressionReason = null,
  providerMessageId = null,
  lastError = null,
  processedChannels = [],
  target = null,
}) {
  const safeTarget = target
    ? target.provider === 'fcm'
      ? {
          provider: target.provider,
          tokenIds: Array.isArray(target.tokenIds) ? target.tokenIds : [],
          tokenCount: Array.isArray(target.tokens) ? target.tokens.length : 0,
        }
      : {
          provider: target.provider,
          email: target.email || null,
        }
    : null;

  return {
    ...normalizeEventMetadata(metadata),
    suppressionReason,
    providerMessageId,
    lastError,
    processedChannels,
    attemptedAt,
    target: safeTarget,
  };
}

export async function purgeInactiveDeviceTokens({
  olderThanDays = 30,
  now = new Date(),
  collection = getUserDeviceTokenCollection(),
  createBatch = () => db.batch(),
}) {
  const cutoffMs = now.getTime() - (olderThanDays * 24 * 60 * 60 * 1000);
  const snap = await collection.where('active', '==', false).get();

  const staleDocs = snap.docs.filter((doc) => {
    const data = doc.data();
    const lastSeenMs = toEpochMillis(data.lastSeenAt) ?? toEpochMillis(data.updatedAt);
    return lastSeenMs !== null && lastSeenMs < cutoffMs;
  });

  if (!staleDocs.length) {
    return { deletedCount: 0 };
  }

  const batch = createBatch();
  staleDocs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  return { deletedCount: staleDocs.length };
}

function isInvalidPushTokenError(code) {
  return code === 'messaging/invalid-registration-token' ||
    code === 'messaging/registration-token-not-registered';
}

export async function sendPushNotification({
  event,
  target,
  now = new Date(),
  messagingClient = admin.messaging(),
  deactivateTokens = deactivateUserDeviceTokens,
}) {
  const payload = buildNotificationPushPayload({ event, target });
  const response = await messagingClient.sendEachForMulticast(payload);

  const invalidTokenIds = [];
  let transientFailureCount = 0;
  let permanentFailureCount = 0;
  let lastTransientError = null;

  response.responses.forEach((entry, index) => {
    if (entry.success) {
      return;
    }

    const code = entry.error?.code || null;
    if (isInvalidPushTokenError(code)) {
      if (target.tokenIds?.[index]) {
        invalidTokenIds.push(target.tokenIds[index]);
      }
      permanentFailureCount += 1;
      return;
    }

    if (code && code.startsWith('messaging/')) {
      transientFailureCount += 1;
      lastTransientError = entry.error;
      return;
    }

    permanentFailureCount += 1;
  });

  if (invalidTokenIds.length) {
    await deactivateTokens({
      tokenIds: invalidTokenIds,
      now: now.toISOString(),
    });
  }

  if (response.successCount > 0) {
    return {
      providerMessageId: response.responses
        .map((entry) => entry.messageId)
        .filter(Boolean)
        .join(',') || null,
      successCount: response.successCount,
      failureCount: response.failureCount,
      invalidatedTokenIds: invalidTokenIds,
    };
  }

  if (transientFailureCount === response.responses.length && lastTransientError) {
    throw buildNotificationError({
      message: lastTransientError.message || 'Push provider temporary failure',
      retryable: true,
      code: lastTransientError.code || 'push-provider-failure',
    });
  }

  if (permanentFailureCount === response.responses.length) {
    throw buildNotificationError({
      message: 'All push targets were invalid or permanently rejected',
      retryable: false,
      code: 'invalid-device-token',
    });
  }

  throw buildNotificationError({
    message: 'Push delivery failed',
    retryable: transientFailureCount > 0,
    code: transientFailureCount > 0 ? 'push-partial-failure' : 'push-delivery-failed',
  });
}

export async function sendEmailNotification({
  event,
  target,
  fetchImpl = fetch,
  resendApiKey = process.env.RESEND_API_KEY,
  fromEmail = process.env.GLIDE_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'Glide <notifications@glideapp.dev>',
  toEmailOverride = process.env.RESEND_TO_EMAIL || '',
}) {
  if (!resendApiKey) {
    throw buildNotificationError({
      message: 'Missing RESEND_API_KEY',
      retryable: false,
      code: 'missing-resend-api-key',
    });
  }

  const payload = buildNotificationEmailPayload({
    event,
    target,
    fromEmail,
    toEmailOverride,
  });

  let response;
  try {
    response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw buildNotificationError({
      message: error.message || 'Email provider request failed',
      retryable: true,
      code: 'resend-network-error',
    });
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (response.ok) {
    return {
      providerMessageId: data.id || null,
    };
  }

  const providerMessage = data?.message || data?.error?.message || `Resend request failed with status ${response.status}`;
  if (response.status >= 500 || response.status === 429) {
    throw buildNotificationError({
      message: providerMessage,
      retryable: true,
      code: `resend-${response.status}`,
    });
  }

  throw buildNotificationError({
    message: providerMessage,
    retryable: false,
    code: `resend-${response.status}`,
  });
}

export function createNotificationSenders({
  messagingClient = admin.messaging(),
  deactivateTokens = deactivateUserDeviceTokens,
  fetchImpl = fetch,
  resendApiKey = process.env.RESEND_API_KEY,
  fromEmail = process.env.GLIDE_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'Glide <notifications@glideapp.dev>',
  toEmailOverride = process.env.RESEND_TO_EMAIL || '',
} = {}) {
  return {
    push: async ({ event, target, now }) =>
      sendPushNotification({
        event,
        target,
        now,
        messagingClient,
        deactivateTokens,
      }),
    email: async ({ event, target }) =>
      sendEmailNotification({
        event,
        target,
        fetchImpl,
        resendApiKey,
        fromEmail,
        toEmailOverride,
      }),
  };
}

export async function processNotificationEvent({
  event,
  user,
  now = new Date(),
  senders = createNotificationSenders(),
  loadTokens = loadActiveDeviceTokens,
  hasDuplicate = findExistingNotificationDuplicate,
  findCooldownConflict = findNotificationCooldownConflict,
  persistUpdate = async ({ eventId, updates }) => {
    await db.collection(NOTIFICATION_DELIVERY_EVENT_COLLECTION).doc(eventId).set(updates, { merge: true });
  },
}) {
  const resolvedUser = user ?? await loadUser(event.userId);
  if (!resolvedUser) {
    return getFailedResult({
      reason: 'missing-user',
      retryable: false,
      eventId: event.eventId || null,
      retryCount: event.retryCount || 0,
    });
  }

  const attemptedAt = now.toISOString();
  const eventId = event.eventId || null;
  const normalizedMetadata = normalizeEventMetadata(event.metadata);

  const eligibility = resolveNotificationEvent({
    user: resolvedUser,
    eventType: event.eventType,
    channel: event.channel,
    now,
  });

  if (!eligibility.allowed) {
    const auditMetadata = buildNotificationAuditMetadata({
      metadata: normalizedMetadata,
      attemptedAt,
      suppressionReason: eligibility.reason,
      processedChannels: [event.channel],
    });

    if (eventId) {
      await persistUpdate({
        eventId,
        updates: {
          status: 'suppressed',
          metadata: auditMetadata,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      });
    }

    return getSuppressedResult({ reason: eligibility.reason, eventId });
  }

  const duplicate = await hasDuplicate({
    userId: event.userId,
    dedupeKey: event.dedupeKey,
    channel: event.channel,
    excludeEventId: eventId,
  });

  if (duplicate) {
    const auditMetadata = buildNotificationAuditMetadata({
      metadata: normalizedMetadata,
      attemptedAt,
      suppressionReason: 'duplicate',
      processedChannels: [event.channel],
    });

    if (eventId) {
      await persistUpdate({
        eventId,
        updates: {
          status: 'suppressed',
          metadata: auditMetadata,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      });
    }

    return getSuppressedResult({ reason: 'duplicate', eventId });
  }

  const cooldownMinutes = getNotificationCooldownMinutes(event.eventType, event.channel);
  const cooldownConflict = await findCooldownConflict({
    userId: event.userId,
    eventType: event.eventType,
    channel: event.channel,
    now,
    cooldownMinutes,
    excludeEventId: eventId,
  });

  if (cooldownConflict) {
    const auditMetadata = buildNotificationAuditMetadata({
      metadata: {
        ...normalizedMetadata,
        cooldownWindowMinutes: cooldownMinutes,
      },
      attemptedAt,
      suppressionReason: 'cooldown',
      processedChannels: [event.channel],
    });

    if (eventId) {
      await persistUpdate({
        eventId,
        updates: {
          status: 'suppressed',
          metadata: auditMetadata,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      });
    }

    return getSuppressedResult({ reason: 'cooldown', eventId });
  }

  const currentRetryCount = Number(event.retryCount) || 0;
  if (currentRetryCount >= NOTIFICATION_MAX_RETRIES) {
    const auditMetadata = buildNotificationAuditMetadata({
      metadata: normalizedMetadata,
      attemptedAt,
      lastError: 'Retry limit reached',
      processedChannels: [event.channel],
    });

    if (eventId) {
      await persistUpdate({
        eventId,
        updates: {
          status: 'failed',
          metadata: auditMetadata,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      });
    }

    return getFailedResult({
      reason: 'retry-limit',
      retryable: false,
      eventId,
      retryCount: currentRetryCount,
    });
  }

  const targetResult = await resolveNotificationTarget({
    event,
    user: resolvedUser,
    loadTokens,
  });

  if (!targetResult.ok) {
    const auditMetadata = buildNotificationAuditMetadata({
      metadata: normalizedMetadata,
      attemptedAt,
      suppressionReason: targetResult.reason,
      processedChannels: [event.channel],
    });

    if (eventId) {
      await persistUpdate({
        eventId,
        updates: {
          status: 'suppressed',
          metadata: auditMetadata,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      });
    }

    return getSuppressedResult({ reason: targetResult.reason, eventId });
  }

  const sender = senders[event.channel];
  if (typeof sender !== 'function') {
    const nextRetryCount = currentRetryCount + 1;
    const auditMetadata = buildNotificationAuditMetadata({
      metadata: normalizedMetadata,
      attemptedAt,
      lastError: 'No sender registered for channel',
      processedChannels: [event.channel],
      target: targetResult.target,
    });

    if (eventId) {
      await persistUpdate({
        eventId,
        updates: {
          status: 'failed',
          retryCount: nextRetryCount,
          metadata: auditMetadata,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      });
    }

    return getFailedResult({
      reason: 'missing-sender',
      retryable: false,
      eventId,
      retryCount: nextRetryCount,
    });
  }

  try {
    const sendResult = await sender({
      event,
      user: resolvedUser,
      target: targetResult.target,
      now,
    });

    const auditMetadata = buildNotificationAuditMetadata({
      metadata: normalizedMetadata,
      attemptedAt,
      providerMessageId: sendResult?.providerMessageId || null,
      processedChannels: [event.channel],
      target: targetResult.target,
    });

    if (eventId) {
      await persistUpdate({
        eventId,
        updates: {
          status: 'sent',
          metadata: auditMetadata,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      });
    }

    return getSentResult({
      eventId,
      providerMessageId: sendResult?.providerMessageId || null,
      target: targetResult.target,
    });
  } catch (error) {
    const failure = classifyNotificationFailure(error);
    const nextRetryCount = currentRetryCount + 1;
    const auditMetadata = buildNotificationAuditMetadata({
      metadata: normalizedMetadata,
      attemptedAt,
      lastError: failure.message,
      processedChannels: [event.channel],
      target: targetResult.target,
    });

    if (eventId) {
      await persistUpdate({
        eventId,
        updates: {
          status: 'failed',
          retryCount: nextRetryCount,
          metadata: auditMetadata,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      });
    }

    return getFailedResult({
      reason: failure.reason,
      retryable: failure.retryable,
      eventId,
      retryCount: nextRetryCount,
    });
  }
}

export async function queueNotificationEvent({
  user,
  userId,
  eventType,
  dedupeKey,
  relatedTaskId = null,
  relatedGoalId = null,
  relatedBlockId = null,
  metadata = {},
  channels = DEFAULT_CHANNELS,
  now = new Date(),
}) {
  const resolvedUser = user ?? await loadUser(userId);
  if (!resolvedUser) {
    return { queued: 0, suppressed: 0, skipped: 1, events: [] };
  }

  const outcomes = [];

  for (const channel of channels) {
    const eligibility = resolveNotificationEvent({
      user: resolvedUser,
      eventType,
      channel,
      now,
    });

    const ref = db.collection(NOTIFICATION_DELIVERY_EVENT_COLLECTION).doc();
    const record = buildNotificationDeliveryEvent({
      eventId: ref.id,
      userId,
      eventType,
      channel,
      dedupeKey,
      relatedTaskId,
      relatedGoalId,
      relatedBlockId,
      status: eligibility.allowed ? 'queued' : 'suppressed',
      metadata: eligibility.allowed
        ? metadata
        : { ...metadata, suppressionReason: eligibility.reason },
    });

    await ref.set({
      ...record,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    outcomes.push({
      channel,
      status: record.status,
      reason: eligibility.reason,
      eventId: ref.id,
      dedupeKey,
    });
  }

  return {
    queued: outcomes.filter((outcome) => outcome.status === 'queued').length,
    suppressed: outcomes.filter((outcome) => outcome.status === 'suppressed').length,
    skipped: 0,
    events: outcomes,
  };
}

export async function queueDailyPlanReadyNotification({
  userId,
  date,
  blocksCreated = 0,
  actionableBlocksCreated = 0,
  rationale = '',
  now = new Date(),
}) {
  if (actionableBlocksCreated <= 0) {
    return { queued: 0, suppressed: 0, skipped: 1, reason: 'no-actionable-blocks' };
  }

  return queueNotificationEvent({
    userId,
    eventType: 'daily-plan-ready',
    dedupeKey: buildNotificationDedupeKey({
      eventType: 'daily-plan-ready',
      userId,
      date,
    }),
    metadata: {
      date,
      blocksCreated,
      actionableBlocksCreated,
      rationale,
      source: 'schedule-generate',
    },
    now,
  });
}

export async function queueMajorReplanNotification({
  userId,
  date,
  plannedWindowStart,
  plannedWindowEnd,
  blocksCreated = 0,
  actionableBlocksCreated = 0,
  source = 'schedule-replan',
  metadata = {},
  now = new Date(),
}) {
  return queueNotificationEvent({
    userId,
    eventType: 'major-replan',
    dedupeKey: buildNotificationDedupeKey({
      eventType: 'major-replan',
      userId,
      source,
      date: plannedWindowStart || date || plannedWindowEnd || null,
      windowKey: plannedWindowEnd && plannedWindowStart !== plannedWindowEnd
        ? plannedWindowEnd
        : null,
    }),
    metadata: {
      date: date || plannedWindowStart || null,
      plannedWindowStart: plannedWindowStart || date || null,
      plannedWindowEnd: plannedWindowEnd || date || null,
      blocksCreated,
      actionableBlocksCreated,
      source,
      ...metadata,
    },
    now,
  });
}

export function buildDueSoonTaskNotificationCandidate({
  user,
  task,
  now = new Date(),
  reminderWindowHours = DUE_SOON_WINDOW_HOURS,
}) {
  if (!user || !task || task.isComplete || !task.dueAt) {
    return null;
  }

  const dueAt = new Date(task.dueAt);
  if (Number.isNaN(dueAt.getTime())) {
    return null;
  }

  const diffMs = dueAt.getTime() - now.getTime();
  if (diffMs <= 0) {
    return null;
  }

  const hoursUntilDue = diffMs / 3600000;
  if (hoursUntilDue > reminderWindowHours) {
    return null;
  }

  if (!isTaskImportant(task, hoursUntilDue)) {
    return null;
  }

  const timezone = user.preferences?.notifications?.timezone || user.timezone || 'America/New_York';

  return {
    eventType: 'due-soon-task',
    dedupeKey: buildNotificationDedupeKey({
      eventType: 'due-soon-task',
      userId: user.userId,
      taskId: task.taskId,
      windowKey: startOfHourKey(dueAt, timezone),
    }),
    relatedTaskId: task.taskId,
    metadata: {
      dueAt: dueAt.toISOString(),
      priority: task.priority || 'medium',
      title: task.title || '',
      reminderWindowHours,
      source: 'task-evaluator',
    },
  };
}

export function buildStreakRiskNotificationCandidate({
  user,
  goal,
  now = new Date(),
  startHour = STREAK_RISK_START_HOUR,
  endHour = STREAK_RISK_END_HOUR,
}) {
  if (!user || !goal || goal.type !== 'routine') {
    return null;
  }

  const timezone = user.preferences?.notifications?.timezone || user.timezone || 'America/New_York';
  const local = getTimeZoneParts(now, timezone);
  if (local.hour < startHour || local.hour >= endHour) {
    return null;
  }

  if ((goal.streak || 0) < 2) {
    return null;
  }

  if (!isRoutineScheduledForToday(goal, local.dayIndex)) {
    return null;
  }

  const history = Array.isArray(goal.completionHistory) ? goal.completionHistory : [];
  if (Boolean(goal.completedToday) || history.includes(local.dateKey)) {
    return null;
  }

  return {
    eventType: 'streak-risk',
    dedupeKey: buildNotificationDedupeKey({
      eventType: 'streak-risk',
      userId: user.userId,
      goalId: goal.goalId,
      date: local.dateKey,
    }),
    relatedGoalId: goal.goalId,
    metadata: {
      title: goal.title || '',
      currentStreak: goal.streak || 0,
      targetDate: local.dateKey,
      source: 'routine-evaluator',
    },
  };
}

export async function queueCanvasWorkloadChangeNotification({
  userId,
  syncSummary,
  now = new Date(),
}) {
  const materialTaskChanges = Number(syncSummary?.materialTaskChanges) || 0;
  if (materialTaskChanges < 2) {
    return { queued: 0, suppressed: 0, skipped: 1, reason: 'below-threshold' };
  }

  return queueMajorReplanNotification({
    userId,
    plannedWindowStart: syncSummary?.plannedStartDate || null,
    plannedWindowEnd: syncSummary?.plannedEndDate || null,
    blocksCreated: syncSummary?.blocksCreated || 0,
    actionableBlocksCreated: 0,
    source: 'canvas-sync',
    metadata: {
      materialTaskChanges,
      tasksAdded: syncSummary?.tasksAdded || 0,
      tasksUpdated: syncSummary?.tasksUpdated || 0,
      assignmentsAdded: syncSummary?.assignmentsAdded || 0,
      assignmentsUpdated: syncSummary?.assignmentsUpdated || 0,
    },
    now,
  });
}

export function countActionableScheduleBlocks(schedule = []) {
  return schedule.filter((block) => ACTIONABLE_BLOCK_TYPES.has(block?.type)).length;
}
