# EMS — Equipment Management System
## Phase 1 Specification: Registry + Dashboard + Notifications

**Version:** 1.0  
**Date:** 2026-05-13  
**Status:** Draft — pending stakeholder review  
**Target delivery:** 1–2 months from kickoff  
**Platform:** Web (mobile-responsive) — inside EDEN, new rail item

---

## 1. Overview

Phase 1 establishes the foundation: a centralized equipment registry, a status dashboard, and smart notifications. No workflow execution yet (Phase 2). No auto-certification (Phase 3).

**Goal of Phase 1:** Every calibration manager and engineer can open EMS, see every piece of equipment, know its current calibration status, and receive automated alerts before things go overdue.

**What Phase 1 is NOT:**
- No action buttons (Start Calibration, Attach Tag, etc.) — Phase 2
- No calibration data entry or pass/fail — Phase 3
- No Cedar write-back — pending Cedar provider confirmation
- No offline mode — Phase 2

---

## 2. Navigation

New top-level rail item added to EDEN sidebar.

| Property | Value |
|---|---|
| Rail label | **Calibration** |
| Icon | `Gauge` (lucide-react) |
| Base route | `/ems` |
| Permission | Any user with an EMS role OR `levelReport >= 2` |

**Sub-routes:**

| Route | Page | Description |
|---|---|---|
| `/ems` | Redirect → `/ems/dashboard` | |
| `/ems/dashboard` | EMS Dashboard | Status overview — KPI tiles + overdue/due-soon lists |
| `/ems/equipment` | Equipment Registry | Full equipment list with search and filters |
| `/ems/equipment/:tagNo` | Equipment Detail | Single equipment record with full spec data |
| `/ems/schedule` | Calibration Schedule | PM schedule list from Cedar, filterable |
| `/ems/settings/roles` | Role Management | Admin assigns EMS roles to users (L3 or Plant Manager only) |

---

## 3. User Roles (EMS-specific)

EMS roles are separate from the existing EDEN `levelReport` (L1/L2/L3) system. A user can hold both an EDEN role and an EMS role simultaneously — one login, two role sets.

### 3.1 Role Definitions

| EMS Role | Description | Notification Recipient |
|---|---|---|
| **Calibrator** | Performs calibration work. Assigned to WOs in Cedar. | Yes — 30-day pre-due alerts for their assigned WOs |
| **AM** | General maintenance person (non-calibration). Assists or takes over when calibrator is unavailable. | Yes — same as Calibrator |
| **Plant Manager** | Oversight. Receives escalation alerts for severely overdue equipment. | Yes — 2-week-overdue escalation |

> **Note:** "AM" here means a maintenance operator type — not an Area Manager of a physical area.

### 3.2 Role Assignment

- Stored in new table `IgxEmsUserRole` (see Section 7)
- Assigned by admin via `/ems/settings/roles` (accessible to `levelReport = 3` or EMS Plant Manager)
- One user can hold multiple EMS roles (e.g., someone who is both AM and Plant Manager)

### 3.3 Manager Escalation Config

A separate config table `IgxEmsManagerArea` lets customers define which Plant Manager or AM is responsible for which plant/area. This drives escalation notifications.

- Customer manages this themselves via a simple UI in `/ems/settings/roles`
- Format: Person → Plant/Area mapping
- Not required for Phase 1 go-live notifications (WO assignee is primary) — but built in Phase 1 so it's ready

---

## 4. Equipment Registry

### 4.1 Equipment List Page (`/ems/equipment`)

**Layout:** Full-width table with sticky filter bar above.

**Columns:**
| Column | Source |
|---|---|
| Tag No. | `IgxEquipment.tag_no` |
| Description | `IgxEquipment.description` |
| Plant | Extracted from `tag_no` prefix |
| Area | `IgxEquipment.area` |
| Equipment Type | `IgxEquipment.equipment_type` |
| Manufacturer / Model | `IgxEquipment.manufacturer` + `model` |
| Cal. Interval | `IgxEquipment.cal_interval` |
| Status | Calculated: `OVERDUE` / `DUE SOON` / `OK` / `NO WO` |
| Next Due | From Cedar `dbo.PM` |

