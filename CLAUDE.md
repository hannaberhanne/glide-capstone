# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Non-negotiable rules
- Do NOT commit or push anything without showing the exact diff and getting explicit approval first
- Do NOT resolve merge conflicts autonomously — show the conflict and ask which logic to keep
- Do NOT create or push markdown planning/spec/audit docs into the codebase
- Do NOT commit .claude/ or any tool metadata
- Do NOT push code that reads as AI-generated — no verbose comments explaining obvious logic, no "helper function to...", no generated filenames like PLANNER_AUDIT.md, no placeholder text, no suspiciously uniform formatting. Code should read like a human wrote it.

## Commands

### Backend (run from `backend/`)
```bash
npm run dev          # Start dev server on :8080
npm start            # Start production server
npm test             # Run all backend tests (Node built-in test runner)
```

### Frontend (run from `frontend/`)
```bash
npm run dev          # Start Vite dev server on :5173
npm run build        # Production build → dist/
npm run lint         # ESLint
npm run preview      # Preview production build
```

### Running single backend tests
```bash
cd backend && node --test tests/completionRules.test.js
```

## Architecture

Glide+ is an AI-powered student productivity platform. It is a two-process app — a React SPA (`frontend/`) and an Express REST API (`backend/`). They communicate over HTTP; the frontend proxies nothing — it calls `VITE_API_BASE_URL` (default `http://localhost:8080`) directly.

### Backend (`backend/`)

`server.js` registers all Express routes, then delegates:

```
Routes → Controllers → Services → Firestore (via firebase-admin)
```

- **`config/firebase.js`** — initialises Firebase Admin from env vars; exports `admin` and `db`.
- **`middleware/authMiddleware.js`** — verifies Firebase ID tokens on protected routes; attaches `req.user`.
- **`controllers/`** — one file per domain (tasks, schedule, goals, canvas, ai, auth, users, events, assignments, courses, quotes, notifications).
- **`services/`** — heavier logic extracted from controllers: `aiService.js` (OpenAI), `schedulerService.js`, `canvasService.js`, `canvasTaskSyncService.js`, `notificationService.js`.
- **`models/`** — plain JS shape definitions (no ORM).
- **`domain/`** — pure business-logic: `completion.js` (XP outcome builders), `xp.js` (level formula), `routineBadges.js`, `notificationPreferences.js`, `taskXp.js`, `sanitize.js`, `canvasTaskProjection.js`.

Key integrations:
- **OpenAI `gpt-4o-mini`** — generates and replans daily schedule blocks (`/api/schedule`, `/api/ai`).
- **Canvas LMS** — reads assignments via `CANVAS_TOKEN` + `CANVAS_BASE_URL`; syncs them as tasks under the `academic` category.

### Frontend (`frontend/src/`)

React 19 + React Router v7 SPA. No TypeScript, no global state library.

- **`config/firebase.js`** — Firebase Web SDK init from `VITE_*` env vars; exports `auth` and `db`.
- **`pages/`** — one component per route (Dashboard, Planner, Goals, Settings, Login, Signup, Onboarding, CanvasSetup, ForgotPassword, Landing, Demo).
- **`components/`** — shared UI. Key ones: `Layout` (app shell), `TaskModal`, `AccessibilityMenu`, `AlertBanner`.
- **`hooks/`** — `useTasks`, `useUser`, `useCanvasStatus`, `useAccessibilityPrefs`, `useSchedule`, `useNotificationRegistration`.
- **`pages/dashboard/`** and **`pages/planner/`** are the most complex pages; each has its own ViewModel file (`dashboardViewModel.js`, `plannerViewModel.js`) and a state machine (`plannerStateMachine.js`).
- Styling is vanilla CSS with per-component `.css` files (no Tailwind, no CSS-in-JS).

### Data conventions
- Effort is stored as `estimatedMinutes` in Firestore but the UI accepts and displays **hours**.
- Canvas-synced tasks always get `category: "academic"`.
- XP is awarded on task/goal completion and tracked on the `users` document. Level is derived from `totalXP` via `computeLevel` in `domain/xp.js` (each level requires 100×(level+1) XP above the previous threshold).

