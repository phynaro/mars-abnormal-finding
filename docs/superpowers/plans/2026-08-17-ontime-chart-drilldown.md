# Ontime Chart Drill-down Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Click On time / Late segments on the Abnormal Report Ontime charts to open the ticket list showing those same tickets, and let operators set the same filter from the ticket list.

**Architecture:** Extract shared SQL fragments for the closed-ticket ontime/late population. Ticket list `GET /api/tickets` gains `timeliness`, `finished_by`, and `machine`. Both ontime chart endpoints return `lateFinished` and use the same population. Dashboard stacked count bars call a pure URL builder and `window.open('/tickets?...')`.

**Tech Stack:** Express, mssql, React, TypeScript, Recharts, existing ticket list URL filters, i18n in `LanguageContext.tsx`.

**Spec:** `docs/superpowers/specs/2026-08-13-ontime-chart-drilldown-design.md`

## Global Constraints

- On time = `actual_finish_at < schedule_finish`. Exact-due is Late (`>=`). Do not change to `<=`.
- Population = `status = 'closed'` AND `schedule_finish IS NOT NULL` AND `actual_finish_at IS NOT NULL`.
- Date range is created date (`startDate` / `endDate`), not `finished_at`.
- Do not change Overdue / Delay behavior.
- Ticket-list SQL must use parameterized `request.input`, not string concatenation of user values.
- Dashboard click must not set `status=closed` or `overdue` in the URL; `timeliness` already implies closed.
- EN and TH strings for every new user-facing label.
- Do not commit unless the user asks.
- Do not add a machine/line picker in the filter dialog (URL + chip only).

## File map

| File | Responsibility |
|---|---|
| `backend/src/helpers/ticketTimelinessQuery.js` | SQL fragments for timeliness, equipment CASE, chart population |
| `backend/test/test_ticket_timeliness_query.js` | Node assert tests for those fragments |
| `backend/src/controllers/ticketController.js` | Apply `timeliness`, `finished_by`, `machine` on list; `finished_by` on filter-users |
| `backend/src/controllers/dashboardController.js` | Align ontime chart queries; return `lateFinished` |
| `frontend/src/utils/ontimeChartDrilldown.ts` | Build `/tickets?...` query from a chart click |
| `frontend/src/services/ticketService.ts` | `TicketFilters` + `getTicketFilterUsers` role |
| `frontend/src/services/dashboardService.ts` | `lateFinished` on ontime data points |
| `frontend/src/contexts/LanguageContext.tsx` | EN/TH copy |
| `frontend/src/components/ticket-management/TicketList.tsx` | Parse/serialize/UI/chips for new filters |
| `frontend/src/pages/dashboard/AbnormalReportDashboardV2Page.tsx` | Stacked count bars + click |

---

### Task 1: Timeliness SQL helper + unit tests

**Files:**
- Create: `backend/src/helpers/ticketTimelinessQuery.js`
- Test: `backend/test/test_ticket_timeliness_query.js`

**Interfaces:**
- Produces:
  - `timelinessSql(timeliness: string | undefined): string`
  - `EQUIPMENT_DISPLAY_SQL: string`
  - `machineFilterSql(): string` (uses `@machine`)
  - `unknownAreaFilterSql(): string`
  - `ontimePopulationSql(): string`
  - `ontimeCountSql(): string`
  - `lateCountSql(): string`

- [ ] **Step 1: Write the failing test**

Create `backend/test/test_ticket_timeliness_query.js`:

