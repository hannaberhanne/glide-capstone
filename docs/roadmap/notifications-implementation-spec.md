# Notifications Implementation Spec

## Objective
Ship notifications as a real product system, not a settings placebo.

This spec keeps the work split into eight sequential steps. Each step has four phases. The steps should be implemented in order and should not be collapsed together during execution.

## Core Decisions
- Notification settings must be real persisted user data before any delivery work begins.
- Push and email channels are separate capabilities with separate enablement.
- Quiet hours and timezone handling are first-class requirements, not later cleanup.
- Event creation and delivery orchestration are different layers and should remain separate.
- Notifications should be driven by backend truth, not frontend page visits.
- Device tokens belong in a dedicated backend model, not as a loose field on the user record.
- Delivery attempts, suppressions, and failures must be logged.

## Step Ordering
1. Step 1: Preferences Become Real
2. Step 2: Notification Domain Scaffolding
3. Step 3: Trigger and Event Creation
4. Step 4: Delivery Orchestration
5. Step 5: FCM Push Delivery
6. Step 6: Resend Email Delivery
7. Step 7: Frontend and Native Registration
8. Step 8: Hardening and Product QA

No later step should begin until the prior step has passed its exit criteria.

---

# Step 1: Preferences Become Real

## Goal
Make notification settings real persisted product data with one canonical structure and one canonical save path.

## Step 1.1: Backend Data Contract

### Purpose
Define the canonical notification preference shape on the user record.

### Canonical Shape
Store under:

```js
preferences.notifications
```

Target object:

```js
preferences: {
  notifications: {
    pushEnabled: false,
    emailEnabled: false,
    quietHoursStart: "",
    quietHoursEnd: "",
    timezone: "America/New_York",
    notifyDailyPlanReady: true,
    notifyMissedBlocks: true,
    notifyDueSoonTasks: true,
    notifyStreakRisk: true,
    notifyMajorReplans: true
  }
}
```

### Rules
- `pushEnabled`: boolean
- `emailEnabled`: boolean
- `quietHoursStart`: empty string or valid `HH:MM` 24-hour string
- `quietHoursEnd`: empty string or valid `HH:MM` 24-hour string
- `timezone`: IANA timezone string
- event toggles: boolean

### Legacy Mapping
Current/legacy fields may include:
- `notification`
- `notifications`
- partial `preferences`

Rules:
- If `preferences.notifications` exists, it is the source of truth.
- Otherwise hydrate from legacy `notifications` if present.
- Legacy top-level values are only for hydration and should not remain the write target.
- After save, always write the canonical full object.

### Backend Files
- `backend/controllers/userController.js`

### Required Changes
- Accept `preferences.notifications` in `PATCH /api/users/:userId`
- Normalize and merge it into existing `preferences`
- Return the canonical structure in the updated user response

### Exit Criteria
- The user document can persist the full structured notification object.
- Notification settings no longer rely on legacy top-level booleans.

## Step 1.2: Frontend Settings Model

### Purpose
Make Settings read and write the canonical notification structure instead of fake toggles.

### UI Scope
Settings should expose:
- Push enabled
- Email enabled
- Quiet hours start
- Quiet hours end
- Timezone
- Daily plan ready toggle
- Missed blocks toggle
- Due soon tasks toggle
- Streak risk toggle
- Major replans toggle

### Frontend State Shape

```js
{
  pushEnabled,
  emailEnabled,
  quietHoursStart,
  quietHoursEnd,
  timezone,
  notifyDailyPlanReady,
  notifyMissedBlocks,
  notifyDueSoonTasks,
  notifyStreakRisk,
  notifyMajorReplans
}
```

### Hydration Rules
- Read `userRecord.preferences.notifications` first
- Fallback to legacy values only if canonical shape is missing
- Fill missing fields with defaults

### Save Rules
- Save through the existing user settings flow
- Write only to `preferences.notifications`
- Do not keep frontend writes split across multiple legacy fields

### Frontend Files
- `frontend/src/pages/SettingsPage.jsx`

### Exit Criteria
- Notification settings round-trip through Settings correctly.
- Refresh and relog preserve the values.

## Step 1.3: Defaults and Normalization

### Purpose
Make partial or legacy user records safe.

### Recommended Defaults