### Environment variables

Backend (`.env` in `backend/`):
```
PORT=8080
FIREBASE_TYPE / FIREBASE_PROJECT_ID / FIREBASE_PRIVATE_KEY_ID / FIREBASE_PRIVATE_KEY / FIREBASE_CLIENT_EMAIL / FIREBASE_CLIENT_ID
OPENAI_API_KEY
CANVAS_BASE_URL=https://utamta.instructure.com/api/v1
CANVAS_TOKEN=
```

Frontend (`.env` in `frontend/`):
```
VITE_API_BASE_URL=http://localhost:8080
VITE_FIREBASE_API_KEY / VITE_FIREBASE_AUTH_DOMAIN / VITE_FIREBASE_PROJECT_ID / VITE_FIREBASE_STORAGE_BUCKET / VITE_FIREBASE_MESSAGING_SENDER_ID / VITE_FIREBASE_APP_ID
```

## Firestore — actual field names (prod as of April 23 2026)

### Collections in prod
assignments, courses, goals, quotes, schedule_blocks, tasks, users
habits does NOT exist yet in prod.

### tasks
Two document shapes coexist in the same collection:

Goal tasks (have goalId):
`goalId`, `lastCompleted` (string "YYYY-MM-DD"), `color`, `xpValue`, `title`, `userId`, `createdAt`, `updatedAt`

Standalone tasks (no goalId):
`category`, `color`, `isComplete`, `lastCompleted`, `dueAt`, `description`, `priority`, `xpValue`, `title`, `userId`, `createdAt`, `updatedAt`

### Completion model
- Task has `goalId` → daily reset via `lastCompleted`. Completing hides it today, resets tomorrow.
- Task has no `goalId` → permanent completion via `isComplete: true`.
- This distinction must be preserved everywhere.

### users
`createdAt`, `email`, `firstName`, `lastName`, `homeTown`, `level`, `major`, `timezone`, `totalXP`, `university`, `updatedAt`, `userId`, `year`, `badges`
Note: duplicate `hometown`/`homeTown` fields exist in some documents — known bug, do not add more writes using the wrong casing.

### goals
`color`, `streak`, `longestStreak`, `totalCompletions`, `completionHistory` (string[] of "YYYY-MM-DD"), `badges`, `type` ("routine"|"project"), `title`, `userId`, `xpValue`, `createdAt`, `updatedAt`
- `routine` goals: track streaks, `completionHistory` grows each day completed, streak resets if yesterday not in history.
- `project` goals: one-time completion, `totalCompletions` goes from 0 → 1.
Note: `deadline`, `priority`, `timesPerWeek` do NOT exist in prod. Do not reference them.

### schedule_blocks
`blockId`, `confidence`, `createdAt`, `date`, `endISO`, `endTime`, `habitId`, `reasoning`, `startISO`, `startTime`, `status`, `taskId`, `type`, `updatedAt`, `userId`

### courses
`canvasId`, `canvasUrl`, `courseCode`, `courseId`, `createdAt`, `grade`, `instructor`, `isActive`, `lastCanvasSync`, `meetingTimes`, `semester`, `syllabus`, `targetGrade`, `title`, `updatedAt`, `userId`

### assignments
`canvasId`, `canvasUrl`, `completed`, `courseCode`, `courseId`, `createdAt`, `description`, `dueDate`, `title`, `totalPoints`, `updatedAt`, `userId`, `xpValue`

### quotes
`author`, `category`, `text`

## Naming conventions
- `userId` — always camelCase. Never `userid` lowercase.
- `dueAt` — tasks. `dueDate` — assignments. Do not mix.
- `xpValue` — always. Never `xp` alone.

## AI functionality status
- Goal task suggestions: real OpenAI call. `POST /api/goals/suggest-tasks`
- Daily schedule generation: real OpenAI call with heuristic fallback. `POST /api/schedule/generate`
- Assignment extraction: real OpenAI call. `POST /api/ai/extract`
- Planner replan: heuristic only, no OpenAI. `POST /api/ai/replan`
- Task XP: AI-generated at creation time, stored in `xpValue`