**Filters (filter bar):**
- Plant (dropdown — extracted from tag prefixes)
- Area (dropdown — filtered by selected plant)
- Equipment Type (dropdown)
- Status (multi-select: Overdue / Due Soon / OK / No WO)
- Text search (debounced 300ms — searches tag_no + description)

**Pagination:** 50 per page, prev/next.

**Mobile:** Collapses to card layout. Shows Tag No., Description, Status badge, Next Due. Tap to go to detail.

### 4.2 Equipment Detail Page (`/ems/equipment/:tagNo`)

Two-column layout on desktop, single column on mobile.

**Section 1 — Identity**
- Tag No., Description, Plant, Area, Equipment Type
- Manufacturer, Model, Serial No.
- Status badge (OVERDUE / DUE SOON / OK / NO WO)
- CCP Code, Cal. Reference WI, Cal. Reference Form

**Section 2 — Calibration Specifications**

| Field | Description |
|---|---|
| Working Range | Min–Max Unit (e.g., 0–10 Bar) |
| Working Range Points | Number of calibration points |
| Calibration Range | Min–Max Unit |
| Calibration Range Points | |
| MPE | Maximum Permissible Error: value + unit + condition |
| Cal. Interval | Human-readable (e.g., "52 Weeks") |

**Section 3 — Current WO Status** (from Cedar `dbo.WO`)
- Active WO No., WO Status, Due Date, Assigned Calibrator (if any)
- "No active work order" if none

**Section 4 — PM History** (from Cedar `dbo.WO`, last 5 completed WOs)
- WO No., Completed Date, Performed By
- "View all" expands the list

---

## 5. Status Dashboard (`/ems/dashboard`)

### 5.1 KPI Tiles (top row)

| Tile | Value | Color |
|---|---|---|
| Total Equipment | Count of all active equipment | Neutral |
| Overdue | Equipment with past-due uncompleted WO | Red |
| Due This Week | Due within 0–7 days | Amber |
| Due Soon | Due within 8–30 days | Yellow |
| OK | All others with active WO | Green |

All tiles respect the Plant/Area filter (persistent filter bar at top of dashboard).

### 5.2 Overdue Panel

Collapsible list of overdue equipment. Columns: Tag No., Description, Area, Days Overdue, Assigned Calibrator, WO No.

Sorted by Days Overdue descending.

### 5.3 Due This Week Panel

Same layout. Shows equipment with WO due within 0–7 days. Sorted by due date ascending.

### 5.4 Due Soon Panel

Equipment with WO due in 8–30 days. Collapsed by default.

### 5.5 Mobile Layout

KPI tiles stack 2×2. Panels collapse to accordions. Overdue panel expands by default.

---

## 6. Calibration Schedule (`/ems/schedule`)

A paginated list of active PM plans from Cedar `dbo.PM`, enriched with equipment details from `IgxEquipment`.

**Columns:** Tag No., Description, Area, WO No., WO Status, Due Date, Days Until/Since Due, Assigned Calibrator

**Filters:** Plant, Area, WO Status, Date range (Due Date from/to)

**Purpose:** Engineers and managers use this to verify what is scheduled, who is assigned, and what is coming up. Read-only in Phase 1.

---

## 7. Database Schema

### New Tables

