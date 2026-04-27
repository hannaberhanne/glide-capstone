# Glide API Contracts

## Contract Principles
- All private endpoints require Firebase bearer auth via `Authorization: Bearer <idToken>`.
- Public endpoints are limited to low-risk content and health checks.
- UI surfaces should call domain endpoints, not duplicate controller logic in the client.
- Transitional endpoints may remain temporarily, but every deprecated endpoint must have a replacement owner and removal condition.

## Auth Model

| Endpoint | Auth | Current Role | Contract Notes |
| --- | --- | --- | --- |
| `POST /api/auth/signup` | Required | Creates Firestore user profile after Firebase account creation | Backend never creates credentials; Firebase remains credential authority |
| `POST /api/auth/login` | Required | Updates login streak metadata | Remains separate from Firebase sign-in |
| Firebase `sendPasswordResetEmail` | Firebase client auth only | Forgot password flow | Truthful current recovery path |

### Password Update Decision
- Settings must not send raw passwords to the backend.
- Password updates remain a Firebase-native client flow using reauthentication plus Firebase password update.
- Backend responsibility is limited to optional audit metadata on the user record, not credential storage.
- Until the settings flow exists, the password field must be removed from release builds.

## Current Endpoint Inventory

### Public
| Method | Path | Auth | Request | Response | Current UI Caller |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/health` | No | None | Service status and route list | None |
| `GET` | `/api/quotes` | No | None | `{ text, author }` | `GoalsPage` |
| `GET` | `/` | No | None | Basic API status | None |

### User and Auth
| Method | Path | Auth | Request Shape | Response Shape | Current UI Caller |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/auth/signup` | Yes | `{ email, firstName, lastName }` | `{ success, userId, data }` | `SignupPage` |
| `POST` | `/api/auth/login` | Yes | `{ email }` | `{ success, data.loginStreak, data.longestStreak, data.alreadyLoggedInToday, ... }` | `LoginPage` |
| `GET` | `/api/users` | Yes | None | `User[]` | None |
| `GET` | `/api/users/:userId` | Yes | None | `User[]` | `useUser` |
| `PATCH` | `/api/users/:userId` | Yes | Partial user/profile/preferences payload | `{ success, data: User }` | `useUser`, `SettingsPage`, `CanvasSetup`, `OnboardingPage` |
| `DELETE` | `/api/users/:userId` | Yes | None | `{ deleted: true }` | None |

### Tasks
| Method | Path | Auth | Request Shape | Response Shape | Current UI Caller |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/tasks` | Yes | None | `Task[]` with `completedToday` | `useTasks`, `GoalsPage`, `EditGoal` |
| `POST` | `/api/tasks` | Yes | `{ title, color?, goalId?, category?, priority?, dueAt?, description?, estimatedMinutes?, estimatedTime?, xpValue? }` | Created task | `useTasks`, `AddGoal`, `EditGoal` |
| `PATCH` | `/api/tasks/:taskId` | Yes | Partial mutable task fields | Updated task | `useTasks`, `PlannerPage`, `DashboardPage`, `EditGoal` |
| `PATCH` | `/api/tasks/:taskId/complete` | Yes | `{}` | `{ success, xpGained, newTotalXP, newLevel? }` | `useTasks`, `DashboardPage`, `PlannerPage` |
| `DELETE` | `/api/tasks/:taskId` | Yes | None | `{ deleted: true }` | `useTasks`, `GoalsPage`, `EditGoal` |

### Goals
| Method | Path | Auth | Request Shape | Response Shape | Current UI Caller |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/goals` | Yes | None | `Goal[]`; project goals currently include `tasks` map | `GoalsPage` |
| `POST` | `/api/goals` | Yes | `{ title, color?, type?, frequency?, targetDays?, durationMinutes?, icon?, xpValue? }` | Created goal | `OnboardingPage`, `AddGoal` |
| `POST` | `/api/goals/suggest-tasks` | Yes | `{ title }` | `{ tasks: Array<{ title, difficulty, xp }> }` | `AddGoal` |
| `PATCH` | `/api/goals/:goalId` | Yes | Partial goal fields | Updated goal | `EditGoal` |
| `PATCH` | `/api/goals/:goalId/complete` | Yes | `{}` | `{ success, xpGained, newTotalXP, newStreak? }` | Not currently wired in UI |
| `DELETE` | `/api/goals/:goalId` | Yes | None | `{ deleted: true }` | `GoalsPage` |

### Legacy Habits
| Method | Path | Auth | Request Shape | Response Shape | Current UI Caller |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/habits` | Yes | None | `Habit[]` | None in current routed UI |
| `POST` | `/api/habits` | Yes | Habit create payload | Created habit | None in current routed UI |
| `PATCH` | `/api/habits/:habitId/complete` | Yes | `{}` | `{ success, xpGained, newTotalXP, currentStreak }` | None in current routed UI |

### Schedule
| Method | Path | Auth | Request Shape | Response Shape | Current UI Caller |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/schedule/generate` | Yes | `{ date?: string }` | `{ success, rationale, blocksCreated, deferred }` | `useSchedule` |
| `GET` | `/api/schedule/today?date=YYYY-MM-DD` | Yes | Query param `date` optional | `{ success, date, blocks }` | `useSchedule` |
| `POST` | `/api/schedule/replan` | Yes | None today | `{ success, rationale, blocksCreated, deferred }` | None in current routed UI |
| `PATCH` | `/api/schedule/blocks/:blockId/complete` | Yes | `{}` | `{ success, xpGained, newTotalXP? }` | `useSchedule` |

