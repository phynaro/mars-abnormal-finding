# MARS Factory — Calibration Workflow Meeting Notes
**Date:** 2026-05-12  
**Topic:** Calibration Workflow Review & System Improvement  

---

## 1. Current Calibration Workflow (11 Steps)

| Step | Name | Key Actions |
|------|------|-------------|
| 01 | Master Plan | Screen summary, report by factory/area/time, create Plant 3D model |
| 02 | M2 Meeting | Upload actual production plan, Key Action, Report Summary |
| 03 | Generate PM Work Order | Get WO list with status, visualize & alert, report + summary email |
| 04 | Perform Calibration | Completed by person with timestamp, report + summary email |
| 05 | Generate Report Calibration | Completed by person, **future: auto full calibration report program**, save to DB & share |
| 06 | Generate Tag Calibration Record to Excel | Generate Excel format for tag printer |
| 07 | Print Tag | Completed by person, can send ticket to operator |
| 08 | Attach Tag | Completed by person (physical attachment) |
| 09 | Update Tag on Web System | Completed by person + attach picture |
| 10 | Close PM Work Order on Cedar System | Get WO status update from Cedar, summary |
| 11 | Go & See for Confirmation | Create tickets for all complete WOs, email AM by area, wait for AM or Automation team to close |

**End State:** TAG CALIBRATION CONFIRMED

**Systems involved:** Cedar (WO management), Excel (data/reports), Email (notifications)

---

## 2. Pain Points Identified

| # | Pain Point |
|---|------------|
| 1 | Tag label and certificate do not match |
| 2 | Manual keying of calibration data into Excel — no central database |
| 3 | Long preparation time for data when audit occurs |
| 4 | Steps 05 and 06 (reporting) are the most time-consuming jobs |
| 5 | Real workflow differs from documented — calibrators must do 04 → 07 → 08 first to release production quickly, then complete reporting (05, 06) later. System does not support this out-of-order execution |
| 6 | To build automated report with pass/fail or scaling, calibration range/spec data must be in DB and bound to each EQ in Cedar — currently this binding does not exist |
| 7 | Equipment details still stored in Excel — Cedar only has Tag No., Model, Serial Number |
| 8 | Tag printing requires manually entering data into Excel — prone to human error |
| 9 | Calibration reports (Excel/PDF) stored on individual computers — no centralized storage |

---

## 3. Proposed Solution — Equipment Management System

### Concept
A centralized equipment registry organized by **Plant → Area**, with full device profiles and workflow action buttons to control calibration activities.

### Equipment Profile (per device)
- Model, Manufacturer, Serial Number
- Location (Plant / Area / Zone)
- Full Specifications (calibration range, pass/fail limits, scaling)
- Calibration History
- Replacement History
- Maintenance History
- Calibration Plan & Schedule
- Calibration Status: **Overdue / OK**
- Equipment Images

### Workflow Action Buttons
| Button | Maps to Step |
|--------|-------------|
| Start Calibration | 04 - Perform Calibration |
| Print Tag | 07 - Print Tag |
| Attach Tag | 08 - Attach Tag |
| Finish Calibration | 05 / 06 - Generate Report |
| Confirm Tag | 11 - Go & See Confirmation |

### Pain Points Addressed
| Pain Point | How |
|------------|-----|
| #1 Tag/cert mismatch | Both generated from same DB record simultaneously |
| #2 Manual Excel | Central DB replaces spreadsheets |
| #3 Audit prep slow | All history centralized — one-click audit export |
| #5 Out-of-order workflow | Flexible button-based workflow supports field-first execution |
| #6 No range/spec data | Specs stored per equipment in DB, bound to EQ |
| #7 Details only in Excel | Full equipment detail now in system |
| #8 Manual tag data entry | Auto-populated from equipment record |
| #9 Reports scattered | Centralized storage and access per equipment |

---

## 4. Key Ideas & Recommendations

### Mobile-First for Calibrators
Calibrators work on the factory floor — the system needs a **mobile/tablet UI**, not just a web portal.

Ideal quick flow:
```
Scan QR on equipment → View specs → Start Calibration →
Enter readings → Auto pass/fail → Print Tag → Attach → Done
(Full report can be completed later, linked to same record)
```
This solves Pain Point #5 — "quick mode" allows tag first, full report later.

### Auto Pass/Fail Engine
With spec ranges in the DB:
- Calculate pass/fail in real time as readings are entered
- Show deviation % per point
- Track trends over time — flag drifting equipment before failure
- Transforms calibration from compliance chore into predictive insight

### Single Source of Truth for Tags
Tag and certificate must be generated **from the same DB record at the same time.**  
One action → one record → one tag → one certificate.  
QR code on tag links directly to digital certificate. Mismatch becomes impossible.

