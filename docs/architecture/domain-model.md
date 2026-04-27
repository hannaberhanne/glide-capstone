# Glide Domain Model

## Architecture Direction
Glide uses Firestore collections as the persisted system of record. The current repo still mixes target-state entities with legacy entities. This document locks the future model and records the current tolerated state so migration work can proceed safely.

## Canonical Entity Roles

| Entity | Role |
| --- | --- |
| `User` | Account, preferences, XP totals, onboarding answers, connected-service state |
| `Goal` | Canonical intent model for both projects and routines |
| `Task` | Canonical executable work unit |
| `ScheduleBlock` | AI-generated schedule output for a specific day/time |
| `Course` | Canvas-derived or manual academic container |
| `Assignment` | Course-linked academic deliverable, often mirrored into tasks |
| `Habit` | Legacy routine entity to be migrated into `Goal(type="routine")` |
| `Event` | Supporting calendar-like object; currently not central to the main product loop |

## Locked Target Shapes

### Goal
```ts
type Goal = {
  goalId: string
  userId: string
  type: "project" | "routine"
  title: string
  color: string

  streak: number
  longestStreak: number
  completedToday: boolean
  completionHistory: string[]
  totalCompletions: number
  badges: Badge[]
  xpValue: number

  tasks?: Task[]
  frequency?: "daily" | "weekly"
  targetDays?: number[]
  durationMinutes?: number
  icon?: string

  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Task
```ts
type Task = {
  taskId: string
  userId: string
  title: string
  color: string
  description?: string | null
  category?: "academic" | "work" | "personal" | string | null
  priority?: "low" | "medium" | "high" | string | null
  dueAt?: string | null
  estimatedMinutes?: number
  xpValue: number

  goalId?: string
  source?: "manual" | "ai" | "canvas"
  assignmentId?: string
  canvasAssignmentId?: string
  courseId?: string
  courseCode?: string
  syncedFromCanvas?: boolean
  canvasUrl?: string

  isComplete: boolean
  lastCompleted: string
  completedToday: boolean
  completedAt?: Timestamp

  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### ScheduleBlock
```ts
type ScheduleBlock = {
  blockId: string
  userId: string
  date: string
  startISO: string
  endISO: string
  startTime: string
  endTime: string
  type: "task" | "routine" | "break"
  taskId?: string | null
  goalId?: string | null
  status: "planned" | "completed" | "skipped" | "replaced"
  confidence?: number
  reasoning?: string
  provenance: "ai-generated" | "heuristic-fallback"
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### User
```ts
type User = {
  userId: string
  email: string
  firstName: string
  lastName: string

  totalXP: number
  level?: number
  badges: Badge[]
  loginStreak: number
  longestStreak: number
  lastLoginDate?: string | null

  university?: string
  major?: string
  year?: string
  gradYear?: number | ""
  homeTown?: string
  timezone?: string
  photo?: string

  onboardingAnswers?: Record<string, string | string[]>
  preferences?: UserPreferences
  notifications?: boolean
  weeklySummary?: boolean

  canvasToken?: string

  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Course
```ts
type Course = {
  courseId: string
  userId: string
  title: string
  courseCode?: string
  canvasId?: string
  canvasUrl?: string
  instructor?: string
  syllabus?: string
  semester?: string
  grade?: number
  targetGrade?: number
  isActive: boolean
  meetingTimes?: string
  meetingSchedule?: Array<{ days: string[]; startTime: string; endTime: string }>
  lastCanvasSync?: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Assignment
```ts
type Assignment = {
  assignmentId: string
  userId: string
  courseId: string
  title: string
  courseCode?: string
  canvasId?: string
  canvasUrl?: string
  description?: string
  dueDate?: string
  totalPoints?: number
  xpValue?: number
  completed: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Legacy Habit
```ts
type Habit = {
  habitId: string
  userId: string
  title: string
  description?: string
  frequency: "daily" | "weekly"
  targetDays: number[]
  category?: string
  durationMinutes: number
  xpValue: number
  icon?: string
  currentStreak: number
  longestStreak: number
  totalCompletions: number
  completionHistory: string[]
  isComplete: boolean
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

## Current Firestore Audit

### `users`
| Category | Fields |
| --- | --- |
| Required today | `userId`, `email`, `firstName`, `lastName`, `totalXP`, `canvasToken`, `badges`, `createdAt`, `updatedAt` |
| Optional today | `darkMode`, `fontScale`, `gradYear`, `loginStreak`, `longestStreak`, `lastLoginDate`, `major`, `notifications`, `photo`, `timezone`, `university`, `homeTown`, `year`, `onboardingAnswers`, `preferences`, `weeklySummary`, `taskColor`, `goalColor`, `defaultPriority`, `highContrast`, `highlightLinks`, `reduceMotion` |
| Legacy tolerated | User docs queried both by doc id and by `userId` field |
| Computed fields | `level` is controller-computed from `totalXP`; login streak is updated on login |
| Source of truth | `authController` seeds, `userController` owns updates, Firebase Auth owns credentials |

### `tasks`
| Category | Fields |
| --- | --- |
| Required today | `userId`, `title`, `color`, `isComplete`, `lastCompleted`, `xpValue`, `createdAt`, `updatedAt` |
| Optional today | `goalId`, `category`, `priority`, `description`, `dueAt`, `estimatedMinutes`, `completedAt` |
| Canvas-linked tolerated | `assignmentId`, `canvasAssignmentId`, `canvasUrl`, `courseId`, `courseCode`, `source`, `syncedFromCanvas`, `completedToday` |
| Legacy tolerated | `estimatedTime`, `userSkipCount` |
| Computed fields | `completedToday` derived from `lastCompleted === today` in `taskController`; scheduler computes `daysUntilDue` and source labels |
| Source of truth | `taskController` for manual edits, `canvasTaskSyncService` for Canvas fields |

### `goals`
| Category | Fields |
| --- | --- |
| Required today | `userId`, `title`, `color`, `type`, `streak`, `longestStreak`, `completedToday`, `completionHistory`, `totalCompletions`, `badges`, `createdAt`, `updatedAt` |
| Optional today | `xpValue`, `frequency`, `targetDays`, `durationMinutes`, `icon` |
| Legacy tolerated | Project goals currently materialize `tasks` as a title-to-XP map in API responses instead of embedded task records |
| Computed fields | `completedToday` may be derived from `completionHistory` in `getGoals` |
| Source of truth | `goalController`; linked task list lives in `tasks` collection |

### `habits`
| Category | Fields |
| --- | --- |
| Required today | `userId`, `title`, `frequency`, `targetDays`, `durationMinutes`, `xpValue`, `currentStreak`, `longestStreak`, `totalCompletions`, `completionHistory`, `isComplete`, `isActive`, `createdAt`, `updatedAt` |
| Optional today | `description`, `category`, `icon` |
| Legacy tolerated | Separate badge logic and separate scheduler branch |
| Computed fields | Daily idempotency and streak continuity are computed during completion |
| Source of truth | `habitController` today; to be retired after migration |

### `schedule_blocks`
| Category | Fields |
| --- | --- |
| Required today | `blockId`, `userId`, `date`, `startISO`, `endISO`, `startTime`, `endTime`, `type`, `status`, `createdAt`, `updatedAt` |
| Optional today | `taskId`, `habitId`, `confidence`, `reasoning` |
| Legacy tolerated | `habitId` pointer instead of `goalId` for routines |
| Computed fields | `itemTitle` and `xpValue` are joined in `getTodaySchedule` |
| Source of truth | `schedulerService` generates; `scheduleController` completes |

### `courses`
| Category | Fields |
| --- | --- |
| Required today | `userId`, `title`, `createdAt`, `updatedAt` |
| Optional today | `canvasId`, `canvasUrl`, `courseCode`, `grade`, `instructor`, `isActive`, `meetingTimes`, `meetingSchedule`, `semester`, `syllabus`, `targetGrade`, `lastCanvasSync` |
| Legacy tolerated | Meeting time strings parsed heuristically in scheduler |
| Computed fields | None durable; scheduler derives commitments from meeting fields |
| Source of truth | `courseController` for manual CRUD, `canvasController` for sync upserts |

### `assignments`
| Category | Fields |
| --- | --- |
| Required today | `userId`, `courseId`, `title`, `completed`, `createdAt`, `updatedAt` |
| Optional today | `canvasId`, `canvasUrl`, `courseCode`, `description`, `dueDate`, `totalPoints`, `xpValue` |
| Legacy tolerated | Assignment CRUD exists even though UI is not productized |
| Computed fields | `xpValue` during Canvas sync is derived from `totalPoints` |
| Source of truth | `assignmentController` for CRUD, `canvasController` for sync upserts |

## Product Semantics

### Project Goals
- Represent multi-step outcomes.
- Use AI task suggestions to create concrete starting tasks.
- Do not own granular work completion if linked tasks already do.
- May award a flat project completion bonus when the user explicitly completes the goal.

### Routine Goals
- Replace habits.
- Own recurrence, streak, completion history, and routine XP.
- May appear on schedules without requiring child tasks.
- Completion truth lives on the routine goal record, not on schedule blocks.

### Tasks
- Remain the base work unit for projects and imported assignments.
- Can exist with or without a linked goal.
- Canvas tasks remain tasks, not assignments masquerading as UI-only records.

### Schedule Blocks
- Represent the AI's recommendation for when work should happen.
- Never replace the underlying truth object for tasks or routine goals.
- Can be re-generated freely without changing the underlying source records.

## Habit To Routine Goal Migration Spec

### Objective
Replace `habits` as a long-term collection and API surface with `goals(type="routine")`.

### Mapping Rules
| Habit Field | Routine Goal Field |
| --- | --- |
| `title` | `title` |
| `description` | `description` in goal metadata if retained |
| `frequency` | `frequency` |
| `targetDays` | `targetDays` |
| `durationMinutes` | `durationMinutes` |
| `icon` | `icon` |
| `xpValue` | `xpValue` |
| `completionHistory` | `completionHistory` |
| `currentStreak` | `streak` |
| `longestStreak` | `longestStreak` |
| `totalCompletions` | `totalCompletions` |
| `isComplete` | `completedToday` or derived from `completionHistory` |

### Migration Metadata
- Add `migratedFromHabitId` on created routine goals.
- Add `migrationVersion` and `migratedAt` on migrated goals.
- Add `migrationStatus` on legacy habit docs: `pending | migrated | rolled_back`.
- Add `routineGoalId` on legacy habit docs after successful migration.

### Replay Safety
- Migration reruns must first look for a goal with matching `migratedFromHabitId`.
- If such a goal exists, update it rather than create a duplicate.
- Completion history merges must be set-based, not append-only duplicates.

### Rollback
- Keep legacy habit records until migration validation passes.
- Rollback means:
  - mark migrated routine goals as rollback-generated or delete only migration-generated routine goals,
  - reset legacy habit `migrationStatus`,
  - do not roll back any post-migration user completions without explicit reconciliation rules.

### Scheduler Migration
- Scheduler stops reading `habits`.
- Scheduler reads routine goals from `goals where type == "routine"`.
- `schedule_blocks.habitId` is replaced with `goalId`.
- Transitional reads may support both fields for one release while old blocks age out.

## XP Policy

### Locked Rules
- Task completion is the primary granular XP payout.
- Project goal completion pays a flat bonus only.
- Project goal completion must not sum linked task XP again.
- Routine goal completion pays routine XP plus bounded streak bonus.
- Schedule block completion must not double-pay if it completes an already XP-bearing task or routine goal.
- AI generation does not change XP policy.

### Leveling
- Current repo computes levels with an incremental ladder: each next level costs `100 * (currentLevel + 1)` XP.
- This remains the canonical formula unless explicitly revised in a dedicated XP change.

### Same-Day Idempotency
- Task completion: no repeat XP on the same day.
- Routine goal completion: no repeat XP on the same day.
- Project goal completion: one completion action per day; long-term archival completion behavior should be specified if projects become permanently finished.
- Schedule block completion: if the underlying item has already paid XP for the day, the block closes with `xpGained = 0`.

### Streak Bonuses
- Routine streak bonus is bounded and event-based:
  - day 7: `+5 XP`
  - day 21: `+15 XP`
- No uncapped linear streak payout.
- Badge awarding should use the same completion transaction that applies the streak.

## Current Ambiguities To Remove In Implementation
- `task.isComplete` and `task.lastCompleted` do not currently mean the same thing across controllers.
- `schedule_blocks` still reference `habitId`.
- Project goal completion currently pays XP even if linked tasks already exist; product rules must keep that as a flat explicit bonus only.
- Goals API currently returns project tasks as a title-to-XP map rather than normalized linked records.