#### `IgxEquipment`
```sql
CREATE TABLE IgxEquipment (
  id                    INT IDENTITY(1,1) PRIMARY KEY,
  tag_no                NVARCHAR(50) NOT NULL UNIQUE,  -- matches Cedar dbo.EQ
  description           NVARCHAR(255),
  plant                 NVARCHAR(20),   -- extracted from tag_no prefix
  area                  NVARCHAR(100),  -- location field from Excel
  manufacturer          NVARCHAR(100),
  model                 NVARCHAR(100),
  serial_no             NVARCHAR(100),
  equipment_type        NVARCHAR(100),

  -- Working Range
  working_range_min     DECIMAL(18,4),
  working_range_max     DECIMAL(18,4),
  working_range_unit    NVARCHAR(50),
  working_range_points  INT,

  -- Calibration Range
  cal_range_min         DECIMAL(18,4),
  cal_range_max         DECIMAL(18,4),
  cal_range_unit        NVARCHAR(50),
  cal_range_points      INT,

  -- MPE (Maximum Permissible Error)
  mpe_type              NVARCHAR(50),   -- TOLERANCE, PERCENTAGE, etc.
  mpe_value             DECIMAL(18,4),
  mpe_unit              NVARCHAR(50),
  mpe_condition         NVARCHAR(255),

  -- Process References
  ccp_code              NVARCHAR(50),
  cal_ref_wi            NVARCHAR(50),   -- Work Instruction ref
  cal_ref_form          NVARCHAR(50),   -- Form ref
  cal_interval          NVARCHAR(50),   -- e.g. "52 Week"
  cal_interval_weeks    INT,

  -- Metadata
  is_duplicate_tag      BIT DEFAULT 0,
  is_active             BIT DEFAULT 1,
  created_at            DATETIME DEFAULT GETDATE(),
  updated_at            DATETIME DEFAULT GETDATE()
);
```

#### `IgxEmsUserRole`
```sql
CREATE TABLE IgxEmsUserRole (
  id          INT IDENTITY(1,1) PRIMARY KEY,
  person_no   NVARCHAR(50) NOT NULL,    -- FK to IgxPerson
  ems_role    NVARCHAR(30) NOT NULL,    -- 'calibrator' | 'am' | 'plant_manager'
  created_at  DATETIME DEFAULT GETDATE(),
  UNIQUE (person_no, ems_role)
);
```

#### `IgxEmsManagerArea`
```sql
CREATE TABLE IgxEmsManagerArea (
  id          INT IDENTITY(1,1) PRIMARY KEY,
  person_no   NVARCHAR(50) NOT NULL,
  plant       NVARCHAR(20),
  area        NVARCHAR(100),   -- NULL means all areas in this plant
  created_at  DATETIME DEFAULT GETDATE()
);
```

### Cedar Tables (read-only, accessed via existing `dbConfig`)

| Table | Key Fields Used |
|---|---|
| `dbo.EQ` | tag_no (join key to IgxEquipment) |
| `dbo.PM` | tag_no, due_date, wc_no (PM plan for each equipment) |
| `dbo.WO` | wo_no, tag_no, status, due_date, assigned_person (work orders) |

> Cedar table field names are approximate — confirm exact column names from Cedar DB before implementation.

---

## 8. Backend Structure

Following existing EDEN conventions (`src/routes/`, `src/controllers/`, `src/services/`):

```
backend/src/
  routes/
    ems.js                      # All EMS routes
  controllers/
    ems/
      equipmentController.js    # Registry CRUD (read-only Phase 1)
      dashboardController.js    # Status aggregation + KPI counts
      scheduleController.js     # PM schedule list from Cedar
      roleController.js         # EMS role assignment
  services/
    ems/
      equipmentImportService.js # One-time Excel import logic
      statusCalculationService.js # OVERDUE/DUE SOON/OK logic
  jobs/
    emsNotificationJob.js       # Scheduled notification job (Phase 1)
```

**API conventions:** Same as existing EDEN — `{ success, data, message }` response shape. All routes under `/api/ems/`.

---

## 9. Notification System (Phase 1)

Plugs into the existing BullMQ notification pipeline.

### 9.1 Notification Rules

| Trigger | Recipient | Channel |
|---|---|---|
| WO due in exactly 30 days | WO assignee (from Cedar dbo.WO) | LINE push + email |
| WO is overdue (past due date, WO not closed) | WO assignee | LINE push + email |
| WO is 14+ days overdue | Plant Manager(s) for that plant (from IgxEmsManagerArea) | LINE push + email |

### 9.2 Scheduler

New cron job `emsNotificationJob.js` (same pattern as existing 6 notification jobs):
- Reads schedule from `IgxNotificationSchedule` (new row: `notification_type = 'ems_calibration'`)
- On tick: enqueues BullMQ job `schedule-ems-calibration`
- Worker: fetches overdue/due-soon WOs from Cedar, resolves assignees, sends notifications

### 9.3 Notification Content (LINE flex message)

- Equipment Tag No. + Description
- Due Date
- Days until / days overdue
- Deep link: `[LIFF URL]/ems/equipment/:tagNo`