```js
/**
 * Run: node backend/test/test_ticket_timeliness_query.js
 */
const assert = require('assert');
const {
  timelinessSql,
  EQUIPMENT_DISPLAY_SQL,
  machineFilterSql,
  unknownAreaFilterSql,
  ontimePopulationSql,
  ontimeCountSql,
  lateCountSql,
} = require('../src/helpers/ticketTimelinessQuery');

function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
  } catch (err) {
    console.error('✗', name, err.message);
    process.exitCode = 1;
  }
}

test('invalid or missing timeliness returns empty', () => {
  assert.strictEqual(timelinessSql(undefined), '');
  assert.strictEqual(timelinessSql(''), '');
  assert.strictEqual(timelinessSql('overdue'), '');
  assert.strictEqual(timelinessSql('ONTIME'), '');
});

test('ontime uses strict less-than and requires closed + both dates', () => {
  const sql = timelinessSql('ontime');
  assert.match(sql, /t\.status = 'closed'/);
  assert.match(sql, /t\.schedule_finish IS NOT NULL/);
  assert.match(sql, /t\.actual_finish_at IS NOT NULL/);
  assert.match(sql, /t\.actual_finish_at < t\.schedule_finish/);
  assert.doesNotMatch(sql, /finished_at IS NOT NULL/);
});

test('late uses greater-or-equal', () => {
  const sql = timelinessSql('late');
  assert.match(sql, /t\.actual_finish_at >= t\.schedule_finish/);
  assert.doesNotMatch(sql, /t\.actual_finish_at </);
});

test('equipment CASE prefers machine then line', () => {
  assert.match(EQUIPMENT_DISPLAY_SQL, /pe\.machine IS NOT NULL THEN pe\.machine/);
  assert.match(EQUIPMENT_DISPLAY_SQL, /pe\.line IS NOT NULL THEN pe\.line/);
  assert.match(EQUIPMENT_DISPLAY_SQL, /Unknown Equipment/);
});

test('machine filter binds @machine to the CASE', () => {
  assert.strictEqual(
    machineFilterSql(),
    ` AND ${EQUIPMENT_DISPLAY_SQL} = @machine`
  );
});

test('unknown area is NULL area, not the literal string', () => {
  assert.strictEqual(unknownAreaFilterSql(), ' AND pe.area IS NULL');
});

test('chart population matches ticket-list timeliness population', () => {
  const pop = ontimePopulationSql();
  assert.match(pop, /t\.status = 'closed'/);
  assert.match(pop, /t\.schedule_finish IS NOT NULL/);
  assert.match(pop, /t\.actual_finish_at IS NOT NULL/);
  assert.doesNotMatch(pop, /finished_at IS NOT NULL/);
});

test('count expressions split ontime vs late', () => {
  assert.strictEqual(
    ontimeCountSql(),
    'COUNT(CASE WHEN t.actual_finish_at < t.schedule_finish THEN 1 END)'
  );
  assert.strictEqual(
    lateCountSql(),
    'COUNT(CASE WHEN t.actual_finish_at >= t.schedule_finish THEN 1 END)'
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node backend/test/test_ticket_timeliness_query.js`

Expected: FAIL with `Cannot find module '../src/helpers/ticketTimelinessQuery'`

- [ ] **Step 3: Write the helper**

Create `backend/src/helpers/ticketTimelinessQuery.js`:

```js
const EQUIPMENT_DISPLAY_SQL = `CASE
          WHEN pe.machine IS NOT NULL THEN pe.machine
          WHEN pe.line IS NOT NULL THEN pe.line
          ELSE 'Unknown Equipment'
        END`;

function timelinessSql(timeliness) {
  if (timeliness !== 'ontime' && timeliness !== 'late') {
    return '';
  }
  const cmp = timeliness === 'ontime' ? '<' : '>=';
  return ` AND t.status = 'closed'
      AND t.schedule_finish IS NOT NULL
      AND t.actual_finish_at IS NOT NULL
      AND t.actual_finish_at ${cmp} t.schedule_finish`;
}

function machineFilterSql() {
  return ` AND ${EQUIPMENT_DISPLAY_SQL} = @machine`;
}

function unknownAreaFilterSql() {
  return ' AND pe.area IS NULL';
}

function ontimePopulationSql() {
  return `t.status = 'closed'
          AND t.schedule_finish IS NOT NULL
          AND t.actual_finish_at IS NOT NULL`;
}

function ontimeCountSql() {
  return 'COUNT(CASE WHEN t.actual_finish_at < t.schedule_finish THEN 1 END)';
}

function lateCountSql() {
  return 'COUNT(CASE WHEN t.actual_finish_at >= t.schedule_finish THEN 1 END)';
}

module.exports = {
  EQUIPMENT_DISPLAY_SQL,
  timelinessSql,
  machineFilterSql,
  unknownAreaFilterSql,
  ontimePopulationSql,
  ontimeCountSql,
  lateCountSql,
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node backend/test/test_ticket_timeliness_query.js`

