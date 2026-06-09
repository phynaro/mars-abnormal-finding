# Sub-Phase 02 — Backend Scaffold & Route Migration

**Goal:** Create `/api/ems/*` route module by copying and adapting existing calibration backend.  
**Est. effort:** 2–3 days  
**Depends on:** [01-Foundation-Schema](./01-Foundation-Schema.md)

---

## Strategy

Copy calibration controllers into `controllers/ems/`, wire new route file, mount in `app.js`. Keep original `/api/dashboard/calibration/*` untouched until EMS is validated.

---

## Tasks

### 2.1 Create route file

**File:** `backend/src/routes/ems.js`

```js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireEmsAccess, requireEmsAdmin } = require('../middleware/emsAuth');

const dashboardController = require('../controllers/ems/dashboardController');
const scheduleController = require('../controllers/ems/scheduleController');
const equipmentController = require('../controllers/ems/equipmentController');
const roleController = require('../controllers/ems/roleController');

router.use(authenticateToken);
router.use(requireEmsAccess);

// Dashboard (forked from calibrationController)
router.get('/dashboard/kpi', dashboardController.getKpi);
router.get('/dashboard/overdue', dashboardController.getOverdue);
router.get('/dashboard/due-this-week', dashboardController.getDueThisWeek);
router.get('/dashboard/due-soon', dashboardController.getDueSoon);

// Schedule (forked from pmCalibrationScheduleController)
router.get('/schedule', scheduleController.getScheduleList);
router.get('/schedule/kpi', scheduleController.getScheduleKpi);

// Equipment (net-new)
router.get('/equipment', equipmentController.listEquipment);
router.get('/equipment/filters', equipmentController.getFilterOptions);
router.get('/equipment/:tagNo', equipmentController.getEquipmentDetail);

// Roles (net-new)
router.get('/roles', requireEmsAdmin, roleController.listRoleAssignments);
router.post('/roles', requireEmsAdmin, roleController.assignRole);
router.delete('/roles/:id', requireEmsAdmin, roleController.removeRole);
router.get('/manager-areas', requireEmsAdmin, roleController.listManagerAreas);
router.post('/manager-areas', requireEmsAdmin, roleController.createManagerArea);
router.delete('/manager-areas/:id', requireEmsAdmin, roleController.deleteManagerArea);

module.exports = router;
```

---

### 2.2 Mount in app.js

```js
const emsRoutes = require('./routes/ems');
app.use('/api/ems', emsRoutes);
```

Add after existing route mounts (~line 200 in `app.js`).

---

### 2.3 Fork dashboard controller

**Source:** `backend/src/controllers/calibrationController.js`  
**Target:** `backend/src/controllers/ems/dashboardController.js`

| Source export | EMS export | Notes |
|---|---|---|
| `getOverdue` | `getOverdue` | Add plant/area filter params |
| `getDueSoon` | `getDueSoon` | Split: due-this-week (0–7) vs due-soon (8–30) |
| `getLate` | — | Skip (EMS uses simpler model) |
| `getIncoming` | — | Skip |
| `getPmPlans` | — | Moved to schedule controller |
| — | `getKpi` | **New** — aggregate counts for KPI tiles |
| — | `getDueThisWeek` | **New** — 0–7 day window |

**Changes when copying:**
1. Update file header comment to reference EMS spec
2. Import `statusCalculationService` for KPI aggregation
3. Add optional `plant` and `area` query params to all list endpoints
4. Include `tagNo` (from EQ.EQCODE) in response for frontend deep links
5. Left-join `IgxEQExtension` where equipment enrichment needed

---

### 2.4 Fork schedule controller

**Source:** `backend/src/controllers/pmCalibrationScheduleController.js`  
**Target:** `backend/src/controllers/ems/scheduleController.js`

| Source export | EMS export |
|---|---|
| `getPmScheduleList` | `getScheduleList` |
| `getPmScheduleKpi` | `getScheduleKpi` |
| Others (calendar, team, detail) | Skip for Phase 1 — add in Phase 2 if needed |

**Enhancements:**
- Join `IgxEQExtension` via `ext.eqno = eq.EQNO`; expose `ext.location` as `area`
- Response shape aligned to spec §6 columns: Tag No., Description, Area, WO No., WO Status, Due Date, Days Until/Since Due, Assigned Calibrator
- Filters: plant, area, woStatus, dueDateFrom, dueDateTo