### Canvas and Academic Data
| Method | Path | Auth | Request Shape | Response Shape | Current UI Caller |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/canvas/sync` | Yes | `{ canvasToken? }` | `{ success, message, data: { coursesAdded, assignmentsAdded, tasksAdded, ... } }` | `CanvasSetup` |
| `GET` | `/api/canvas/status` | Yes | None | `{ success, data: { hasToken, tokenSource, lastSync, coursesCount, assignmentsCount, linkedTasksCount } }` | `useCanvasStatus` |
| `POST` | `/api/canvas/disconnect` | Yes | `{ deleteData: boolean }` | `{ success, message }` | None in current routed UI |
| `GET` | `/api/courses` | Yes | None | `Course[]` | None in current routed UI |
| `POST` | `/api/courses` | Yes | Course create payload | Created course | None |
| `PATCH` | `/api/courses/:courseId` | Yes | Partial course payload | Updated course | None |
| `DELETE` | `/api/courses/:courseId` | Yes | None | `{ deleted: true }` | None |
| `GET` | `/api/assignments` | Yes | Optional `courseId` query | `Assignment[]` | None |
| `POST` | `/api/assignments` | Yes | Assignment create payload | Created assignment | None |
| `PATCH` | `/api/assignments/:assignmentId` | Yes | Partial assignment payload | Updated assignment | None |
| `DELETE` | `/api/assignments/:assignmentId` | Yes | None | `{ deleted: true }` | None |

### AI and Supporting Services
| Method | Path | Auth | Request Shape | Response Shape | Current UI Caller |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/ai/extract` | Yes | `{ text }` | `AssignmentDraft[]` | None in current routed UI |
| `POST` | `/api/ai/replan` | Yes | `{ perDay?, apply?, selectedDate?, instruction? }` | `{ suggestions, summary }` | `PlannerPage` assist overlay |
| `GET` | `/api/events` | Yes | None | `Event[]` | None |
| `POST` | `/api/events` | Yes | Event create payload | Created event | None |
| `PATCH` | `/api/events/:eventId` | Yes | Partial event payload | Updated event | None |
| `DELETE` | `/api/events/:eventId` | Yes | None | `{ deleted: true }` | None |

## Required Target Contracts

### Goals API
- `GET /api/goals` should return normalized records:
  - project goals: include lightweight linked task summaries as an array
  - routine goals: include recurrence and streak data only
- `PATCH /api/goals/:goalId/complete` remains the canonical completion endpoint for routines and project completion bonuses.

### Schedule API
- Schedule should be treated as a date-based resource, not a "today" special case.
- Target shape:
```ts
GET /api/schedule?date=YYYY-MM-DD
POST /api/schedule/generate { date }
POST /api/schedule/replan { date, reason, source }
PATCH /api/schedule/blocks/:blockId/complete { completionSource?: "planner" | "dashboard" | "notification" }
```
- Completion responses must include whether XP came from a task, routine, or neither.

### Canvas Auto-Plan Contract
- `POST /api/canvas/sync` target response adds:
```ts
{
  success: true,
  message: string,
  data: {
    coursesAdded: number,
    assignmentsAdded: number,
    tasksAdded: number,
    tasksUpdated: number,
    materialTaskChanges: boolean,
    planTriggered: boolean,
    plannedDate: string | null,
    blocksCreated?: number,
    rationale?: string
  }
}
```
- Auto-plan runs when task insertions, deletions, due date changes, or meaningful title/priority changes occur.
- If no material change occurred, response must explicitly say planning was skipped.

### Notifications Contract
- User preferences should move to a structured model under `preferences.notifications`.
- Target endpoints:
```ts
GET /api/users/:userId/preferences/notifications
PATCH /api/users/:userId/preferences/notifications
GET /api/notifications/delivery-events?limit=50
```
- Delivery providers, retries, quiet hours, and timezone handling are backend requirements, not client-only settings.

### Onboarding Contract
- Onboarding answers remain stored on the user record.
- Add optional `planningProfile` derivation server-side so the scheduler can consume normalized preferences:
```ts
PATCH /api/users/:userId {
  onboardingAnswers,
  planningProfile?: {
    prefersQuickWins: boolean
    maxTasksPerDay: number
    maxWorkMinutes: number
    energyPeak: string
  }
}
```

## Deprecation Plan
- `/api/habits/*` is deprecated after routine-goal migration validation.
- `/api/ai/replan` becomes a transitional assist endpoint and should converge into schedule planning semantics.
- Any settings UI relying on generic `preferences` booleans without real backend behavior should be gated or removed before release.