Expected: all lines `✓` and exit code 0

---

### Task 2: Ticket list API — `timeliness`, `finished_by`, `machine`

**Files:**
- Modify: `backend/src/controllers/ticketController.js` (`getTickets` around the query destructure at line 517 and the overdue block at 607; `TICKET_USER_FILTER_COLUMNS` at 4714)

**Interfaces:**
- Consumes: `timelinessSql`, `machineFilterSql`, `unknownAreaFilterSql` from Task 1
- Produces: `GET /api/tickets` accepts `timeliness=ontime|late`, `finished_by` (comma-separated person nos, same as `created_by`), `machine` (string). Invalid `timeliness` is ignored. `area=Unknown Area` uses `pe.area IS NULL`.

- [ ] **Step 1: Require the helper at the top of `ticketController.js`**

Add with the other requires:

```js
const {
  timelinessSql,
  machineFilterSql,
  unknownAreaFilterSql,
} = require("../helpers/ticketTimelinessQuery");
```

- [ ] **Step 2: Destructure the new query params in `getTickets`**

In the `const { page = 1, ... } = req.query;` block (around line 519), add:

```js
      finished_by,
      timeliness,
      machine,
```

- [ ] **Step 3: Append filters after the overdue block (after line 609)**

Copy the `created_by` IN-list pattern for `finished_by`. Apply timeliness SQL. Bind `@machine` only when `machine` is non-empty. Treat `area === 'Unknown Area'` before the existing `pe.area` filter so the equipment/area chart bar matches.

Insert after the overdue block:

```js
    if (finished_by) {
      if (String(finished_by).includes(',')) {
        const finishedByList = String(finished_by)
          .split(',')
          .map((value) => parseInt(value.trim(), 10))
          .filter((value) => !isNaN(value));
        if (finishedByList.length > 0) {
          const finishedByPlaceholders = finishedByList.map((_, index) => `@finished_by${index}`).join(',');
          whereClause += ` AND t.finished_by IN (${finishedByPlaceholders})`;
          finishedByList.forEach((finishedByValue, index) => {
            params.push({ name: `finished_by${index}`, value: finishedByValue, type: sql.Int });
          });
        }
      } else {
        const finishedByValue = parseInt(finished_by, 10);
        if (!isNaN(finishedByValue)) {
          whereClause += " AND t.finished_by = @finished_by";
          params.push({ name: "finished_by", value: finishedByValue, type: sql.Int });
        }
      }
    }

    whereClause += timelinessSql(timeliness);

    if (machine) {
      whereClause += machineFilterSql();
      params.push({ name: "machine", value: String(machine), type: sql.NVarChar(255) });
    }
```

Then change the existing `if (area)` block so Unknown Area uses NULL:

```js
    if (area) {
      if (area === 'Unknown Area') {
        whereClause += unknownAreaFilterSql();
      } else if (area.includes(',')) {
        const areaList = area.split(',').map(a => a.trim()).filter(Boolean);
        if (areaList.length > 0) {
          const areaPlaceholders = areaList.map((_, index) => `@area${index}`).join(',');
          whereClause += ` AND pe.area IN (${areaPlaceholders})`;
          areaList.forEach((areaValue, index) => {
            params.push({ name: `area${index}`, value: areaValue, type: sql.VarChar(50) });
          });
        }
      } else {
        whereClause += " AND pe.area = @area";
        params.push({ name: "area", value: area, type: sql.VarChar(50) });
      }
    }
```

