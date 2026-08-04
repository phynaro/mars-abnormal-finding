# Frontend Lint Cleanup Implementation Plan

> For agentic workers: execute this plan task-by-task and track steps with checkboxes.

**Goal:** Bring the existing frontend ESLint baseline to zero errors and warnings through small, behavior-preserving module cleanup batches.

**Architecture:** Keep the current ESLint configuration and frontend architecture. Clean shared modules before feature modules, replacing dead code and unsafe types locally, extracting non-component exports when Fast Refresh requires it, and validating Hook changes against the affected flow.

**Tech Stack:** React 18, TypeScript 5.8, Vite 7, ESLint 9, typescript-eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh.

## Global Constraints

- Change only frontend; do not modify backend, scripts, CI, or ESLint rules.
- Do not downgrade rules or introduce broad eslint-disable suppressions.
- Do not introduce formatting tooling.
- Make small local refactors only where required by a lint finding.
- Every batch runs targeted lint and npm run build from frontend.
- Effect, callback, async request, routing, and form changes require a focused manual smoke check or closest existing automated test.

## Baseline

Run from frontend:

    npm run lint

Current baseline: 450 errors and 86 warnings. The largest groups are pages (295 errors, 75 warnings), components (90 errors, 10 warnings), services (44 errors), and contexts (15 errors, 1 warning).

For batch checks:

    npx eslint <target paths>
    npm run build

When replacing any, use an existing domain type, a narrow local interface, a generic parameter, or unknown narrowed at the use site. Never use a broad object type only to satisfy ESLint.

### Task 1: Shared Foundations

**Files:**
- Modify: frontend/src/components/ui/
- Modify: frontend/src/contexts/
- Modify: frontend/src/hooks/
- Modify: frontend/src/types/
- Modify: frontend/src/utils/
- Modify: frontend/src/services/

**Interfaces:**
- Consumes: UI primitive props, provider contracts, API response models, and shared type exports.
- Produces: lint-clean shared APIs without changed component props, provider values, request paths, or response shapes.

- [ ] Record the shared baseline.

    npx eslint src/components/ui src/contexts src/hooks src/types src/utils src/services

- [ ] Remove unused values and correct type-only declarations. Check exported symbols with rg before deleting them. Replace empty interfaces extending native props with a type alias when no members are added.

- [ ] Fix unsafe types and Fast Refresh boundaries. Use library prop types for UI wrappers. Extract runtime constants, helper functions, and context hooks into nearby modules when required.

- [ ] Review changed provider and service behavior. Confirm token refresh, language/theme/toast state, EMS access, and a representative API-backed screen still work.

- [ ] Verify and commit.

    npx eslint src/components/ui src/contexts src/hooks src/types src/utils src/services
    npm run build
    git add frontend/src/components/ui frontend/src/contexts frontend/src/hooks frontend/src/types frontend/src/utils frontend/src/services
    git commit -m "refactor: clean shared frontend lint findings"

### Task 2: Shared Layout and EMS

**Files:**
- Modify: frontend/src/components/layout/
- Modify: frontend/src/components/common/
- Modify: frontend/src/components/ems/
- Modify: frontend/src/pages/ems/

**Interfaces:**
- Consumes: route state, auth/permission context, EMS services, chart props, and URL filter state.
- Produces: lint-clean navigation and EMS UI with unchanged filtering, charts, equipment details, schedules, role views, and work-order views.

- [ ] Record the targeted baseline.

    npx eslint src/components/layout src/components/common src/components/ems src/pages/ems

- [ ] Clean layout and common components. Remove dead imports and props only after checking all call sites. For Hook fixes, confirm active route state and mobile navigation remain correct.

- [ ] Clean EMS modules in dependency order: shared exports, equipment, dashboard, schedule, roles, work orders, then pages. Extract status/filter helpers from component modules where Fast Refresh requires it.

- [ ] Smoke-check desktop/mobile navigation and EMS: apply an equipment filter, open an equipment record, inspect a dashboard chart, and open the schedule view. Confirm no duplicate requests or stale filters.

- [ ] Verify and commit.

    npx eslint src/components/layout src/components/common src/components/ems src/pages/ems
    npm run build
    git add frontend/src/components/layout frontend/src/components/common frontend/src/components/ems frontend/src/pages/ems
    git commit -m "refactor: clean layout and EMS lint findings"

