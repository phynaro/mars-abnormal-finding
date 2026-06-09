# Sub-Phase 05 — EMS Dashboard

**Goal:** Adapt the existing calibration dashboard (user-approved UI) into `/ems/dashboard` with spec-compliant KPI tiles and panels.  
**Est. effort:** 2–3 days  
**Depends on:** [02](./02-Backend-Scaffold.md), [03](./03-Navigation-Shell.md)

---

## Spec Reference (§5)

### KPI Tiles
| Tile | Window | Color |
|---|---|---|
| Total Equipment | All active | Neutral |
| Overdue | Past-due uncompleted WO | Red |
| Due This Week | 0–7 days | Amber |
| Due Soon | 8–30 days | Yellow |
| OK | Active WO, not in above buckets | Green |

### Panels
- **Overdue** — expanded by default, sorted by days overdue DESC
- **Due This Week** — sorted by due date ASC
- **Due Soon** — collapsed by default, 8–30 days

All respect persistent Plant/Area filter bar.

---

## Reuse Strategy

**Primary source:** `frontend/src/pages/dashboard/DashboardCalibrationV2Page.tsx` (~1,600 lines)

Do **not** port everything. The existing page has tabs (overview, equipment-types, team, calendar, user-events, overdue) that exceed Phase 1 scope.

### Port these pieces

| Source component | EMS target | Keep? |
|---|---|---|
| KPI summary cards / progress bars | `components/ems/dashboard/KpiTiles.tsx` | Adapt to 5 spec tiles |
| `CalibrationOverduePanel.tsx` | `components/ems/dashboard/OverduePanel.tsx` | Yes — update links |
| Due-soon list logic from page | `components/ems/dashboard/DueThisWeekPanel.tsx` | Extract |
| Due-soon list logic | `components/ems/dashboard/DueSoonPanel.tsx` | Extract |
| Plant filter dropdown | Reuse `pmCalibrationPlantMap.ts` | Yes |
| Personnel/assignee filters | Skip for Phase 1 | No |
| Calendar tab | Skip | Phase 2 |
| User events tab | Skip | Phase 2 |
| Team KPI / pie charts | Skip | Phase 2 |

---

## Tasks

### 5.1 KpiTiles component

**File:** `frontend/src/components/ems/dashboard/KpiTiles.tsx`

```tsx
interface KpiData {
  totalEquipment: number;
  overdue: number;
  dueThisWeek: number;
  dueSoon: number;
  ok: number;
}
```

Fetch from `GET /api/ems/dashboard/kpi?plant=&area=`.

Click tile → optional filter equipment list by status (nice-to-have; not required Phase 1).

**Mobile:** 2×2 grid for first 4 tiles, 5th tile full width — or 2+2+1 layout per spec §5.5.

---

### 5.2 Overdue panel

**File:** `frontend/src/components/ems/dashboard/OverduePanel.tsx`

**Copy from:** `CalibrationOverduePanel.tsx`

Columns: Tag No., Description, Area, Days Overdue, Assigned Calibrator, WO No.

- Collapsible (expanded by default)
- Sorted by days overdue descending
- Row link → `/ems/equipment/:tagNo`

API: `GET /api/ems/dashboard/overdue?plant=&area=&page=&limit=`

---

### 5.3 Due This Week panel

**File:** `frontend/src/components/ems/dashboard/DueThisWeekPanel.tsx`

Same column layout as overdue. Sorted by due date ascending.

API: `GET /api/ems/dashboard/due-this-week?plant=&area=`

---

### 5.4 Due Soon panel

**File:** `frontend/src/components/ems/dashboard/DueSoonPanel.tsx`

8–30 day window. **Collapsed by default.**

API: `GET /api/ems/dashboard/due-soon?plant=&area=`

---

### 5.5 Dashboard filter bar

Persistent Plant + Area filter at top of dashboard (same state drives KPI + all panels).

Use URL params or React context (`EmsFilterContext`) so filter persists when switching EMS sub-pages (optional enhancement).

---

### 5.6 Dashboard page

**File:** `frontend/src/pages/ems/DashboardPage.tsx`

Replace placeholder from Phase 03.

```tsx
export default function DashboardPage() {
  const [filters, setFilters] = useState({ plant: '', area: '' });
  // Parallel fetch: kpi, overdue, dueThisWeek, dueSoon
  return (
    <>
      <PageHeader title={t('ems.dashboard.title')} />
      <DashboardFilterBar filters={filters} onChange={setFilters} />
      <KpiTiles data={kpi} loading={loading} />
      <OverduePanel ... />
      <DueThisWeekPanel ... />
      <DueSoonPanel defaultCollapsed />
    </>
  );
}
```

Strip out tabs, charts, calendar, user-events from the V2 page — keep it focused per spec.

---

### 5.7 Backend KPI endpoint

Ensure `dashboardController.getKpi` returns:

```json
{
  "totalEquipment": 1228,
  "overdue": 42,
  "dueThisWeek": 18,
  "dueSoon": 95,
  "ok": 1073
}
```

Counts must respect plant/area filter and use same status logic as equipment list.

**Implementation hint:** Single SQL query with conditional SUM(CASE...) grouped by equipment, or aggregate in JS from statusCalculationService.

---

## Migration from `/dashboard/calibration-v2`

| Step | Action |
|---|---|
| 1 | Copy V2 page → `DashboardPage.tsx`, delete unused tabs |
| 2 | Swap `calibrationService` → `emsService` |
| 3 | Update all paths/links to `/ems/equipment/:tagNo` |
| 4 | QA side-by-side with V2 until counts match |
| 5 | Hide V2 from menuConfig (optional, after sign-off) |

---

## Checklist (spec §12)

- [x] KPI tiles reflect real Cedar WO data
- [x] Overdue panel sorted by days overdue descending
- [x] Plant/Area filter updates all tiles + panels
- [x] Dashboard renders correctly at 375px width (mobile card rows in panels)
- [x] Due Soon panel collapsed by default
- [x] Overdue panel expanded by default

---

## Out of Scope (Phase 1)

- Person period summary stacked bar chart
- Team KPI pie chart
- Calendar view
- User events CRUD
- Equipment type breakdown tab

These remain on `/dashboard/calibration-v2` until Phase 2 consolidation decision.