Leave the existing `if (area)` block in place only if you replace it with the version above — do not duplicate it.

- [ ] **Step 4: Allow `finished_by` on filter-users**

Change:

```js
const TICKET_USER_FILTER_COLUMNS = {
  created_by: "created_by",
  assigned_to: "assigned_to",
};
```

to:

```js
const TICKET_USER_FILTER_COLUMNS = {
  created_by: "created_by",
  assigned_to: "assigned_to",
  finished_by: "finished_by",
};
```

- [ ] **Step 5: Re-run helper tests (no regression)**

Run: `node backend/test/test_ticket_timeliness_query.js`

Expected: all `✓`

---

### Task 3: Align ontime chart APIs and return `lateFinished`

**Files:**
- Modify: `backend/src/controllers/dashboardController.js` (`getOntimeRateByArea` ~2619, `getOntimeRateByUser` ~2793)

**Interfaces:**
- Consumes: `ontimePopulationSql`, `ontimeCountSql`, `lateCountSql`, `EQUIPMENT_DISPLAY_SQL` from Task 1
- Produces: each data point `{ ..., ontimeFinished, lateFinished, totalFinished, ontimeRate }` where `lateFinished` is the late count from SQL (not inferred only on the client)

- [ ] **Step 1: Require the helper at the top of `dashboardController.js`**

```js
const {
  EQUIPMENT_DISPLAY_SQL,
  ontimePopulationSql,
  ontimeCountSql,
  lateCountSql,
} = require('../helpers/ticketTimelinessQuery');
```

- [ ] **Step 2: Replace the three `getOntimeRateByArea` query bodies**

Shared WHERE (all three grouping branches). Use `CAST` so day boundaries match the ticket list. Drop `finished_at IS NOT NULL` and `pe.plant IS NOT NULL` is kept only on the all-plants branch.

Plant branch SELECT/WHERE/GROUP:

```js
      ontimeRateQuery = `
        SELECT 
          pe.plant as display_name,
          COUNT(t.id) as total_finished,
          ${ontimeCountSql()} as ontime_finished,
          ${lateCountSql()} as late_finished,
          CASE 
            WHEN COUNT(t.id) > 0 THEN 
              ROUND((${ontimeCountSql()} * 100.0) / COUNT(t.id), 2)
            ELSE 0 
          END as ontime_rate_percentage
        FROM IgxTickets t
        LEFT JOIN IgxPUExtension pe ON t.puno = pe.puno
        WHERE CAST(t.created_at AS DATE) >= '${startDate}' 
          AND CAST(t.created_at AS DATE) <= '${endDate}' 
          AND ${ontimePopulationSql()}
          AND pe.plant IS NOT NULL
        GROUP BY pe.plant
        HAVING COUNT(t.id) > 0
        ORDER BY ontime_rate_percentage DESC
      `;
```

Area branch: same SELECT counts, `display_name` stays the `CASE WHEN pe.area IS NULL THEN 'Unknown Area' ELSE pe.area END`, filter `AND pe.plant = '${plant}'`, `GROUP BY pe.area`.

Equipment branch: `display_name` = `${EQUIPMENT_DISPLAY_SQL}`, filter plant + area, `GROUP BY ${EQUIPMENT_DISPLAY_SQL}`.

- [ ] **Step 3: Map `lateFinished` in the area response**

```js
    const ontimeRateByAreaData = result.recordset.map(row => ({
      display_name: row.display_name,
      ontimeRate: row.ontime_rate_percentage,
      totalFinished: row.total_finished,
      ontimeFinished: row.ontime_finished,
      lateFinished: row.late_finished
    }));
```

- [ ] **Step 4: Align `getOntimeRateByUser`**

Replace `whereClause` with:

```js
    let whereClause = `WHERE CAST(t.created_at AS DATE) >= '${startDate}' 
        AND CAST(t.created_at AS DATE) <= '${endDate}' 
        AND ${ontimePopulationSql()}
        AND t.finished_by IS NOT NULL`;
```

Keep plant/area appends. In the SELECT, add `${lateCountSql()} as late_finished` next to `ontime_finished`, and keep grouping by `finished_by`.

Map:

```js
        lateFinished: row.late_finished
```

on each user data point (alongside existing `ontimeFinished` / `totalFinished` / `ontimeRate`).

- [ ] **Step 5: Confirm summary still uses ontime / total**

Leave `overallOntimeRate` as ontimeFinished / totalFinished. Optionally add `totalLateFinished` to summary; not required by the spec.

---

### Task 4: Frontend types + i18n

**Files:**
- Modify: `frontend/src/services/ticketService.ts` (`TicketFilters` ~194, `getTicketFilterUsers` ~464)
- Modify: `frontend/src/services/dashboardService.ts` (`OntimeRateByAreaDataPoint` ~403, `OntimeRateByUserDataPoint` ~430)
- Modify: `frontend/src/contexts/LanguageContext.tsx` (EN `ticket.*` near `'ticket.overdue'`, `'dashboard.ontimeFinished'`; matching TH blocks)

**Interfaces:**
- Produces: `TicketFilters.timeliness?: 'ontime' | 'late'`, `finished_by?: number | string`, `machine?: string`
- Produces: `getTicketFilterUsers(role: 'created_by' | 'assigned_to' | 'finished_by')`
- Produces: `lateFinished: number` on both ontime data point types
- Produces: i18n keys listed below

- [ ] **Step 1: Extend `TicketFilters`**

```ts
  finished_by?: number | string;
  timeliness?: 'ontime' | 'late';
  machine?: string;
```

- [ ] **Step 2: Widen `getTicketFilterUsers`**

```ts
  async getTicketFilterUsers(role: 'created_by' | 'assigned_to' | 'finished_by'): Promise<{ success: boolean; data: TicketFilterUser[] }> {
```

- [ ] **Step 3: Add `lateFinished: number` to both ontime data point interfaces**

- [ ] **Step 4: Add EN keys**

Next to `'ticket.overdue'`:

```ts
    'ticket.completion': 'Completion',
    'ticket.ontime': 'On time',
    'ticket.late': 'Late',
    'ticket.allCompletion': 'All',
    'ticket.finishedBy': 'Closed by',
    'ticket.machine': 'Equipment',
```

Next to `'dashboard.ontimeFinished'`:

```ts
    'dashboard.lateFinished': 'Late',
```

TH (next to `'ticket.overdue'` / `'dashboard.ontimeFinished'`):

```ts
    'ticket.completion': 'การปิดงานตรงเวลา',
    'ticket.ontime': 'ตรงเวลา',
    'ticket.late': 'ล่าช้า',
    'ticket.allCompletion': 'ทั้งหมด',
    'ticket.finishedBy': 'ปิดโดย',
    'ticket.machine': 'เครื่องจักร',
    'dashboard.lateFinished': 'ล่าช้า',
```

---

### Task 5: Ticket list — URL, dialog, chips

**Files:**
- Modify: `frontend/src/components/ticket-management/TicketList.tsx`

**Interfaces:**
- Consumes: `TicketFilters.timeliness`, `finished_by`, `machine` from Task 4; `getTicketFilterUsers('finished_by')`
- Produces: `/tickets?timeliness=ontime|late&finished_by=&machine=` round-trips through parse, serialize, chips, clear-all, export (export clones `filters`, so new fields ride along)

- [ ] **Step 1: Parse new URL params in `initializeFiltersFromURL`**