```js
{
  pushEnabled: false,
  emailEnabled: false,
  quietHoursStart: "",
  quietHoursEnd: "",
  timezone: user.timezone || browserTimezone || "America/New_York",
  notifyDailyPlanReady: true,
  notifyMissedBlocks: true,
  notifyDueSoonTasks: true,
  notifyStreakRisk: true,
  notifyMajorReplans: true
}
```

### Why
- Channels off by default avoids accidental spam.
- Trigger toggles on by default allow future enablement without further migration.
- Timezone should resolve deterministically.

### Required Helpers
Backend normalization helper:
- merges incoming values over defaults
- coerces types
- validates quiet-hour format

Frontend initialization helper:
- derives stable form state from canonical or legacy data

### Exit Criteria
- Missing or malformed legacy settings do not break the page.
- New writes always produce canonical structure.

## Step 1.4: Verification

### Manual Verification
1. Load Settings on a user with no notification prefs
2. Confirm defaults render correctly
3. Change channel toggles
4. Change quiet hours
5. Change trigger toggles
6. Save
7. Refresh
8. Log out and back in
9. Confirm values persist

### Backend Verification
- Inspect stored user document
- Confirm `preferences.notifications` is complete and canonical

### Build Checks
- `backend npm test`
- `frontend npm run build`
- `frontend npm run lint -- --max-warnings=0`

### Step 1 Exit Criteria
- Notification settings are real data.
- Settings no longer acts like a fake surface.

---

# Step 2: Notification Domain Scaffolding

## Goal
Build the backend domain models and helper logic needed for real notifications.

## Step 2.1: Device Token Model

### Purpose
Support multiple push-capable devices per user with a dedicated model.

### Collection
Recommended collection:

```js
user_device_tokens
```

### Document Shape