---

## 10. Data Import

One-time import of `ems/resources/equipment_list.xlsx` into `IgxEquipment`.

**Import script:** `backend/src/services/ems/equipmentImportService.js`

**Logic:**
1. Read all rows from Excel
2. Extract `plant` from `tag_no` (prefix before first `-`)
3. Map `is_duplicate_tag` YES/NO → BIT
4. Upsert on `tag_no` (insert new, update existing)
5. Log counts: inserted / updated / skipped (duplicate tag flagged but included)

**Run via:** `node src/services/ems/equipmentImportService.js` (one-time admin script, not an API)

---

## 11. Frontend Structure

```
frontend/src/
  pages/ems/
    EmsLayout.tsx               # Shared layout with EMS sub-nav
    DashboardPage.tsx
    EquipmentListPage.tsx
    EquipmentDetailPage.tsx
    SchedulePage.tsx
    RoleSettingsPage.tsx
  components/ems/
    dashboard/
      KpiTiles.tsx
      OverduePanel.tsx
      DueSoonPanel.tsx
    equipment/
      EquipmentTable.tsx
      EquipmentCard.tsx         # Mobile card view
      EquipmentFilterBar.tsx
      SpecSection.tsx
      WoStatusSection.tsx
    schedule/
      ScheduleTable.tsx
      ScheduleFilterBar.tsx
    roles/
      RoleAssignmentTable.tsx
      ManagerAreaConfig.tsx
  services/
    emsService.ts               # Typed API wrapper for all EMS endpoints
```

---

## 12. Acceptance Criteria

### Equipment Registry
- [ ] All 1,228 records importable via `equipmentImportService.js`
- [ ] Equipment list loads within 2s on mobile (50 records per page)
- [ ] Search by tag_no and description with 300ms debounce
- [ ] Filter by Plant, Area, Equipment Type, Status — filters chain correctly
- [ ] Equipment detail shows all spec fields, current WO status, last 5 WOs
- [ ] Status badge (OVERDUE / DUE SOON / OK / NO WO) is accurate

### Dashboard
- [ ] KPI tiles reflect real Cedar WO data
- [ ] Overdue panel sorted by days overdue descending
- [ ] Plant/Area filter on dashboard updates all panels
- [ ] Dashboard renders correctly on 375px wide mobile screen

### Notifications
- [ ] 30-day pre-due LINE push reaches WO assignee with correct equipment info
- [ ] Overdue alert sends daily until WO is closed
- [ ] 14-day escalation reaches configured Plant Manager
- [ ] Notification includes deep link to equipment detail page
- [ ] Notification schedule configurable via `IgxNotificationSchedule`

### Roles
- [ ] L3 user can assign/remove EMS roles for any user
- [ ] EMS role is visible on user profile
- [ ] Plant Manager can configure their IgxEmsManagerArea entries

---

## 13. Out of Scope for Phase 1

| Feature | Phase |
|---|---|
| Action buttons (Start, Attach Tag, Finish) | Phase 2 |
| Cedar WO write-back | Phase 2 (pending provider confirmation) |
| Offline mode | Phase 2 |
| Calibration data entry (readings, pass/fail) | Phase 3 |
| Auto certificate generation | Phase 3 |
| Tag printing | Phase 3 |
| QR code scanning | Phase 3 |
| Audit export | Phase 2 |
| Equipment edit UI (edit fields after import) | Phase 2 (Phase 1 = import only) |

---

## 14. Open Questions

| # | Question | Owner | Deadline |
|---|---|---|---|
| 1 | Exact Cedar `dbo.WO` column names for assignee and due_date | Dev | Before sprint 1 |
| 2 | Cedar write-back: confirm with Cedar provider what is permitted | PM + Customer | Before Phase 2 kickoff |
| 3 | Plant code mapping: confirm all plant prefixes in tag_no (e.g. DP = ?) | Customer | Before data import |
| 4 | Which LINE channel for EMS notifications — same as EDEN or separate? | PM + Customer | Before notification sprint |
| 5 | AM role: confirm list of people and their plant/area coverage | Customer | Before role sprint |
