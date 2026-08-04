# EMS Calibration Work Orders Page

**Date:** 2026-08-04  
**Status:** Approved design  
**Goal:** Add a fully filterable calibration work-order list so dashboard period-chart drill-down shows the same WOs as the bars, without overloading the Schedule (PM due-date) page.

## Problem

The dashboard **Calibration WO by period** chart counts Cedar `dbo.WO` rows bucketed by `SCH_FINISH_D` and completion status (ontime / late / not_finish). Clicking a bar currently navigates to `/ems/schedule` with `dueFrom` / `dueTo` filters on `PMSched.DUEDATE`. Those are different datasets, so the schedule list can be empty while the chart shows non-zero counts.

Schedule remains the correct place for **planning** (what is due). Chart drill-down needs an **execution / WO history** destination.

## Decision

| Concern | Choice |
|---|---|
| Approach | **A** — dedicated page `/ems/work-orders` |
| Primary date | `WO.SCH_FINISH_D` (scheduled finish) |
| Completion status | Chart model: `ontime` / `late` / `not_finish` |
| Drill-down | Pass plant + period date range + **clicked stack segment status** |
| Schedule page | Unchanged (except chart no longer links to it) |
| Writes | Read-only in this scope |

## Purpose, nav, scope

**Purpose:** Browse calibration work orders for registry equipment; support deep links from the period chart.

**Route & nav**
- Path: `/ems/work-orders`
- Label: Work Orders (en + th)
- Placement: after Schedule in EMS subnav and sidebar Calibration children

**Data scope** (aligned with `GET /api/ems/dashboard/wo-period-status`)
- `dbo.WO` → `dbo.PM` where `PMCODE LIKE '%-CAL%'` → `dbo.EQ` → `dbo.IgxEQExtension`
- Exclude deleted WOs (`FLAGDEL`)
- Require parseable `SCH_FINISH_D`
- Plant derived from equipment tag (same helper as chart)

**Out of scope**
- Creating / editing / closing WOs in EMS
- Changing Schedule query semantics
- Defaulting the list to the current company year on first open (v1: no required date; filters are explicit)

## Filters, list, KPI, drill-down

### Filters (URL query params)

| Filter | Param | Values / notes |
|---|---|---|
| Plant | `plant` | Single plant code (`DP`, …); empty = all |
| Area | `area` | From EMS filter options for selected plant |
| Completion status | `status` | `ontime` \| `late` \| `not_finish` \| empty = all |
| Scheduled finish from | `schFrom` | `YYYY-MM-DD` |
| Scheduled finish to | `schTo` | `YYYY-MM-DD` |
| Search | `q` | Tag no or WO code (contains) |
| Page | `page` | 1-based |
| Page size | `limit` | Default 50, max 100 |

### KPI strip (same filters)

- Total WOs  
- Ontime  
- Late  
- Not finish  

### List columns

Tag No. (link to `/ems/equipment/:tagNo`) · Description · Plant · Area · WO Code · Completion status badge · Scheduled finish · Actual finish · Assignee  

Mobile: card list with the same fields (mirror Schedule pattern).

### Chart drill-down

Navigate to:

```
/ems/work-orders?plant={code}&schFrom={periodStart}&schTo={periodEnd}&status={segment}
```

- `plant` omitted when chart is in “All” aggregate mode without a plant segment  
- `status` set from the clicked stack key (`ontime` / `late` / `not_finish`)  
- Dates from `getPeriodDateRange(year, periodNumber)` via `formatLocalDate`  
- Update chart helper text: open **work orders**, not schedule  

### Status rule (shared with chart)

| Condition | Status |
|---|---|
| `ACT_FINISH_D` is null | `not_finish` |
| `ACT_FINISH_D` ≤ `SCH_FINISH_D` | `ontime` |
| else | `late` |

## API & backend

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/ems/work-orders` | Paginated list |
| `GET` | `/api/ems/work-orders/kpi` | KPI counts for the same filters |

Auth / EMS access: same middleware as other `/api/ems/*` routes.

### List item shape

```ts
{
  woNo: number;
  woCode: string | null;
  tagNo: string;
  description: string | null;
  plant: string;
  area: string | null;
  status: 'ontime' | 'late' | 'not_finish';
  schFinishDate: string | null; // ISO date
  actFinishDate: string | null;
  assigneeName: string | null;
  assigneeId: number | null;
}
```

Response envelope remains `{ success, data, message }` with `data: { items, pagination }` for list and `data: { total, ontime, late, notFinish }` for KPI.

### Implementation notes

- Extract shared WO period-status SQL fragments (joins, date exprs, status CASE, plant expr) so chart aggregate and work-order list cannot drift.
- New controller (e.g. `workOrderController.js`) + route mount under EMS router.
- Frontend: `WorkOrdersPage`, filter bar / table / cards under `components/ems/workOrders/`, `emsService` methods, App route, layout/menu/i18n updates, chart navigation change.

## Acceptance criteria

- [ ] `/ems/work-orders` lists registry CAL WOs filtered by plant, area, status, schFrom/schTo, and q  
- [ ] KPI counts match the filtered list totals  
- [ ] Clicking a chart stack segment opens work orders with plant (when applicable), period dates, and that status; counts on the list match the segment  
- [ ] Schedule page still works for PM due-date planning; chart no longer deep-links to schedule for this drill-down  
- [ ] Read-only; en + th strings present for nav and page chrome  

## Non-goals

- Replacing Schedule or merging the two UIs  
- Cedar WO write-back  
- Filtering by actual finish as the primary date (can be a later enhancement)  