```js
{
  tokenId: "doc-id",
  userId: "firebase-uid",
  provider: "fcm",
  token: "raw-device-token",
  platform: "web" | "ios" | "android",
  active: true,
  lastSeenAt: Timestamp,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Rules
- A user may have multiple tokens.
- Re-registering the same token should update `lastSeenAt` and mark it active.
- Tokens should not be stored as a flat field on the user record.

### Files
- `backend/services/notificationService.js`
- optional helper/domain file if it keeps the service cleaner

### Exit Criteria
- Multi-device token support is structurally defined.
- Duplicate token behavior is explicit.

## Step 2.2: Delivery Event Model

### Purpose
Persist notification processing state so the system is inspectable.

### Collection
Recommended collection:

```js
notification_delivery_events
```

### Document Shape

```js
{
  eventId: "doc-id",
  userId: "firebase-uid",
  eventType: "daily-plan-ready" | "missed-block" | "due-soon-task" | "streak-risk" | "major-replan",
  channel: "push" | "email",
  status: "queued" | "sent" | "failed" | "suppressed",
  retryCount: 0,
  dedupeKey: "stable-key",
  relatedTaskId: null,
  relatedGoalId: null,
  relatedBlockId: null,
  metadata: {},
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Rules
- Every send attempt, suppression, and failure should be representable.
- `dedupeKey` is mandatory.
- `metadata` may store provider response IDs or suppression reasons later.

### Files
- `backend/services/notificationService.js`

### Exit Criteria
- Delivery state has a stable persisted model.
- Dedupe can be built on top of stored events.

## Step 2.3: Preference Resolution Helper

### Purpose
Centralize eligibility logic before any trigger or send path exists.

### Helper Contract

```js
resolveNotificationEligibility({
  user,
  eventType,
  channel,
  now,
})
```

### Expected Output

```js
{
  allowed: true | false,
  suppressed: true | false,
  reason: "channel-disabled" | "trigger-disabled" | "quiet-hours" | "missing-timezone" | null,
  preferences: normalizedPrefs
}
```

### Logic Order
1. Load canonical preferences or defaults
2. Check channel enablement
3. Check event-trigger enablement
4. Resolve timezone
5. Apply quiet-hours logic
6. Return final eligibility result

### Quiet-Hours Rules
- Empty hours means no suppression
- Overnight ranges like `22:00` to `07:00` must work

### Files
- `backend/domain/notificationPreferences.js`

### Exit Criteria
- One helper owns quiet-hours and preference eligibility logic.

## Step 2.4: Verification

### Required Tests
- Defaults resolve correctly
- Disabled push suppresses push
- Disabled email suppresses email
- Disabled event toggle suppresses specific event
- Blank quiet hours allow send
- Same-day quiet hours suppress correctly
- Overnight quiet hours suppress correctly
- Missing timezone is handled deterministically

### Build Checks
- `backend npm test`
- `frontend npm run build`
- `frontend npm run lint -- --max-warnings=0`

### Step 2 Exit Criteria
- Token model, event model, and eligibility logic are stable and test-backed.

---

# Step 3: Trigger and Event Creation

## Goal
Create notification-worthy events from real product behavior without sending them yet.

## Step 3.1: Schedule Triggers

### Purpose
Emit schedule-based notification events.

### Event Types
- `daily-plan-ready`
- `missed-block`
- `major-replan`

### Trigger Rules

#### `daily-plan-ready`
Create when:
- a schedule is generated successfully
- at least one actionable block exists
- user preference allows it

Do not create when:
- generation fails
- zero actionable blocks
- duplicate event already exists for the same user/date window

#### `missed-block`
Create when:
- an actionable block has ended
- the block is still incomplete
- a grace period has passed

Recommended grace period:
- `15 minutes`

#### `major-replan`
Create when:
- a plan is regenerated due to meaningful workload change
- the change affects near-term work in a material way

### Files
- `backend/controllers/scheduleController.js`
- `backend/services/schedulerService.js`
- `backend/services/notificationService.js`

### Exit Criteria
- Schedule events can be queued from backend truth.

## Step 3.2: Task Triggers

### Purpose
Emit due-soon events for important incomplete tasks.

### Event Type
- `due-soon-task`

### Trigger Rules
Create when:
- task is incomplete
- task has a valid due date
- task is within the reminder window
- task importance threshold qualifies
- user preference allows it

### Recommended Window
- due within next `12 hours`

### Recommended Importance Rule
- `priority === "high"` or equivalent strong threshold

### Files
- task evaluation helper or service
- `backend/services/notificationService.js`

### Exit Criteria
- Due-soon task events are created from backend task truth, not UI activity.

## Step 3.3: Routine and Streak Triggers

### Purpose
Emit streak-risk events from the canonical routine-goal model.

### Event Type
- `streak-risk`

### Trigger Rules
Create when:
- a routine goal is due today
- it remains incomplete
- breaking the streak is plausible
- user preference allows it

### Recommended Threshold
- only if current streak is at least `2`

### Recommended Time Window
- between `6 PM` and `9 PM` in user timezone

### Files
- routine evaluation helper
- `backend/services/notificationService.js`

### Exit Criteria
- Streak-risk events work against goals, not deleted habit logic.

## Step 3.4: Canvas and Workload Change Triggers

### Purpose
Emit notification events when Canvas sync materially changes the user’s workload.

### Event Type
- `major-replan`

### Trigger Rules
Create when:
- Canvas sync causes meaningful planning-relevant change
- change crosses threshold
- user preference allows it

### Recommended Threshold
- `materialTaskChanges >= 2`
or
- at least one new high-priority or near-term task

### Important Constraint
This step creates the event. It does not require automatic replanning if that product behavior is still deferred.

### Files
- `backend/controllers/canvasController.js`
- `backend/services/notificationService.js`

### Exit Criteria
- Canvas sync can create workload-change events from backend summary data.

### Step 3 Exit Criteria
- Real product behavior now produces real queued notification events.

---

# Step 4: Delivery Orchestration

## Goal
Process queued notification events through one consistent backend pipeline with suppression, dedupe, retry, and audit handling.

## Step 4.1: Delivery Pipeline Service

### Purpose
Create one canonical event-processing entrypoint.

### Example Entrypoint

```js
processNotificationEvent(event)
```

### Responsibilities
1. Load user preferences
2. Determine eligible channels
3. Apply quiet hours and trigger settings
4. Check dedupe state
5. Persist final result

### Outcome States
- `queued`
- `suppressed`
- `sent`
- `failed`

### Files
- `backend/services/notificationService.js`

### Exit Criteria
- All event processing decisions go through one backend service.

## Step 4.2: Dedupe and Suppression Rules

### Purpose
Prevent repeated sends and make suppression explicit.

### Dedupe Inputs
- `dedupeKey`
- `userId`
- `channel`
- `eventType`

### Suppression Reasons
- `channel-disabled`
- `trigger-disabled`
- `quiet-hours`
- `duplicate`
- `missing-device-token`
- `missing-email-channel`
- `missing-timezone`

### Rule
Suppressed events should still be logged in the delivery-event collection.

### Files
- `backend/services/notificationService.js`

### Exit Criteria
- Duplicate and suppressed sends behave predictably and are inspectable.

## Step 4.3: Retry and Failure State

### Purpose
Handle transient vs permanent failures coherently.

### Failure States
- `sent`
- `failed`
- `suppressed`

### Retry Policy
Recommended initial policy:
- retry transient failures up to `3` times
- do not retry permanent failures

### Transient Examples
- provider timeout
- temporary network error
- provider `5xx`

### Permanent Examples
- invalid device token
- no eligible channel
- malformed event data
- duplicate suppression

### Stored Failure Metadata
- `retryCount`
- `metadata.lastError`
- `updatedAt`

### Files
- `backend/services/notificationService.js`

### Exit Criteria
- Retry and permanent-failure paths are distinct and testable.

## Step 4.4: Audit Trail and Verification

### Purpose
Make delivery behavior inspectable and safe before provider wiring expands.

### Recommended Metadata

```js
metadata: {
  suppressionReason: null,
  providerMessageId: null,
  lastError: null,
  processedChannels: [],
  attemptedAt: "timestamp"
}
```

### Required Tests
- Allowed event routes to correct channel
- Disabled channel suppresses correctly
- Disabled trigger suppresses correctly
- Quiet hours suppress correctly
- Duplicate event suppresses correctly
- Retry count increments on transient failure
- Permanent failure does not retry
- Audit metadata is written for sent, failed, and suppressed cases

### Build Checks
- `backend npm test`
- `frontend npm run build`
- `frontend npm run lint -- --max-warnings=0`

### Step 4 Exit Criteria
- Queued events can be processed safely through one orchestration layer.
- Suppression, dedupe, retry, and audit behavior are implemented and verified.

---

# Step 5: FCM Push Delivery

## Goal
Wire the backend orchestration layer to real Firebase Cloud Messaging delivery so push notifications can be sent to registered devices.

## Step 5.1: FCM Service Integration

### Purpose
Create a real push sender adapter that can be called by the Step 4 orchestration service.

### Responsibilities
- accept a resolved push target from `processNotificationEvent(...)`
- send a payload through Firebase Admin messaging
- return provider response metadata
- surface invalid-token errors as permanent failures
- surface provider/network timeouts as retryable failures

### Payload Contract
Initial push payload should include:

```js
{
  notification: {
    title: "Glide",
    body: "Your plan is ready."
  },
  data: {
    eventType: "daily-plan-ready",
    route: "/planner",
    relatedTaskId: "",
    relatedGoalId: "",
    relatedBlockId: ""
  }
}
```

### Design Rules
- Push payload building should be its own helper.
- The orchestration layer should remain provider-agnostic.
- FCM-specific errors must be translated into retryable vs permanent failure semantics.

### Files
- `backend/services/notificationService.js`
- optional `backend/services/pushService.js`

### Exit Criteria
- The backend can attempt a real FCM push send from a queued event.
- Provider response metadata can be logged.

## Step 5.2: Device Token Registration API

### Purpose
Expose a real backend path for registering and refreshing device tokens.

### Endpoint Direction
Recommended:

```http
POST /api/notifications/device-tokens
PATCH /api/notifications/device-tokens/:tokenId
```

### Registration Payload

```js
{
  token: "raw-device-token",
  platform: "web" | "ios" | "android",
  provider: "fcm"
}
```

### Rules
- Re-registering an existing token should reactivate it and update `lastSeenAt`.
- Token registration must require authentication.
- Inactive or invalidated tokens should not be deleted immediately unless you have a retention rule.

### Files
- new notifications route/controller files
- `backend/services/notificationService.js`

### Exit Criteria
- The backend can register and reactivate FCM tokens safely.
- Duplicate token writes are idempotent.

## Step 5.3: Push Event Mapping and Invalid Token Handling

### Purpose
Define which events produce which push copy and how token failures are handled.

### Initial Event Mapping
- `daily-plan-ready` -> open Planner
- `missed-block` -> open Dashboard or Planner
- `due-soon-task` -> open task context
- `streak-risk` -> open Goals
- `major-replan` -> open Planner

### Invalid Token Rules
- invalid or unregistered token from FCM should mark that device token inactive
- invalid token errors should be treated as permanent
- temporary provider errors should stay retryable

### Files
- `backend/services/notificationService.js`
- optional `backend/services/pushService.js`

### Exit Criteria
- Push copy and route mapping are explicit.
- Invalid token cleanup is automatic and testable.

## Step 5.4: Verification

### Required Tests
- token registration creates or reactivates device tokens
- push sender is called with the correct payload
- invalid token marks token inactive
- provider timeout increments retry count
- push send updates delivery event to `sent` with provider metadata

### Runtime Verification
- register a test token
- queue a real event
- process the event
- confirm FCM attempt and delivery-event update

### Build Checks
- `backend npm test`
- `frontend npm run build`
- `frontend npm run lint -- --max-warnings=0`

### Step 5 Exit Criteria
- Real push sends can be attempted through FCM.
- Token registration and invalid-token cleanup are working.

---

# Step 6: Resend Email Delivery

## Goal
Wire the backend orchestration layer to real email delivery using Resend.

## Step 6.1: Resend Service Integration

### Purpose
Create an email sender adapter that can be called by `processNotificationEvent(...)`.

### Responsibilities
- send email through Resend
- return provider response metadata
- classify provider/network failures for retry logic
- keep orchestration logic provider-agnostic

### Required Environment
- `RESEND_API_KEY`
- a verified sender address such as `GLIDE_FROM_EMAIL`

### Files
- `backend/services/notificationService.js`
- optional `backend/services/emailService.js`

### Exit Criteria
- The backend can attempt a real Resend send from a queued event.

## Step 6.2: Email Template and Copy System

### Purpose
Define the email content shapes for the initial event set.

### Initial Templates
- `daily-plan-ready`
- `due-soon-task`
- `streak-risk`
- `major-replan`

### Template Rules
- subject lines must be concise and event-specific
- body copy should sound like Glide, not a raw system log
- emails should include a clear CTA route or action
- keep templates text-first or simple HTML initially

### Recommended Template Shape

```js
{
  subject: "Your Glide plan is ready",
  text: "Your day plan is ready. Open Glide to review it.",
  html: "<p>Your day plan is ready. Open Glide to review it.</p>"
}
```

### Files
- optional `backend/services/emailTemplates.js`
- `backend/services/notificationService.js`

### Exit Criteria
- The initial event types have explicit email content.

## Step 6.3: Channel Resolution and Send Policy

### Purpose
Make sure email only sends when it should.

### Rules
- email send requires `emailEnabled === true`
- email send requires a valid user email
- quiet hours and trigger toggles still apply
- some event types may later be push-only, but initial implementation can allow both channels

### Failure Semantics
- missing user email should suppress with `missing-email-channel`
- provider failures should follow Step 4 retry rules

### Files
- `backend/services/notificationService.js`

### Exit Criteria
- Email delivery obeys the same orchestration rules as push.

## Step 6.4: Verification

### Required Tests
- email sender is called with the correct template data
- missing email suppresses cleanly
- Resend failure updates retry/failure state correctly
- sent email updates delivery-event metadata with provider response ID

### Runtime Verification
- queue an email-eligible event
- process it with a real Resend adapter
- verify provider response and delivery-event state

### Build Checks
- `backend npm test`
- `frontend npm run build`
- `frontend npm run lint -- --max-warnings=0`

### Step 6 Exit Criteria
- Real email sends can be attempted through Resend.
- Email copy and delivery metadata are in place.

---

# Step 7: Frontend and Native Registration

## Goal
Make the client actually register devices, reflect permission state, and expose usable notification controls beyond backend-only data.

## Step 7.1: Frontend Device Registration Flow

### Purpose
Register FCM tokens from the frontend or future native shell into the backend device-token API.

### Responsibilities
- request notification permission where applicable
- obtain FCM token
- send token and platform to backend
- refresh token if Firebase rotates it

### Web Constraint
Web push requires:
- Firebase messaging config
- service worker setup
- browser notification permission

### Files
- frontend Firebase config / messaging setup
- new notification registration hook
- possible service worker files

### Exit Criteria
- A signed-in user can register a real web push token.

## Step 7.2: Settings and Permission UX

### Purpose
Make notification settings reflect actual channel availability instead of only persisted preference booleans.

### UI Requirements
- show push permission state
- show whether a device token is registered
- show email enabled state
- show any registration or permission error

### Rules
- `pushEnabled` should not imply device registration succeeded
- permission denied should be clearly visible
- unsupported browser environments should be handled explicitly

### Files
- `frontend/src/pages/SettingsPage.jsx`
- notification hook(s)

### Exit Criteria
- Settings reflects real push capability, not just stored intent.

## Step 7.3: Native Wrapper and Future Mobile Integration

### Purpose
Keep the registration model compatible with the planned Capacitor/native wrapper path.

### Requirements
- platform field must remain meaningful across `web`, `ios`, and `android`
- backend token registration must not assume web-only semantics
- route/deep-link targets in push payloads should map cleanly to app screens

### Files
- no immediate native code required, but the backend and payload design should stay compatible

### Exit Criteria
- The notification stack is ready for a native shell without changing the backend model.

## Step 7.4: Verification

### Required Tests
- frontend registration path calls backend correctly
- permission denied path is handled without crashing Settings
- registered token state is reflected after refresh
- token refresh updates the backend record instead of duplicating it

### Runtime Verification
- sign in on a real browser session
- allow notifications
- confirm device token appears in backend
- confirm Settings reflects registration state

### Step 7 Exit Criteria
- The client can register real notification targets and show real capability state.

---

# Step 8: Hardening and Product QA

## Goal
Turn the notification system from functionally complete into product-safe, low-noise, and release-ready.

## Step 8.1: Anti-Spam and Cooldown Policy

### Purpose
Prevent Glide from becoming noisy or repetitive.

### Requirements
- per-event cooldown windows
- no repeated due-soon reminders in the same bucket
- no repeated streak-risk notifications for the same goal/day
- no repeated major-replan alerts for the same sync or plan window

### Recommended Policy Areas
- per-user daily send caps
- per-event-type cooldowns
- channel-specific dedupe windows if needed

### Files
- `backend/services/notificationService.js`
- optional anti-spam helper/domain file

### Exit Criteria
- Notification volume is bounded and intentional.

## Step 8.2: Timezone and Quiet-Hours Hardening

### Purpose
Eliminate edge-case bugs around local time behavior.

### Requirements
- verify quiet hours across midnight
- verify DST transitions
- verify local-day calculations do not drift because of UTC assumptions
- verify replan and due-soon windows use the intended timezone consistently

### Files
- notification domain/service helpers
- any date helpers in schedule/task flows that influence event timing

### Exit Criteria
- Local time behavior is stable across real-world timezone cases.

## Step 8.3: Copy, UX, and Recovery Quality

### Purpose
Improve the product quality of delivered notifications and related UI messaging.

### Requirements
- push and email copy should be concise and useful
- Settings should explain failures without internal jargon
- users should be able to recover from denied permissions or bad registration state
- inactive/invalid tokens should not silently accumulate forever

### Files
- frontend settings copy
- email/push template copy
- notification services for cleanup and status text

### Exit Criteria
- The notification system feels intentional and trustworthy from the user’s perspective.

## Step 8.4: End-to-End Product QA

### Purpose
Run final scenario validation across all implemented notification paths.

### Required Scenario Set
- daily plan generated -> push/email eligibility -> delivery-event audit state
- replan triggered -> major-replan path
- due-soon task candidate -> queue -> process
- streak-risk candidate -> queue -> process
- push denied / no token / missing email suppression paths
- retryable provider failure and retry count increment
- invalid token deactivation path

### Recommended Tooling
- backend tests
- browser/device smoke tests
- Firestore verification scripts
- manual inbox/push validation on real devices where possible

### Step 8 Exit Criteria
- Notifications are not just implemented; they are reliable, low-noise, and release-ready.

---

## Execution Rule
Do not start a later step by skipping the earlier contract layers. Notifications should be built as a layered system, not as scattered handlers across the codebase.