**Reuse shared helper:** Keep importing from `helpers/pmCalibrationScheduleQuery.js` — do not duplicate SQL.

---

### 2.5 Create equipment controller (net-new)

**File:** `backend/src/controllers/ems/equipmentController.js`

#### `GET /api/ems/equipment`

Query params: `page`, `limit` (default 50), `plant`, `area`, `equipmentType`, `status[]`, `search`

```sql
-- Verified join pattern (cedar_new MCP)
FROM dbo.IgxEQExtension ext
INNER JOIN dbo.EQ eq ON eq.EQNO = ext.eqno
  AND (eq.FLAGDEL IS NULL OR eq.FLAGDEL <> 'Y')
LEFT JOIN dbo.PM pm ON pm.EQNO = eq.EQNO AND pm.PMCODE LIKE '%-CAL%' ...
LEFT JOIN dbo.PMSched s ON ...
LEFT JOIN dbo.WO wo ON ...
-- tag_no param: WHERE ext.tag_no = @tagNo  (equals eq.EQCODE)
-- area in API responses: ext.location AS area
-- plant: LEFT(ext.tag_no, CHARINDEX('-', ext.tag_no + '-') - 1)
```

Apply `statusCalculationService.calculateEquipmentStatus()` per row.

Return paginated `{ items, pagination }`.

#### `GET /api/ems/equipment/filters`

Return distinct values for dropdowns: plants, areas (by plant), equipment types, statuses.

#### `GET /api/ems/equipment/:tagNo`

Return 4 sections per spec §4.2:
1. Identity (EQ + extension)
2. Calibration specs (extension fields)
3. Current WO status (active WO from Cedar)
4. PM history (last 5 completed WOs, expandable)

---

### 2.6 Create role controller (net-new)

**File:** `backend/src/controllers/ems/roleController.js`

CRUD for `IgxEmsUserRole` and `IgxEmsManagerArea`.

Join `Person` / `_secUsers` for display names.

Validate `ems_role` enum: `calibrator`, `am`, `plant_manager`.

---

### 2.7 Swagger / OpenAPI

Add EMS paths to swagger config or create `backend/src/swagger/ems.yaml` stub. Run `npm run validate-api` after adding.

---

## API Response Shape

All endpoints return existing EDEN convention:

```json
{ "success": true, "data": { ... }, "message": "..." }
```

---

## Copy Checklist

| File | Action |
|---|---|
| `calibrationController.js` → `ems/dashboardController.js` | Copy + trim + enhance |
| `pmCalibrationScheduleController.js` → `ems/scheduleController.js` | Copy + trim + enrich |
| `pmCalibrationScheduleQuery.js` | **Import** (shared, no copy) |
| `calibrationEqTypeFromEqcode.js` | **Import** (shared) |
| `equipmentController.js` | **Write new** |
| `roleController.js` | **Write new** |
| `routes/ems.js` | **Write new** |

---

## Manual Test Plan

```bash
# With valid JWT token:
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/ems/dashboard/kpi
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3001/api/ems/equipment?page=1&limit=10"
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/ems/equipment/PP-XXXXX
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3001/api/ems/schedule?page=1"
```

---

## Checklist

- [x] `routes/ems.js` created with auth + EMS middleware chain
- [x] Mounted at `/api/ems` in `app.js`
- [x] `dashboardController.js` — KPI, overdue, due-this-week, due-soon
- [x] `scheduleController.js` — schedule list + KPI (registry-scoped)
- [x] `equipmentController.js` — list, filters, detail
- [x] `roleController.js` — role + manager area CRUD
- [x] `emsQueryHelpers.js` shared SQL helpers
- [x] Smoke tested against live DB (287 equipment, KPI + list endpoints)

---

## Verification Results (2026-06-09)

| Endpoint | Result |
|---|---|
| `GET /api/ems/dashboard/kpi` | 287 total equipment |
| `GET /api/ems/equipment?page=1&limit=5` | 287 paginated |
| `GET /api/ems/equipment/filters` | Plants DJ/DP/PIP/SN/ST |
| `GET /api/ems/schedule?page=1&limit=5` | 380 schedule rows (registry-scoped) |

---

## Out of Scope

- Frontend consumption (Phase 03+)
- Notification worker (Phase 08)
- Write/update equipment (Phase 2)