### Task 3: Dashboard, Charts, and Home

**Files:**
- Modify: frontend/src/components/dashboard/
- Modify: frontend/src/components/home/
- Modify: frontend/src/pages/dashboard/
- Modify: frontend/src/pages/charts/
- Modify: frontend/src/pages/home/

**Interfaces:**
- Consumes: dashboard-service response models and chart-library callback values.
- Produces: lint-clean dashboard/chart/home screens with stable filters, period selection, data fetching, and rendering.

- [ ] Record the dashboard baseline.

    npx eslint src/components/dashboard src/components/home src/pages/dashboard src/pages/charts src/pages/home

- [ ] Replace formatter and response any types. Use chart-library types where available; otherwise define narrow formatter and data-point interfaces for the fields read.

- [ ] Resolve dead code and Hook dependencies without changing query semantics. Verify selected periods and filters do not cause duplicate fetches.

- [ ] Open each altered dashboard/chart, change an available filter, and confirm a single refresh. Open altered home views and confirm KPI cards render.

- [ ] Verify and commit.

    npx eslint src/components/dashboard src/components/home src/pages/dashboard src/pages/charts src/pages/home
    npm run build
    git add frontend/src/components/dashboard frontend/src/components/home frontend/src/pages/dashboard frontend/src/pages/charts frontend/src/pages/home
    git commit -m "refactor: clean dashboard and home lint findings"

### Task 4: Tickets and Ticket Management

**Files:**
- Modify: frontend/src/components/tickets/
- Modify: frontend/src/components/ticket-management/
- Modify: frontend/src/components/ticket-approval/
- Modify: frontend/src/pages/tickets/

**Interfaces:**
- Consumes: ticket service contracts, filters, permission state, ticket form values, and file-preview lifecycle helpers.
- Produces: lint-clean ticket flows with preserved lists, details, creation, approval, attachments, and route behavior.

- [ ] Record the ticket baseline.

    npx eslint src/components/tickets src/components/ticket-management src/components/ticket-approval src/pages/tickets

- [ ] Remove dead helpers only after checking consumers with rg.

- [ ] Fix request typing, switch cases, and Hook dependencies. Preserve URL filter initialization and prevent fetch loops. Preserve object-URL creation and cleanup for previews.

- [ ] Smoke-check the list, a filter, a ticket detail, creation/approval UI, and attaching/removing a file preview without submitting changes.

- [ ] Verify and commit.

    npx eslint src/components/tickets src/components/ticket-management src/components/ticket-approval src/pages/tickets
    npm run build
    git add frontend/src/components/tickets frontend/src/components/ticket-management frontend/src/components/ticket-approval frontend/src/pages/tickets
    git commit -m "refactor: clean ticket lint findings"

### Task 5: Administration, Work Management, and Final Cleanup

**Files:**
- Modify: frontend/src/pages/asset/
- Modify: frontend/src/pages/org/
- Modify: frontend/src/pages/settings/
- Modify: frontend/src/pages/works/
- Modify: frontend/src/components/machine-management/
- Modify: frontend/src/components/personal/
- Modify: frontend/src/components/personnel/
- Modify: frontend/src/components/user-management/
- Modify: residual affected source files, including frontend/src/App.tsx.

**Interfaces:**
- Consumes: asset, organization, notification, target, user-management, work-order, work-request, workflow, and machine service contracts.
- Produces: lint-clean frontend source with no changed permission checks, mutation payloads, or list/detail navigation behavior.

- [ ] Run npm run lint and group the residual findings by the directories above. Trace unexpected new categories to the preceding task that introduced them.

- [ ] Clean administration and work modules. Use narrow API/event types, remove dead code, and validate permission-gated controls and non-destructive dialog/filter interactions.

- [ ] Clean App.tsx and remaining isolated files. Preserve route and provider composition. Do not change eslint.config.js except to repair a configuration defect that prevents already-enabled rules from running.

- [ ] Smoke-check a changed asset page, organization/user page, settings page, work request/order page, and machine list/detail route using non-destructive interactions.

- [ ] Verify final completion.

    npm run lint
    npm run build

Expected: both commands exit with status 0; ESLint reports zero errors and zero warnings.

- [ ] Review and commit.

    git diff --check
    git diff --stat
    git status --short
    git add frontend
    git commit -m "refactor: complete frontend lint cleanup"

