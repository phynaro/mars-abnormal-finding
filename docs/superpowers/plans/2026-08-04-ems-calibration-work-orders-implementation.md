# EMS Calibration Work Orders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated, fully filterable EMS calibration work-orders page and route chart drill-down to it with matching status/date filters.

**Architecture:** Keep Schedule as PM due-date planning. Build a new WO read model (same semantics as dashboard WO period chart) exposed via `/api/ems/work-orders` and `/api/ems/work-orders/kpi`, then render `/ems/work-orders` with URL-synced filters, KPI tiles, table/cards, and pagination. Update nav + i18n + chart click behavior to deep-link into this page.

**Tech Stack:** Node.js/Express + MSSQL (backend), React + TypeScript + Vite + Recharts (frontend), existing EMS layout/filter/table primitives.

**Spec:** `docs/superpowers/specs/2026-08-04-ems-calibration-work-orders-design.md`

## Global Constraints

- Keep Schedule semantics unchanged (`PMSched.DUEDATE` planning page remains intact).
- New WO page must use `WO.SCH_FINISH_D` as primary date filter.
- Completion status must match chart logic exactly: `ontime | late | not_finish`.
- Drill-down from chart segment must pass plant (when present), period date range, and clicked status.
- Scope must remain read-only.
- Add en/th strings for new page and updated chart description copy.
- Do not create root-level docs/tests/scripts; keep artifacts under prepared folders.

---

## File Structure

| File | Responsibility |
|---|---|
| `backend/src/controllers/ems/workOrderController.js` (new) | Work-order list + KPI endpoints with shared filter parsing |
| `backend/src/routes/ems.js` | Register `/work-orders` and `/work-orders/kpi` routes |
| `backend/src/helpers/emsQueryHelpers.js` | Shared WO status/date SQL helpers extracted for reuse |
| `backend/src/controllers/ems/dashboardController.js` | Reuse shared helper for wo-period-status to prevent drift |
| `frontend/src/services/emsService.ts` | New types + API calls for work-order list/KPI |
| `frontend/src/pages/ems/WorkOrdersPage.tsx` (new) | Page container, URL-state, data loading, pagination |
| `frontend/src/components/ems/workOrders/*` (new) | Filter bar, table, card list, status helper |
| `frontend/src/components/ems/dashboard/DashboardWoPeriodChart.tsx` | Route drill-down to new page with segment status |
| `frontend/src/pages/ems/EmsLayout.tsx` | Add Work Orders tab to EMS subnav |
| `frontend/src/components/layout/menuConfig.tsx` | Add EMS child menu entry for Work Orders |
| `frontend/src/App.tsx` | Register `ems/work-orders` route |
| `frontend/src/contexts/LanguageContext.tsx` | Add new i18n keys + update drill-down description text |

---

### Task 1: Backend WO Query Model and Endpoints

**Files:**
- Create: `backend/src/controllers/ems/workOrderController.js`
- Modify: `backend/src/routes/ems.js`
- Modify: `backend/src/helpers/emsQueryHelpers.js`

**Interfaces:**
- Produces: `GET /api/ems/work-orders`, `GET /api/ems/work-orders/kpi`
- Produces list row shape:
  - `{ woNo, woCode, tagNo, description, plant, area, status, schFinishDate, actFinishDate, assigneeName, assigneeId }`

- [ ] **Step 1: Add shared WO status/date SQL helper(s) in `emsQueryHelpers`**
  - Export helpers that build:
    - `schFinishExpr = dateExprFromColumn('wo.SCH_FINISH_D')`
    - `actFinishExpr = dateExprFromColumn('wo.ACT_FINISH_D')`
    - `statusExpr = CASE WHEN act IS NULL THEN 'not_finish' WHEN act <= sch THEN 'ontime' ELSE 'late' END`
  - Keep helper names explicit (example):
    ```js
    function woCompletionStatusExpr(woAlias = 'wo') { ... }
    function woSchFinishDateExpr(woAlias = 'wo') { ... }
    function woActFinishDateExpr(woAlias = 'wo') { ... }
    ```

- [ ] **Step 2: Implement filter parsing and WHERE builder in `workOrderController`**
  - Required filters: `plant`, `area`, `status`, `schFrom`, `schTo`, `q`.
  - Validate `status` to allowed set only.
  - Reuse `applyEmsPlantAreaFilters(request, query, { extAlias: 'ext' })` for plant/area consistency.
  - Include:
    ```sql
    pm.PMCODE LIKE '%-CAL%'
    (wo.FLAGDEL IS NULL OR wo.FLAGDEL <> 'Y')
    EXISTS (SELECT 1 FROM dbo.IgxEQExtension extf WHERE extf.eqno = eq.EQNO)
    schFinishExpr IS NOT NULL
    ```

