# Sub-Phase 06 — Calibration Schedule

**Goal:** Read-only PM schedule list at `/ems/schedule`, adapted from existing PM calibration schedule backend + UI patterns.  
**Est. effort:** 2 days  
**Depends on:** [02](./02-Backend-Scaffold.md), [03](./03-Navigation-Shell.md)

---

## Spec Reference (§6)

Paginated list of active PM plans from Cedar `dbo.PM` / `PMSched`, enriched with `IgxEQExtension`.

| Column | Source |
|---|---|
| Tag No. | EQ.EQCODE via PM.EQNO |
| Description | EQ.EQNAME |
| Area | IgxEQExtension |
| WO No. | PMSched.WONo |
| WO Status | WO.WOSTATUSNO |
| Due Date | PMSched.DUEDATE |
| Days Until/Since Due | Calculated |
| Assigned Calibrator | PM.ASSIGN → Person name |

**Filters:** Plant, Area, WO Status, Due Date range (from/to)

---

## Reuse Strategy

### Backend — minimal fork

**Source:** `pmCalibrationScheduleController.getPmScheduleList`  
**Target:** `scheduleController.getScheduleList`

Already implements:
- PMSched + PM join (`PMCODE LIKE '%-CAL%'`)
- Plant prefix filter via `pmCalibrationScheduleQuery.js`
- Assignee, dept, date range filters
- Pagination

**Add for EMS:**
- Join `dbo.EQ` + `IgxEQExtension` for tag, description, area
- Map WO status to human-readable label
- Rename response fields to camelCase matching spec

### Frontend — new table, reuse filter patterns

No dedicated schedule page exists in calibration V2 (schedule is embedded in dashboard tabs). Build fresh using existing table/filter UI primitives.

---

## Tasks

### 6.1 Schedule filter bar

**File:** `frontend/src/components/ems/schedule/ScheduleFilterBar.tsx`

| Filter | Type |
|---|---|
| Plant | Dropdown |
| Area | Dropdown (by plant) |
| WO Status | Dropdown (Pending / In Progress / Done / All) |
| Due Date From | Date picker |
| Due Date To | Date picker |

Map WO status keys from backend `scheduleStatusSummary()`:
- `pending` → Pending
- `in-progress` → In Progress
- `done` → Done

---

### 6.2 Schedule table

**File:** `frontend/src/components/ems/schedule/ScheduleTable.tsx`

Desktop table with all spec columns. Row click → `/ems/equipment/:tagNo` (not PM detail modal — Phase 1 is read-only registry focus).

**Days column formatting:**
- Future: "in X days" (green/neutral)
- Today: "Due today" (amber)
- Past: "X days overdue" (red)

Reuse date formatting from calibration dashboard.

---

### 6.3 Schedule page

**File:** `frontend/src/pages/ems/SchedulePage.tsx`

```tsx
// Fetch: emsService.getScheduleList({ page, limit: 50, ...filters })
// Layout: PageHeader + ScheduleFilterBar + ScheduleTable + Pagination
```

50 per page, prev/next pagination (match equipment list pattern).

---

### 6.4 emsService schedule methods

```ts
async getScheduleList(params: ScheduleListParams): Promise<ScheduleListResponse>
async getScheduleFilterOptions(): Promise<...>  // if separate from list
```

---

### 6.5 Backend adjustments

In `scheduleController.getScheduleList`:

```js
// Additional SELECT columns:
eq.EQCODE AS tagNo,
eq.EQNAME AS description,
ext.area AS area,  -- confirm column
p.FIRSTNAME + ' ' + p.LASTNAME AS assignedCalibrator,
DATEDIFF(day, GETDATE(), dueDateExpr) AS daysUntilDue
```

Ensure date range filter uses same `dateExprFromColumn('s.DUEDATE')` as calibration queries (SQL Server 2008 compatible).

---

## Optional: PM Schedule Detail Modal

The existing `PmScheduleDetailModal.tsx` from calibration V2 could be linked from schedule rows in Phase 2. **Skip for Phase 1** — spec says read-only list only.

---

## Checklist

- [x] Schedule list loads with pagination (50/page)
- [x] All 8 columns populated correctly
- [x] Plant + Area filters work
- [x] WO Status filter works
- [x] Due date range filter works
- [x] Tag links navigate to equipment detail
- [x] Mobile: horizontal scroll or stacked card fallback

---

## API Contract (draft)

```
GET /api/ems/schedule?page=1&limit=50&plant=PP&area=&woStatus=&dueFrom=2026-01-01&dueTo=2026-12-31

Response:
{
  "success": true,
  "data": {
    "items": [{
      "tagNo": "PP-xxx",
      "description": "...",
      "area": "...",
      "woNo": 12345,
      "woStatus": "In Progress",
      "dueDate": "2026-06-15",
      "daysUntilDue": 6,
      "assignedCalibrator": "John Doe"
    }],
    "pagination": { "page": 1, "limit": 50, "total": 200, ... }
  }
}
```