```ts
      finished_by: (searchParams.get('finished_by') || undefined) as TicketFilters["finished_by"],
      timeliness: (searchParams.get('timeliness') === 'ontime' || searchParams.get('timeliness') === 'late'
        ? searchParams.get('timeliness')
        : undefined) as TicketFilters["timeliness"],
      machine: searchParams.get('machine') || undefined,
```

`syncFiltersToURL` already writes every defined `TicketFilters` entry via `Object.entries` — no special-case needed (unlike boolean `overdue`).

- [ ] **Step 2: Load closed-by users**

Add state `finishedByUsers` next to `assignedToUsers`. In `fetchTicketFilterUsers`, fetch three roles:

```ts
      const [createdByResponse, assignedToResponse, finishedByResponse] = await Promise.all([
        ticketService.getTicketFilterUsers("created_by"),
        ticketService.getTicketFilterUsers("assigned_to"),
        ticketService.getTicketFilterUsers("finished_by"),
      ]);
      setCreatedByUsers(createdByResponse.data || []);
      setAssignedToUsers(assignedToResponse.data || []);
      setFinishedByUsers(finishedByResponse.data || []);
```

Include `finishedByUsers` in `getUserFilterLabel` lookup: `[...createdByUsers, ...assignedToUsers, ...finishedByUsers]`.

Add `selectedFinishedByUsers = parseUserFilter(filters.finished_by)`.

Extend `getUserFilterSummary` with type `"finished_by"`:

- empty → `t("ticket.allUsers")`
- TH many → `${n} ผู้ปิดที่เลือก`
- EN many → `${n} closers selected`

- [ ] **Step 3: Filter dialog — Completion select + Closed by picker**

Place **Completion** in the dialog near Overdue (not on the toolbar). Use shadcn `Select`:

```tsx
                  <div className="space-y-2">
                    <Label htmlFor="timeliness">{t('ticket.completion')}</Label>
                    <Select
                      value={filters.timeliness || 'all'}
                      onValueChange={(v) =>
                        handleFilterChange(
                          'timeliness',
                          v === 'all' ? undefined : (v as TicketFilters['timeliness'])
                        )
                      }
                    >
                      <SelectTrigger id="timeliness">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('ticket.allCompletion')}</SelectItem>
                        <SelectItem value="ontime">{t('ticket.ontime')}</SelectItem>
                        <SelectItem value="late">{t('ticket.late')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
```

Place **Closed by** after Assigned To, same `SearchableMultiSelectUserFilter` as Created By, wired to `finished_by` / `finishedByUsers` / `selectedFinishedByUsers`.

Do not add a machine picker.

- [ ] **Step 4: Chips + clear-all + hasActiveFilters**

Chips (next to overdue chip):

```tsx
          {filters.timeliness && (
            <Badge variant="secondary" className="gap-1">
              {t('ticket.completion')}: {filters.timeliness === 'ontime' ? t('ticket.ontime') : t('ticket.late')}
              <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => clearFilter("timeliness")} />
            </Badge>
          )}
          {filters.finished_by && (
            <Badge variant="secondary" className="gap-1">
              {t('ticket.finishedBy')}: {getUserFilterSummary(selectedFinishedByUsers, "finished_by")}
              <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => clearFilter("finished_by")} />
            </Badge>
          )}
          {filters.machine && (
            <Badge variant="secondary" className="gap-1">
              {t('ticket.machine')}: {filters.machine}
              <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => clearFilter("machine")} />
            </Badge>
          )}
```

In `clearAllFilters`, set `finished_by: undefined`, `timeliness: undefined`, `machine: undefined`.

In `hasActiveFilters`, OR in `filters.finished_by`, `filters.timeliness`, `filters.machine`.

- [ ] **Step 5: Export dialog Completion select**

`openExportDialog` already clones `{ ...filters }`, so `timeliness` / `finished_by` / `machine` are sent to `GET /api/tickets` on export. Add a Completion `Select` in the export dialog (same values as Step 3) bound to `handleExportFilterChange("timeliness", ...)`. Optional Closed-by control is not required; cloned `finished_by` is enough.

