# Ontime Chart Drill-down — Design

**Date:** 2026-08-13  
**Status:** Approved design  
**Goal:** Click On time / Late segments on the Abnormal Report dashboard Ontime charts to open the ticket list filtered to those same tickets.

## Problem

The Ontime Rate charts (by area and by user) show a single percentage bar. There is no drill-down. The ticket list has **Overdue** (still-open work past due) but no filter for closed tickets that finished on time vs late. Operators cannot inspect which tickets sit behind an ontime rate.

## Decision

| Concern | Choice |
|---|---|
| Chart visual | Stacked horizontal **count** bars: On time (green) + Late (amber). Percentage stays in tooltip / label. |
| Click | Click a stack segment → new tab `/tickets?...` (same pattern as PU case-count chart). |
| Ticket list filter | Single enum query param `timeliness=ontime\|late`. Absent = no timeliness filter. |
| Population | Closed tickets with both `schedule_finish` and `actual_finish_at`. |
| On time | `actual_finish_at <= schedule_finish` (exact-due is on time). |
| Late | `actual_finish_at > schedule_finish`. |
| Date range | Created date (`startDate` / `endDate`), same as the charts. |
| Overdue | Unchanged. Different concept (open work past due). Dashboard click does not set it. |
| User-bar click | Pass new `finished_by=<personNo>` (chart groups by who closed, not assignee). |
| Equipment-bar click | Pass `machine=<display_name>` as URL + chip only (no picker in v1). |

## Chart behavior

Today both charts plot `ontimeRate` only. Change them to two stacked `Bar` series:

- `ontimeFinished` — success green, `cursor: pointer`
- `lateFinished` — warning amber, `cursor: pointer`

`lateFinished = totalFinished - ontimeFinished`. API may keep returning `totalFinished` + `ontimeFinished`; the frontend can derive late, or the API can add `lateFinished`. Prefer adding `lateFinished` on the API so tooltip/legend stay honest.

Tooltip: On time count, Late count, Ontime rate %.

Click a segment with the current dashboard filters:

```
/tickets?timeliness=ontime|late
  &startDate=...
  &endDate=...
  [&plant=...]
  [&area=...]
  [&finished_by=...]   // user chart only
  [&machine=...]       // equipment-level area chart only
```

Open in a new tab via `window.open`, matching KPI tiles and the PU case-count chart.

### Grouping (unchanged)

| Dashboard filter | Chart | Click also sends |
|---|---|---|
| All plants | Ontime Rate by Area, grouped by plant | `plant=<bar display_name>` |
| One plant, all areas | Ontime Rate by Area, grouped by area | `plant=` + `area=<bar display_name>` |
| One plant + one area | Ontime Rate by Area, grouped by equipment | `plant=` + `area=` + `machine=<bar display_name>` |
| Specific area | Ontime Rate by User | `plant=` + `area=` + `finished_by=<user id>` |

## Ticket list filter

### Query params

| Param | Values | Meaning |
|---|---|---|
| `timeliness` | `ontime` \| `late` | Closed + both dates + comparison. Invalid / absent = ignore. |
| `finished_by` | person number (same shape as `created_by` / `assigned_to`) | Who closed the ticket. |
| `machine` | string | Match `IgxPUExtension.machine`, else `line`, same CASE as the chart. |

`timeliness` does **not** also write `status=closed` into the URL. The SQL for `timeliness` already requires `status = 'closed'`. If the user then selects status Open, the list is empty — expected.

### Backend (`GET /api/tickets`)

When `timeliness` is `ontime` or `late`:

```sql
AND t.status = 'closed'
AND t.schedule_finish IS NOT NULL
AND t.actual_finish_at IS NOT NULL
AND t.actual_finish_at <= t.schedule_finish   -- ontime
-- or
AND t.actual_finish_at > t.schedule_finish  -- late
```

When `finished_by` is set: `AND t.finished_by = @finished_by` (support comma-separated like other user filters).

When `machine` is set: same display CASE as `getOntimeRateByArea` equipment grouping:

```sql
AND CASE
  WHEN pe.machine IS NOT NULL THEN pe.machine
  WHEN pe.line IS NOT NULL THEN pe.line
  ELSE 'Unknown Equipment'
END = @machine
```

Use parameterized inputs (`request.input`), not string concatenation.

### Frontend UI

- Filter dialog: select **Completion** — All / On time / Late. Not a toolbar toggle beside Overdue.
- Active chip when `timeliness` is set, with X to clear.
- `finished_by`: same multi-select picker pattern as Created by / Assigned to, plus chip.
- `machine`: URL + chip only for v1. No extra picker.
- EN and TH strings in `LanguageContext.tsx`.
- Include `timeliness`, `finished_by`, and `machine` in URL serialize / parse / clear-all / has-active-filters, and in export (export already copies the active list filters).

## Align chart queries with the list

Today the two chart endpoints disagree, which would make drill-down counts miss:

| Endpoint | Current extra predicates |
|---|---|
| By area | `finished_at IS NOT NULL` (does not require `actual_finish_at`) |
| By user | `actual_finish_at IS NOT NULL` AND `finished_by IS NOT NULL` |

Both charts must use the same population as the ticket list:

- `status = 'closed'`
- `schedule_finish IS NOT NULL`
- `actual_finish_at IS NOT NULL`
- created date in range (`CAST(... AS DATE)` like the ticket list, so day-boundary counts match)

User chart still groups by `finished_by` and requires `finished_by IS NOT NULL` (cannot group otherwise). Closed tickets with no closer appear on the area chart only, not the user chart. Area-chart drill-down does not pass `finished_by`, so those tickets still show in the list. Area chart must **not** use `finished_at` as the completeness check.

Also add `late_finished` to both responses:

```
COUNT(CASE WHEN t.actual_finish_at > t.schedule_finish THEN 1 END)
```

## Data flow

```
Dashboard Ontime chart (stacked counts)
  → click On time | Late segment
  → /tickets?timeliness=&startDate=&endDate=&plant=&area=&finished_by=&machine=
TicketList reads search params
  → GET /api/tickets with same params
  → list matches the clicked stack count
```

Manual use: operator can set Completion in the ticket filter dialog without coming from the dashboard.

## Edge cases

- Tickets without `schedule_finish` or `actual_finish_at` are excluded from charts and from `timeliness`. They still appear in an unfiltered / status=closed list.
- `rejected_final` is not in this population.
- Exact-due (`actual_finish_at = schedule_finish`) is On time (`<=`).
- `timeliness` + `overdue` together is allowed but usually empty (closed vs open). Do not block it.
- Unknown equipment bar (`Unknown Equipment`) drills with `machine=Unknown Equipment` and the same CASE expression.
- Empty chart: no click target; keep the existing empty state.

## Out of scope

- Changing Overdue / Delay behavior
- Calendar heatmap or other Speed charts
- Machine / line picker in the ticket filter dialog
- Changing ontime to `<=` (would change historical rates)
- Closed-by-`finished_at` date filter (charts use created date)

## Success criteria

1. Ontime by Area and Ontime by User show stacked On time + Late counts, with % in tooltip.
2. Click On time on a plant/area/user/equipment bar opens the ticket list whose count matches that segment.
3. Click Late does the same for late tickets.
4. Ticket list filter dialog can set All / On time / Late without the dashboard.
5. Overdue still means open work past due and is unchanged.
6. EN and TH labels exist for the new filter and chips.