### Cedar Integration Strategy
Cedar stays as the **WO system**. New system acts as the **equipment intelligence layer**.

```
Cedar       → provides: Tag No., WO open/close status
New System  → provides: specs, cal history, reports, tags
```
Two-way sync on WO open and close events. Complement Cedar, do not replace it.

### Audit Mode
One-click audit package per area/plant:
- Full equipment list with current calibration status
- Calibration history with timestamps and person
- Certificates attached
- Overdue list
- Should take seconds, not days.

### Smart Notification & Escalation
```
30 days before due   → notify calibrator
Overdue              → notify Area Manager (AM)
2 weeks overdue      → notify Plant Manager
```

---

## 5. Risks & Concerns

| Risk | Detail |
|------|--------|
| Cedar data quality | Tag No./Model/Serial in Cedar may have errors — migration will surface gaps |
| Spec data collection | Someone must gather all calibration ranges from existing Excel/manuals — significant upfront manual work |
| Calibrator adoption | If mobile UX is poor, users will revert to paper — UX must be dead simple |
| Offline capability | Factory floors often have poor WiFi — offline mode with sync is needed |
| Master data ownership | Equipment record changes need a defined governance/approval process |

---

## 6. Development Roadmap

```
Phase 1 → See everything   (Registry + Dashboard + Notifications)
Phase 2 → Control the job  (Workflow buttons + Upload + Cedar sync)
Phase 3 → Automate it all  (Auto pass/fail + Certificate + Tag print)
```

---

### Phase 1 — Equipment Registry + Visibility
**Goal: Know what you have and what's due**

- Equipment registration with full device detail (model, manufacturer, serial, location, specs)
- Import / sync from Cedar (Tag No., WO plan)
- Plant → Area → Zone hierarchy view
- Calibration status dashboard — **Overdue / OK / Due Soon**
- Smart notifications:
  - 30 days before due → notify calibrator
  - Overdue → notify Area Manager (AM)
  - 2 weeks overdue → notify Plant Manager
- Basic equipment image upload
- **User roles & permissions** — calibrator, AM, plant manager (required for notifications)

**Gaps to resolve before Phase 1:**
- Data migration plan — existing Excel equipment data must be imported first
- Cedar data quality check — Tag No./Model/Serial may have errors

---

### Phase 2 — Workflow Control
**Goal: Control and track the calibration process digitally**

- Action buttons per equipment:
  - **Start Calibration → Finish Calibration → Attach Tag → Verify Tag**
- Each action records timestamp + who performed it
- Calibration job status: `Draft` → `In Progress` → `Pending Verify` → `Completed`
- Support out-of-order execution — quick mode: Start → Attach Tag → finish report later
- **Upload certificate and report** (PDF/Excel) attached to each calibration job
- Photo attachment at Attach Tag step
- Calibration job history per equipment
- Notify AM when job reaches Verify Tag stage
- **Cedar WO write-back** — update WO status in Cedar when job is closed
- **One-click audit export** by area/plant/date (added here — audits can happen anytime)

**Mobile / Offline considerations:**
- Mobile/tablet UI for calibrators on the factory floor
- Offline mode with sync for areas with poor WiFi

---

### Phase 3 — Smart Calibration + Auto Certification
**Goal: Eliminate manual reporting and tag errors**

- Calibrator keys in actual readings per calibration point
- Auto pass/fail calculation and deviation % against stored spec ranges
- Deviation trend tracking per equipment across jobs (predictive insight)
- **Failed calibration handling** — flag → escalate → raise repair WO → re-calibrate path
- Auto-generate calibration certificate (PDF) from entered data — standard form
- Approval workflow: Calibrator submits → AM approves → certificate issued
- Auto tag generation and printing from system
- QR code on tag links directly to digital certificate
- Summary emails to AM auto-generated from system

---

## 7. Identified Gaps (Do Not Overlook)

| Gap | Phase to Address |
|-----|-----------------|
| User roles & permissions | Phase 1 |
| Data migration from Excel to registry | Before Phase 1 |
| Cedar data quality verification | Before Phase 1 |
| Failed calibration flow (flag → repair → re-cal) | Phase 3 |
| Cedar WO write-back when job closes | Phase 2 |
| Offline / poor WiFi support for mobile | Phase 2 |
| Audit export | Phase 2 (not Phase 3) |

---

## 8. Meeting Agenda Items
1. Master Plan create
2. Meeting schedule and plan adjust

---

*Notes compiled: 2026-05-12*  
*Reference image: calibration.png (MARS Calibration Workflow diagram)*