---

### Task 6: Stacked ontime charts + drill-down URL

**Files:**
- Create: `frontend/src/utils/ontimeChartDrilldown.ts`
- Modify: `frontend/src/pages/dashboard/AbnormalReportDashboardV2Page.tsx` (ontime charts ~3187–3317)

**Interfaces:**
- Consumes: `lateFinished` from Task 3/4; `getDateRangeForFilter`
- Produces: `buildOntimeTicketListSearch(args: OntimeDrilldownArgs): string` used by both charts

- [ ] **Step 1: URL builder**

Create `frontend/src/utils/ontimeChartDrilldown.ts`:

```ts
export type Timeliness = 'ontime' | 'late';

export interface OntimeDrilldownArgs {
  timeliness: Timeliness;
  startDate: string;
  endDate: string;
  plant?: string;
  area?: string;
  finished_by?: string;
  machine?: string;
}

export function buildOntimeTicketListSearch(args: OntimeDrilldownArgs): string {
  const params = new URLSearchParams();
  params.set('timeliness', args.timeliness);
  params.set('startDate', args.startDate);
  params.set('endDate', args.endDate);
  if (args.plant && args.plant !== 'all') params.set('plant', args.plant);
  if (args.area && args.area !== 'all') params.set('area', args.area);
  if (args.finished_by) params.set('finished_by', args.finished_by);
  if (args.machine) params.set('machine', args.machine);
  return params.toString();
}

export function openOntimeTicketList(args: OntimeDrilldownArgs): void {
  window.open(`/tickets?${buildOntimeTicketListSearch(args)}`, '_blank');
}
```

- [ ] **Step 2: Derive late on the area/user chart memos if API omitted it (defensive)**

In `AbnormalReportDashboardV2Page.tsx`:

```ts
  const ontimeRateByAreaChartData = useMemo(() => {
    return ontimeRateByAreaData.map((item) => ({
      ...item,
      lateFinished: item.lateFinished ?? Math.max(0, item.totalFinished - item.ontimeFinished),
    }));
  }, [ontimeRateByAreaData]);
```

Same for user chart (keep existing `getAvatarUrl` mapping).

- [ ] **Step 3: Shared click handler inside the page component**

```ts
  const openOntimeDrilldown = (
    timeliness: 'ontime' | 'late',
    extra: { plant?: string; area?: string; finished_by?: string; machine?: string }
  ) => {
    const dateRange = getDateRangeForFilter(timeFilter, selectedYear, selectedPeriod, selectedPeriods);
    openOntimeTicketList({
      timeliness,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      plant: extra.plant ?? (plantFilter !== 'all' ? plantFilter : undefined),
      area: extra.area ?? (areaFilter !== 'all' ? areaFilter : undefined),
      finished_by: extra.finished_by,
      machine: extra.machine,
    });
  };
```

Grouping extras when a bar is clicked:

| Chart | Dashboard filters | Extra args |
|---|---|---|
| Area, all plants | `plantFilter === 'all'` | `{ plant: payload.display_name }` |
| Area, one plant | plant set, `areaFilter === 'all'` | `{ plant: plantFilter, area: payload.display_name }` |
| Area, one area | plant + area set | `{ plant: plantFilter, area: areaFilter, machine: payload.display_name }` |
| User | area set | `{ plant: plantFilter, area: areaFilter, finished_by: payload.id }` |

- [ ] **Step 4: Replace the single % `Bar` with stacked counts**

For both Ontime charts:

- Change `XAxis`: remove `domain={[0, 100]}` and `%` `tickFormatter`. Use `allowDecimals={false}` and label `t('dashboard.tickets')` (counts, not percent).
- Tooltip formatter:
  - `ontimeFinished` → `[value, t('dashboard.ontimeFinished')]`
  - `lateFinished` → `[value, t('dashboard.lateFinished')]`
  - `ontimeRate` if still present → `[${value}%, t('dashboard.ontimeRate')]`
