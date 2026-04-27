# Glide Unification Plan

## Program Objective
Ship Glide as one trustworthy student-planning product whose AI planner, goals model, Canvas intake, settings, notifications, and launch story all point in the same direction.

## Executive Decisions
- Goals are the future model.
- Habit migration happens in this cycle.
- Planner is the primary AI surface.
- Dashboard is the operational summary surface.
- Canvas sync auto-plans after material workload changes.
- Notifications are real push and email requirements.
- Placeholder UI may exist during implementation only if it has an explicit near-term owner and removal condition.

## Workstreams

| Workstream | Goal |
| --- | --- |
| Product and Domain | Lock semantics for goals, routines, AI planning, Canvas, notifications, and XP |
| Backend | Make data, endpoints, and completion flows consistent and testable |
| Frontend | Expose real product behavior, not disconnected prototypes |
| Design | Unify all surfaces around one system rooted in Dashboard and Planner |
| UX and Onboarding | Make the first session prove Glide's value quickly |
| Growth and Marketing | Align landing/demo/app-store story to real shipped behavior |
| QA and Release | Cover all major paths, screenshot sweep, regression gates |

## Phase 0: Spec Pack

### Output
- `docs/product/glide-scope.md`
- `docs/product/feature-matrix.md`
- `docs/architecture/domain-model.md`
- `docs/architecture/api-contracts.md`
- `docs/design/glide-design-system.md`
- `docs/roadmap/glide-unification-plan.md`

### Exit Criteria
- Every routed page is represented.
- Every major backend controller is represented.
- Goals, routines, AI, Canvas, notifications, and XP ownership are explicitly defined.

## Phase 1: Product Contract Lock

### Required Deliverables
- Final sign-off on `Goal.type = project | routine`
- Final sign-off on habit deprecation path
- Final sign-off on Planner-first AI experience
- Final sign-off on Dashboard's role as summary, not alternate planner
- Final sign-off on Canvas auto-plan behavior
- Final sign-off on notification value proposition

### Decision Gate
No page redesign begins before product semantics are frozen.

## Phase 2: Backend Hardening

### 2.1 Domain Cleanup
- Normalize task completion semantics around `lastCompleted`, `isComplete`, and XP payout.
- Normalize goal API output so project goals no longer rely on title-to-XP maps.
- Replace `schedule_blocks.habitId` with `goalId`.
- Introduce migration markers for habit-to-goal conversion.

### 2.2 Habit Migration
1. Add migration metadata fields and replay-safe logic.
2. Build one migration runner that:
   - reads active habits,
   - upserts `Goal(type="routine")`,
   - backfills streak/completion data,
   - marks source habits as migrated.
3. Update scheduler and completion flows to use routine goals.
4. Validate parity with legacy habit behavior.
5. Deprecate habit routes.

### 2.3 XP Consistency
- Make task completion the primary granular payout.
- Keep project completion bonus flat and explicit.
- Keep routine payout on the goal completion transaction.
- Ensure schedule block completion delegates to underlying item truth and does not double-pay.

### 2.4 Notifications Backend
- Select providers for push and email.
- Define preference storage and quiet hours.
- Define retry, dedupe, anti-spam, and failure logging.
- Define trigger sources:
  - missed scheduled block
  - important task near due time
  - streak risk
  - daily plan ready
  - Canvas load spike or replan needed

### 2.5 Canvas Lifecycle
- Token save
- status read
- sync
- disconnect
- synced-data cleanup
- auto-sync cadence
- auto-plan after material change

### 2.6 Backend Test Plan
- `goalController`
- `userController`
- `scheduleController`
- `taskController`
- `canvasController`
- migration runner
- XP consistency matrix

### Backend Exit Criteria
- No controller remains semantically ambiguous.
- Migration is replay-safe.
- Schedule, routine, and task completions are idempotent.
- Canvas sync can trigger planning in one transactionally coherent flow.

## Phase 3: Product Completion

### 3.1 Planner Becomes Real
- Replace separate assist-vs-schedule story with one schedule runtime.
- Planner supports:
  - generate schedule
  - fetch by date
  - complete block
  - replan
  - explanation of placement choices
  - visibility into deferred work