- [ ] **Step 3: Implement `getWorkOrderList`**
  - Pagination: `page` default 1, `limit` default 50, max 100.
  - Count query + row query with `ROW_NUMBER()` sorted by `schFinishDate DESC, wo.WONO DESC`.
  - Add assignee name via `LEFT JOIN dbo.Person p ON p.PERSONNO = wo.ASSIGN`.
  - Return:
    ```js
    res.json({ success: true, data: { items, pagination }, message: 'EMS work order list' });
    ```

- [ ] **Step 4: Implement `getWorkOrderKpi`**
  - Reuse same WHERE builder and status expression.
  - Return totals for `total`, `ontime`, `late`, `notFinish`.

- [ ] **Step 5: Register routes in `backend/src/routes/ems.js`**
  - Add:
    ```js
    router.get('/work-orders', workOrderController.getWorkOrderList);
    router.get('/work-orders/kpi', workOrderController.getWorkOrderKpi);
    ```

- [ ] **Step 6: Backend sanity check**
  - Run: `npm run validate-api` from `backend`
  - Expected: command exits 0 (or existing unrelated warnings only).

---

### Task 2: Keep Dashboard WO Status Logic Aligned

**Files:**
- Modify: `backend/src/controllers/ems/dashboardController.js`
- Modify: `backend/src/helpers/emsQueryHelpers.js` (if needed from Task 1)

**Interfaces:**
- Consumes: shared WO status/date helper(s)
- Produces: unchanged API contract for `/api/ems/dashboard/wo-period-status`

- [ ] **Step 1: Replace inline status/date SQL assembly in `getWoPeriodStatus`**
  - Use shared helper(s) from `emsQueryHelpers` instead of local duplicated CASE/date expressions.

- [ ] **Step 2: Confirm period bucketing still uses selected year anchor**
  - Keep:
    - `periodExpr = (DATEDIFF(day, @WoPeriodRangeStart, schFinishExpr) / 28) + 1`
    - `BETWEEN 1 AND 13`

- [ ] **Step 3: Smoke-test endpoint behavior**
  - Manual check via app flow after frontend is wired (Task 5); no response shape changes.

---

### Task 3: Frontend Service Types and API Methods

**Files:**
- Modify: `frontend/src/services/emsService.ts`

**Interfaces:**
- Produces:
  - `EmsWorkOrderItem`
  - `EmsWorkOrderKpi`
  - `emsService.getWorkOrderList(...)`
  - `emsService.getWorkOrderKpi(...)`

- [ ] **Step 1: Add TS types**
  - Add:
    ```ts
    export type EmsWorkOrderStatus = 'ontime' | 'late' | 'not_finish';
    export interface EmsWorkOrderItem { ... }
    export interface EmsWorkOrderKpi { total: number; ontime: number; late: number; notFinish: number; }
    ```

- [ ] **Step 2: Add service methods**
  - `getWorkOrderList(params?: { page?; limit?; plant?; area?; status?; schFrom?; schTo?; q?; })`
  - `getWorkOrderKpi(params?: { plant?; area?; status?; schFrom?; schTo?; q?; })`
  - Keep `toQuery` usage and existing error behavior.

- [ ] **Step 3: Type-check by lint**
  - Run: `npm run lint` from `frontend`
  - Expected: no new lint errors introduced by service changes.

---

### Task 4: Work Orders Page UI (filters, KPI, list, cards)

**Files:**
- Create: `frontend/src/pages/ems/WorkOrdersPage.tsx`
- Create: `frontend/src/components/ems/workOrders/WorkOrderFilterBar.tsx`
- Create: `frontend/src/components/ems/workOrders/WorkOrderTable.tsx`
- Create: `frontend/src/components/ems/workOrders/WorkOrderCardList.tsx`
- Create: `frontend/src/components/ems/workOrders/workOrderStatus.tsx`
- Reuse: `frontend/src/components/ems/equipment/EquipmentListPagination.tsx`, `frontend/src/components/ems/shared/EmsKpiStat.tsx`, `frontend/src/components/ems/shared/emsLayoutPrimitives.tsx`

**Interfaces:**
- Consumes: new `emsService` methods/types
- Produces: `/ems/work-orders` page with URL-synced filters

- [ ] **Step 1: Implement filter model + URL sync in page**
  - Query params: `plant`, `area`, `status`, `schFrom`, `schTo`, `q`, `page`.
  - Follow `SchedulePage`/`EquipmentListPage` patterns for parse/apply/page reset.