- Two `Bar`s, `stackId="timeliness"`, `cursor="pointer"`:

```tsx
                      <Bar
                        dataKey="ontimeFinished"
                        stackId="timeliness"
                        fill="hsl(var(--success))"
                        name={t('dashboard.ontimeFinished')}
                        cursor="pointer"
                        onClick={(data) => {
                          const payload = data?.payload;
                          if (!payload) return;
                          openOntimeDrilldown('ontime', /* extras from table above using payload */);
                        }}
                      />
                      <Bar
                        dataKey="lateFinished"
                        stackId="timeliness"
                        fill="hsl(var(--warning))"
                        name={t('dashboard.lateFinished')}
                        cursor="pointer"
                        onClick={(data) => {
                          const payload = data?.payload;
                          if (!payload) return;
                          openOntimeDrilldown('late', /* extras from table above using payload */);
                        }}
                      />
```

For the area chart, compute extras from `plantFilter` / `areaFilter` / `payload.display_name` as in the table. For the user chart, use `payload.id`.

Keep empty states unchanged. Keep `window.open` in a new tab (do not `navigate` in-app).

User-chart `LabelList` avatars: keep on the late bar (rightmost / end of stack) or move to `YAxis` — prefer keeping `LabelList` on the last stacked `Bar` (`lateFinished`) so avatars still sit at the bar end. Increase right margin if counts overflow.

- [ ] **Step 5: Lint the touched frontend files**

Run from `frontend/`: `npx eslint src/utils/ontimeChartDrilldown.ts src/pages/dashboard/AbnormalReportDashboardV2Page.tsx src/components/ticket-management/TicketList.tsx src/services/ticketService.ts src/services/dashboardService.ts`

Expected: no new errors.

---

### Task 7: Manual verification

- [ ] **Step 1: Helper tests still pass**

Run: `node backend/test/test_ticket_timeliness_query.js`

Expected: all `✓`

- [ ] **Step 2: Dashboard click vs list count**

On Abnormal Report Dashboard V2, this period, all plants:

1. Ontime by Area shows stacked green/amber counts, not a 0–100% bar.
2. Tooltip shows On time count, Late count, and rate %.
3. Click green on a plant bar → `/tickets?timeliness=ontime&startDate=&endDate=&plant=<name>` in a new tab. List total equals the green number.
4. Click amber → `timeliness=late`, count matches.
5. Select one plant + one area: user chart click adds `finished_by=<id>`.
6. Equipment bars add `machine=<display_name>`. `Unknown Equipment` works.

- [ ] **Step 3: Ticket list without dashboard**

Open `/tickets`, Filter → Completion → On time. Chip appears. Clear chip returns to all tickets. Overdue toggle still filters open work past due.

- [ ] **Step 4: Export**

With `timeliness=late` in the URL, Export downloads only late closed tickets (cloned filters).

---

## Spec coverage

| Spec requirement | Task |
|---|---|
| Stacked On time / Late count bars, % in tooltip | 6 |
| Click segment → `/tickets?timeliness=...` new tab | 6 |
| `timeliness` SQL population + comparison | 1, 2 |
| `finished_by` filter | 2, 4, 5 |
| `machine` URL + chip, same CASE | 1, 2, 5, 6 |
| Created-date range | 3, 6 |
| Align charts to `actual_finish_at`, add `lateFinished` | 3 |
| Completion select in dialog, not beside Overdue | 5 |
| EN/TH | 4 |
| Overdue unchanged | (not touched) |
| Unknown Area bar matches list | 1, 2 (`pe.area IS NULL`) |
| No `status=closed` on dashboard URL | 6 |

## Placeholder / consistency check

- Names: `timeliness`, `lateFinished`, `finished_by`, `machine`, `buildOntimeTicketListSearch`, `openOntimeTicketList` — used the same way in every task.
- No TBD. Commit steps omitted on purpose (Global Constraints).
