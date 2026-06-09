# Sub-Phase 01 — Foundation & Schema

**Goal:** Establish EMS database tables, document `IgxEQExtension` mapping, and create EMS auth middleware.  
**Est. effort:** 2–3 days  
**Blocks:** All other sub-phases

---

## Prerequisites

- [x] Equipment Excel imported to `dbo.IgxEQExtension` (done by team)
- [ ] Confirm `IgxEQExtension` column schema via MCP / SSMS on target DB

---

## Tasks

### 1.1 Verify `dbo.IgxEQExtension` schema — **DONE**

Verified via `cedar_new` MCP on `CEDAR` database (2026-06-09).

| Metric | Value |
|---|---|
| Total rows | **287** (spec cited 1,228 — confirm remaining import) |
| Rows with `eqno` | 287 (100%) |
| `tag_no` = `EQ.EQCODE` | Yes (verified on sample) |
| EMS role tables | Not created yet |

**Full column mapping:** [IgxEQExtension-Column-Map.md](./IgxEQExtension-Column-Map.md)

Key facts for implementation:
- Join: `IgxEQExtension.eqno = EQ.EQNO`
- Route key: `tag_no` (= `EQCODE`)
- Spec `area` → DB column `location`
- No `is_active` column — filter with `eq.FLAGDEL <> 'Y'`
- Plant prefixes found: DP (228), DJ (21), ST (16), SN (13), PIP (9) — add ST/PIP to plant map

---

### 1.2 Create EMS role tables

Run migration script (adapt from spec §7):

```sql
-- IgxEmsUserRole
CREATE TABLE IgxEmsUserRole (
  id          INT IDENTITY(1,1) PRIMARY KEY,
  person_no   NVARCHAR(50) NOT NULL,
  ems_role    NVARCHAR(30) NOT NULL,  -- 'calibrator' | 'am' | 'plant_manager'
  created_at  DATETIME DEFAULT GETDATE(),
  UNIQUE (person_no, ems_role)
);

-- IgxEmsManagerArea
CREATE TABLE IgxEmsManagerArea (
  id          INT IDENTITY(1,1) PRIMARY KEY,
  person_no   NVARCHAR(50) NOT NULL,
  plant       NVARCHAR(20),
  area        NVARCHAR(100),  -- NULL = all areas in plant
  created_at  DATETIME DEFAULT GETDATE()
);
```

**File:** `backend/script/ems/001-create-ems-tables.sql`

> Do **not** create `IgxEquipment` — use existing `IgxEQExtension`.

---

### 1.3 Seed notification schedule row

Insert into `IgxNotificationSchedule` for EMS cron (Phase 08 will consume):

```sql
INSERT INTO IgxNotificationSchedule (notification_type, schedule_cron, timezone, is_enabled)
VALUES ('ems_calibration', '0 7 * * *', 'Asia/Bangkok', 1);
-- Adjust cron per stakeholder; default daily 07:00
```

---

### 1.4 EMS auth middleware

**File:** `backend/src/middleware/emsAuth.js`

```js
// requireEmsAccess — EMS role OR levelReport >= 2
// requireEmsAdmin   — levelReport === 3 OR ems_role = 'plant_manager'
// getEmsRoles(personNo) — helper to fetch roles from IgxEmsUserRole
```

Attach EMS roles to `req.user.emsRoles` inside middleware (similar pattern to `authenticateToken` enrichment).

**Frontend mirror:** Add `checkEmsPermission()` in `frontend/src/utils/permissionChecker.ts` or fetch roles from auth context.

---

### 1.5 Status calculation service

**File:** `backend/src/services/ems/statusCalculationService.js`

Extract and centralize status logic:

```js
/**
 * @param {Object} wo - { dueDate, status, isClosed }
 * @returns {'OVERDUE'|'DUE SOON'|'OK'|'NO WO'}
 */
function calculateEquipmentStatus(wo) { ... }

function daysOverdue(dueDate) { ... }
function daysUntilDue(dueDate) { ... }
```

Reference: `calibrationController.js` classification + `helps/calibration-classification-guideline.md`.

**Thresholds (per spec):**
- Due This Week: 0–7 days
- Due Soon: 8–30 days
- Overdue: past due, WO not closed

---

### 1.6 Confirm Cedar column names (Open Question #1)

Already resolved in calibration code — document for EMS team:

| Concept | Cedar table | Column (new schema) |
|---|---|---|
| Due date | `PMSched` | `DUEDATE` (8-char YYYYMMDD) |
| WO assignee | `PM` | `ASSIGN` (person ID) |
| WO status | `WO` | `WOSTATUSNO` (9 = history/complete) |
| Equipment | `EQ` | `EQNO`, `EQCODE`, `EQNAME` |
| PM plan | `PM` | `PMNO`, `PMCODE` (contains `-CAL`) |

Uses `dbConfigNew` connection.

---

## Checklist

- [x] `IgxEQExtension` schema documented; **287 rows** verified (see Column Map doc)
- [x] 287-record scope confirmed (remaining Excel rows intentionally excluded)
- [x] `IgxEmsUserRole` table created
- [x] `IgxEmsManagerArea` table created
- [x] `IgxNotificationSchedule` row for `ems_calibration` inserted
- [x] `emsAuth.js` middleware implemented
- [x] `statusCalculationService.js` implemented with test cases for all 4 statuses
- [x] Migration script committed to `backend/script/ems/`

---

## Out of Scope

- Equipment import script (already done → `IgxEQExtension`)
- `IgxEquipment` table creation
- Frontend work