- [ ] **Step 2: Build `WorkOrderFilterBar`**
  - Controls: plant select, area select, status select, date from/to, search text.
  - Use `emsService.getFilterOptions(plant)` for plant/area options.
  - Use debounced search input (same UX as equipment filter bar).

- [ ] **Step 3: Build KPI strip**
  - Use `EmsKpiGrid columns="3"` or suitable layout for 4 KPI cards.
  - Show Total / Ontime / Late / Not finish.

- [ ] **Step 4: Build desktop table**
  - Columns:
    - Tag (link), Description, Plant, Area, WO code, Status badge, Scheduled finish, Actual finish, Assignee.
  - Use consistent date display helper (same style as existing EMS pages).

- [ ] **Step 5: Build mobile card list**
  - Mirror key fields/status/date and tag link.

- [ ] **Step 6: Load list + KPI concurrently**
  - `Promise.all([getWorkOrderList, getWorkOrderKpi])`
  - Handle loading/empty/error like Schedule page.

---

### Task 5: Navigation, Routing, and Drill-down Wiring

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/ems/EmsLayout.tsx`
- Modify: `frontend/src/components/layout/menuConfig.tsx`
- Modify: `frontend/src/components/ems/dashboard/DashboardWoPeriodChart.tsx`

**Interfaces:**
- Produces:
  - Route: `/ems/work-orders`
  - Chart drill-down query: `plant`, `schFrom`, `schTo`, `status`

- [ ] **Step 1: Add route in `App.tsx`**
  - Import `WorkOrdersPage`.
  - Add `<Route path="work-orders" element={<WorkOrdersPage />} />` inside EMS route group.

- [ ] **Step 2: Add nav item in `EmsLayout.tsx`**
  - Add tab object between schedule and settings:
    - `{ to: '/ems/work-orders', label: t('ems.nav.workOrders'), icon: <...> }`

- [ ] **Step 3: Add sidebar submenu item in `menuConfig.tsx`**
  - EMS children: add id/path for `/ems/work-orders`.

- [ ] **Step 4: Update chart navigation target and status pass-through**
  - Replace `navigateToSchedule` with `navigateToWorkOrders`.
  - Map clicked stack:
    - All mode: `status` from `STATUS_KEYS` bar key
    - Multi-plant mode: infer status from bar’s series key suffix
  - Build params:
    ```ts
    params.set('schFrom', formatLocalDate(startDate));
    params.set('schTo', formatLocalDate(endDate));
    if (status) params.set('status', mappedStatus);
    ```

---

### Task 6: i18n and Copy Updates

**Files:**
- Modify: `frontend/src/contexts/LanguageContext.tsx`

**Interfaces:**
- Produces: new translation keys in both `en` and `th`

- [ ] **Step 1: Add nav + page labels**
  - `ems.nav.workOrders`
  - Work-order page/filter/KPI/table strings (parallel with existing schedule keys)

- [ ] **Step 2: Update dashboard drill-down description**
  - Change:
    - EN from “open the schedule” to “open work orders”
    - TH from “เปิดตารางงาน” to equivalent “เปิดรายการใบงาน”

- [ ] **Step 3: Verify no missing key regressions**
  - Open dashboard + work-orders page and confirm labels resolve.

---

### Task 7: Verification and Regression Check

**Files:**
- Modify (if fixes needed): any files from Tasks 1-6

**Interfaces:**
- Validates end-to-end behavior

- [ ] **Step 1: Run backend validation**
  - Command: `npm run validate-api` in `backend`
  - Expected: exit 0

- [ ] **Step 2: Run frontend lint**
  - Command: `npm run lint` in `frontend`
  - Expected: no newly introduced lint errors

- [ ] **Step 3: Manual drill-down checks**
  - In EMS dashboard year mode, click:
    - one aggregate segment (no plant filter)
    - one plant segment (with plant filter)
  - Confirm `/ems/work-orders` opens with matching `schFrom/schTo/status/(plant)` and list non-empty when chart segment count > 0.

- [ ] **Step 4: Manual Schedule regression checks**
  - Visit `/ems/schedule`; verify list/calendar/events still load and due-date filters still work.

- [ ] **Step 5: Capture final diff review**
  - `git status` + focused diff of modified EMS files before merge/commit.

---

## Self-Review

- **Spec coverage:** Route, nav, filters, KPI, list fields, status logic alignment, and drill-down handoff are mapped to Tasks 1-6.
- **Placeholder scan:** No TBD/TODO placeholders; every task has concrete files and actions.
- **Interface consistency:** `status` values remain `ontime|late|not_finish`; drill-down params use `schFrom/schTo`; list and KPI share same filter model.