### 3.2 Dashboard Consumes Real Plan
- Show today's AI-generated plan.
- Show urgent schedule changes.
- Show missed-work recovery state.
- Provide lightweight action into Planner.

### 3.3 Canvas To Plan Pipeline
Target flow:
1. Connect Canvas.
2. Save token.
3. Sync courses, assignments, and linked tasks.
4. Detect material workload changes.
5. Auto-run planning.
6. Reflect result in Planner and Dashboard.
7. Notify user if the plan materially changed.

### 3.4 Goals Completion
- Support both project and routine goal cards.
- Use real routine streaks and completions.
- Keep AI task suggestion for project goals.
- Remove placeholder stats and badge theater.

### 3.5 Settings Truthfulness
- Remove or implement password update.
- Connect notification controls to real behavior.
- Keep accessibility preferences coherent across devices.
- Make Canvas management a real account integration surface.

### 3.6 Onboarding Completion
- Persist answers.
- Persist first goal seeding.
- Feed answers into planning profile defaults.
- Demonstrate Glide making a decision before the user reaches an empty dashboard.

### Product Exit Criteria
- No marquee feature remains backend-only.
- No major visible UI is fake.
- AI is felt as the operating layer of the product.

## Phase 4: Frontend Unification

### Systemization Order
1. Consolidate global tokens in `App.css` and `index.css`.
2. Unify shared controls and panels.
3. Bring Goals into the Dashboard/Planner family.
4. Bring Settings and Canvas Setup into the same shell language.
5. Rebuild auth/onboarding/public pages last against the settled system.

### Screen Rebuild Order
1. Goals
2. Settings
3. Canvas Setup
4. Planner
5. Dashboard
6. Login / Signup / Forgot Password
7. Onboarding
8. Landing / Demo

### Design Exit Criteria
- Every screen reads as Glide.
- Private routes no longer look like separate apps.
- Public routes belong to the same family.

## Phase 5: Release Readiness

### QA
- Route smoke tests on all routed pages
- Authenticated flow tests:
  - login
  - onboarding
  - task CRUD
  - project goal CRUD
  - routine goal completion
  - Canvas connect plus sync
  - schedule generation plus block completion
- Screenshot sweep:
  - `/`
  - `/login`
  - `/signup`
  - `/forgot-password`
  - `/onboarding`
  - `/demo`
  - `/dashboard`
  - `/planner`
  - `/goals`
  - `/settings`
  - `/canvas-setup`

### Release Candidate Gate
- AI visibly plans work for the user.
- Canvas sync visibly updates that plan.
- Routine goals fully replace habits in the user-facing concept.
- No dead controls remain on private screens.
- Notification preferences are backed by real delivery behavior.

## Phase 6: App Store and Go-To-Market

### Native/App Track
- Use Capacitor for the app-store path.
- Define native requirements:
  - push notifications
  - optional local notifications
  - deep links
  - app icon and splash
  - privacy disclosures
  - account deletion support

### Launch Narrative
Glide should be marketed as:
- an AI study-planning system for students
- a product that imports real school workload
- a product that turns goals into day plans
- a product that helps recover when the plan breaks

Avoid positioning it as:
- a generic to-do app
- a habit-only gamification tool
- a calendar shell without intelligence

### Public-Surface Rule
Landing and demo copy must only claim capabilities already present in the shipped private product.

## Critical Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Habit migration breaks streak history | Replay-safe migration, validation script, rollback metadata |
| Schedule block completion double-pays XP | Underlying-item completion ownership contract plus tests |
| Planner and Dashboard drift into two different models | Planner owns schedule truth; Dashboard consumes it |
| Canvas creates noisy replans | Material-change detection and anti-spam notification rules |
| Settings continues to overpromise | Remove or ship every control before RC |
| Public marketing promises exceed product | Rebuild landing/demo last, using real screenshots and flows |

## Final Done Definition
Glide is done for this cycle when a new student can sign up, answer onboarding questions, connect Canvas, receive an automatically generated day plan, complete planned work without XP inconsistencies, manage project and routine goals in one model, receive real notification nudges, and see a coherent product language across every surface.
