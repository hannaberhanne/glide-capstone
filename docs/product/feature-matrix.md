# Glide Feature Matrix

## Routed Surfaces

| Surface | Route | Current State In Repo | Target State In Unification Cycle | Primary Backend Dependencies | Release Bar |
| --- | --- | --- | --- | --- | --- |
| Landing | `/` | Marketing-forward; still references habits as a live concept | Real product framing around AI planning, goals, Canvas, notifications, and proof | None required beyond public assets | Must reflect actual product truth |
| Demo | `/demo` | Placeholder preview cards | Real screenshots or interactive proof tied to current product | None required beyond assets | No placeholder preview boxes in final pass |
| Login | `/login` | Firebase auth plus `/api/auth/login` streak update | Keep simple; unify copy and visuals with auth family | `authController`, `userController` | Reliable login, streak update, redirect |
| Signup | `/signup` | Firebase account creation plus `/api/auth/signup` profile creation | Keep simple; feed directly into onboarding | `authController` | Reliable account creation and profile seed |
| Forgot Password | `/forgot-password` | Firebase reset email flow only | Remains Firebase-native, visually unified | Firebase client auth only | Clear, truthful recovery flow |
| Onboarding | `/onboarding` | Persists answers and seeds a project goal | Persist answers, seed first goal, feed planning inputs, intentional Canvas handoff | `userController`, `goalController`, later `scheduleController` | First-session value and downstream personalization |
| Canvas Setup | `/canvas-setup` | Token save and manual sync | Token save, sync, auto-plan feedback, next-step clarity | `userController`, `canvasController`, `scheduleController` | Import must clearly feed planning |
| Dashboard | `/dashboard`, `/home` | Strong task-focused daily view; no real schedule feed | Operational summary of AI-generated day plan, missed-work recovery, streak/risk | `taskController`, `userController`, `scheduleController`, later notifications | Must feel like the output of Glide's brain |
| Planner | `/planner` | Excellent visual north star; still uses separate assist flow based on task due dates | Primary AI schedule workspace with generate, view, complete block, replan, explanations | `scheduleController`, `taskController`, `goalController`, `aiController` during transition | Must own schedule truth |
| Goals | `/goals` | Functional goals with placeholder stats and project-only assumptions; no routine UI | Unified project and routine goals, real stats, real streaks, AI task suggestion, no placeholder badge theater | `goalController`, `taskController`, `habitController` during migration | Must encode the canonical goal model |
| Settings | `/settings` | Improved shell, but password field is inert and notifications are not real | Truthful account, preferences, notifications, Canvas management, accessibility | `userController`, `canvasController`, Firebase auth, later notifications services | No fake controls |

## Product Capabilities

| Capability | Current State In Repo | Locked Target | Primary Controllers / Services | Notes |
| --- | --- | --- | --- | --- |
| Auth | Implemented with Firebase plus user profile creation/login streaks | Keep Firebase-native; unify visual language and handoff | `authController`, Firebase client auth | Password change in settings is not implemented |
| Dashboard | Live and visually strong | Consume day plan, schedule risks, and lightweight adjustments | `taskController`, `scheduleController`, `userController` | Must stop behaving like a plain task list |
| Tasks | Live CRUD with XP on completion | Remain base work unit across manual, AI, and Canvas work | `taskController` | Current completion semantics are partially inconsistent with schedule blocks |
| Planner | Live monthly planning UI with separate assist mode | Primary AI schedule surface | `scheduleController`, `schedulerService`, `aiController` transitionally | Assist and schedule generation must converge |
| Goals | Live CRUD plus AI task suggestion | Canonical goal system with `project` and `routine` | `goalController`, `taskController` | Current page still assumes task-map cards |
| Routine Goals | Partially present in backend `Goal.type="routine"`; habits still exist separately | Replace habits as the only long-term routine model | `goalController`, `habitController` migration, `schedulerService` | Same-cycle migration |
| Canvas Sync | Functional task/course/assignment import | Intake plus automatic replanning and user messaging | `canvasController`, `canvasTaskSyncService`, `schedulerService` | Current sync stops at import |
| AI Schedule Engine | Backend exists | Main operating layer of Glide | `scheduleController`, `schedulerService` | Planner-first surface, Dashboard summary |
| Notifications | Preference booleans only | Real push + email architecture | `userController`, future jobs/provider integration | No provider or delivery events yet |
| Settings | Mostly wired profile/preferences save | Only real behaviors remain visible | `userController`, `canvasController`, Firebase auth | Password and notifications need truth |
| Onboarding | Persists answers and first goal | Must influence later planning and suggestions | `userController`, `goalController`, `scheduleController` | Answers are currently stored but not consumed |
| Landing / Demo | Present but partially aspirational | Last-mile trust and proof of product | None required beyond content/assets | Must be rebuilt after private surfaces settle |

## Backend Controller Coverage

| Controller | Current Responsibility | Product Status |
| --- | --- | --- |
| `authController` | Signup profile creation and login streak updates | Core and retained |
| `userController` | Profile, preferences, Canvas token, onboarding answers | Core and retained; needs stricter contract |
| `taskController` | Task CRUD and task XP completion | Core and retained |
| `goalController` | Goal CRUD, completion, AI task suggestion | Core and retained; becomes canonical routine/project owner |
| `habitController` | Legacy habit CRUD and completion | Transitional only; migrate into routine goals |
| `scheduleController` | Generate schedule, fetch by date, replan, complete block | Core and retained; becomes primary AI runtime surface |
| `canvasController` | Canvas sync, status, disconnect | Core and retained; must trigger planning |
| `assignmentController` | Assignment CRUD | Supporting academic data layer |
| `courseController` | Course CRUD | Supporting academic data layer |
| `eventController` | Event CRUD | Existing but not productized in current UI |
| `aiController` | Text extraction and heuristic replanning suggestions | Transitional; replan feature should converge with schedule engine |
| `quotesController` | Public quote feed | Cosmetic only; low product importance |

## Immediate Product Gaps To Close
- Goals and habits still overlap semantically.
- Planner assist and schedule generation are separate AI stories.
- Canvas sync does not auto-plan.
- Schedule block completion can duplicate XP semantics.
- Settings shows a password field without an implemented update flow.
- Notification preferences exist without notification delivery.
- Goals stats and badges are mostly placeholder-grade.
- Demo page is placeholder content.
