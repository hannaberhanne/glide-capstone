# Glide Scope

## Product Definition
Glide is an AI-driven student planning system. It is not a loose bundle of tasks, habits, planner tools, and Canvas utilities. It is one product with one operating model:

- `Goal` is the canonical intent model.
- `Task` is the canonical work unit.
- `ScheduleBlock` is AI planning output.
- `Habit` is legacy data and logic to migrate into `Goal(type="routine")`.
- The Planner is the primary workspace for AI-generated schedules.
- The Dashboard is the operational summary of the resulting plan.

The user should not be expected to manually manage everything. Glide is responsible for proposing, sequencing, refreshing, and recovering the plan. The user primarily approves, adjusts, defers, and overrides.

## Product Promise
Glide helps a student answer four questions every day:

1. What matters most today?
2. When should I do it?
3. What changed since yesterday?
4. What is the easiest next action?

The product only succeeds if those answers are visible without the user building the plan from scratch.

## Canonical Product Rules

### Goals
- `Goal.type` is locked to `project | routine`.
- `project` goals represent multi-step outcomes.
- `routine` goals replace habits as the long-term product concept.
- Goals own streak, completion history, and badge/XP metadata.
- Project goals may contain linked tasks.
- Routine goals may contain recurrence metadata and should not require child tasks to exist.

### Tasks
- Tasks remain the base unit of executable work.
- Tasks may be manual, AI-suggested, or Canvas-derived.
- Task completion is the primary granular XP event.
- Tasks can belong to a project goal.

### Schedule Blocks
- Schedule blocks are AI planning output, not user-authored source-of-truth objects.
- A block may reference an underlying task or routine goal.
- Completing a block should update the underlying source item without double-paying XP.

### Planner and Dashboard
- Planner is the primary AI schedule workspace.
- Dashboard consumes the current schedule and risk state.
- Planner owns generate, replan, explain, and block completion.
- Dashboard owns today's snapshot, urgent changes, and lightweight adjustments.

### Canvas
- Canvas sync is an intake system into Glide's brain.
- Sync creates or updates tasks.
- If sync materially changes the workload, Glide auto-runs planning immediately.
- Planner and Dashboard must reflect the new plan after sync.

### Notifications
- Notifications are a real shipped capability, not a placeholder setting.
- Delivery modes are push and email.
- Initial trigger classes are missed blocks, due-soon important tasks, streak risk, daily plan ready, and major replan/load changes.

## User Interaction Model

### Glide does for the user
- Import academic load from Canvas.
- Suggest tasks for project goals.
- Generate the day's schedule.
- Replan when workload changes.
- Surface recovery nudges when work is missed.

### The user does
- Create or edit goals.
- Add or adjust tasks.
- Override schedule choices.
- Complete work.
- Control preferences, notifications, and connected accounts.

## Routed Surface Scope

| Route | Surface | Scope In This Cycle |
| --- | --- | --- |
| `/` | Landing | Public product proof, aligned to actual shipped behavior |
| `/demo` | Demo | Real preview or screenshots, not placeholder cards |
| `/login` | Login | Firebase sign-in plus login streak update |
| `/signup` | Signup | Firebase sign-up plus user profile creation |
| `/forgot-password` | Forgot password | Firebase reset flow |
| `/onboarding` | Onboarding | Persist answers, seed first goal, influence planning |
| `/canvas-setup` | Canvas setup | Token save, sync, clear handoff into planning |
| `/dashboard` and `/home` | Dashboard | Daily operational summary of AI plan |
| `/planner` | Planner | Primary schedule generation, viewing, completion, replan, explanations |
| `/goals` | Goals | Unified project and routine goal management |
| `/settings` | Settings | Profile, preferences, Canvas management, real notification settings |

## In Scope For Product Completion
- Auth flows and post-auth handoff
- Onboarding persistence and first-session value
- Dashboard as today's control tower
- Planner as AI schedule surface
- Goal unification around `project` and `routine`
- Canvas intake and auto-plan behavior
- Real notification architecture
- Truthful settings and account management
- Design system unification across public and private surfaces
- Backend migrations, controller hardening, and tests

## Explicitly Out Of Scope For This Cycle
- Maintaining habits as a permanent first-class product separate from goals
- Shipping fake metrics, empty badge theater, or inert settings controls
- Preserving disconnected AI features that do not feed the actual schedule engine
- Building a generic productivity app for non-student personas

## Release Candidate Definition
Glide is ready for the final productization pass when all of the following are true:

- Routine goals fully replace habits in the user-facing model.
- Canvas sync updates tasks and refreshes the schedule automatically.
- Planner exposes real schedule generation, block completion, and replan.
- Dashboard reflects today's planned work and recovery state.
- Settings only shows real behaviors or clearly near-term unfinished items behind release guards.
- Notification preferences map to actual delivery behavior.
- Every major route and controller has a defined contract and owner.
