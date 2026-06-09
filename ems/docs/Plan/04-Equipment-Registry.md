# Sub-Phase 04 — Equipment Registry

**Goal:** Build equipment list and detail pages — the core net-new EMS UI. Data from `dbo.IgxEQExtension` + Cedar `EQ`/`WO`/`PM`.  
**Est. effort:** 4–5 days  
**Depends on:** [01](./01-Foundation-Schema.md), [02](./02-Backend-Scaffold.md), [03](./03-Navigation-Shell.md)

---

## Spec Reference (§4)

### List page (`/ems/equipment`)
- Full-width table, sticky filter bar
- 50 per page pagination
- Mobile: card layout

### Detail page (`/ems/equipment/:tagNo`)
- 4 sections: Identity, Calibration Specs, Current WO, PM History

---

## Tasks

### 4.1 Equipment filter bar component

**File:** `frontend/src/components/ems/equipment/EquipmentFilterBar.tsx`

| Filter | Control | Behavior |
|---|---|---|
| Plant | Dropdown | Options from `GET /api/ems/equipment/filters` |
| Area | Dropdown | Filtered by selected plant |
| Equipment Type | Dropdown | |
| Status | Multi-select | Overdue / Due Soon / OK / No WO |
| Search | Text input | Debounced 300ms — tag_no + description |

Filters chain: changing plant resets area. All filters update URL search params for shareable links.

Reuse plant labels from `utils/pmCalibrationPlantMap.ts`.

---

### 4.2 Equipment table (desktop)

**File:** `frontend/src/components/ems/equipment/EquipmentTable.tsx`

| Column | Source |
|---|---|
| Tag No. | EQ.EQCODE |
| Description | EQ.EQNAME |
| Plant | Tag prefix |
| Area | `IgxEQExtension.location` (expose as `area` in API) |
| Equipment Type | Extension or EQCODE parse |
| Manufacturer / Model | Extension |
| Cal. Interval | Extension |
| Status | Calculated badge |
| Next Due | PMSched.DUEDATE |

Row click → navigate to `/ems/equipment/:tagNo`.

**Status badge colors:**
- `OVERDUE` — red (`destructive`)
- `DUE SOON` — yellow/amber
- `OK` — green
- `NO WO` — gray/muted

---

### 4.3 Equipment card (mobile)

**File:** `frontend/src/components/ems/equipment/EquipmentCard.tsx`

Shows: Tag No., Description, Status badge, Next Due. Full card tappable.

Breakpoint: switch table ↔ cards at `md` (768px) or `sm` (640px) — test at 375px per acceptance criteria.

---

### 4.4 Equipment list page

**File:** `frontend/src/pages/ems/EquipmentListPage.tsx`

```tsx
// State: filters, page, loading, items, pagination
// useEffect: debounced fetch via emsService.listEquipment()
// Layout: PageHeader + EquipmentFilterBar + (Table | Cards) + Pagination
```

**Performance target:** Load within 2s on mobile for 50 records (spec §12).

---

### 4.5 Spec section component

**File:** `frontend/src/components/ems/equipment/SpecSection.tsx`

Renders calibration specification fields per spec §4.2 Section 2:

- Working Range (min–max + unit)
- Working Range Points
- Calibration Range (min–max + unit)
- Calibration Range Points
- MPE (value + unit + condition)
- Cal. Interval (human-readable)

Format numbers with locale; handle nulls gracefully ("—").

---

### 4.6 WO status section

**File:** `frontend/src/components/ems/equipment/WoStatusSection.tsx`

Section 3 — Current WO:
- Active WO No., Status, Due Date, Assigned Calibrator
- "No active work order" empty state

Section 4 — PM History:
- Last 5 completed WOs: WO No., Completed Date, Performed By
- "View all" expands inline (no new route in Phase 1)

---

### 4.7 Equipment detail page

**File:** `frontend/src/pages/ems/EquipmentDetailPage.tsx`

Two-column desktop / single-column mobile layout:

```
[ Identity + Status badge ]
[ Calibration Specifications ]
[ Current WO Status    ] [ PM History ]
```

Fetch: `emsService.getEquipmentDetail(tagNo)` on mount.

Handle 404 — equipment not found in EQ or extension.

---

### 4.8 Backend completion (if not done in Phase 02)

Ensure `equipmentController.js` returns all fields needed by UI. Key joins:

```sql
-- Confirm exact IgxEQExtension join key (EQNO vs EQCODE)
SELECT eq.EQCODE AS tagNo, eq.EQNAME AS description, ext.*, ...
FROM dbo.EQ eq
INNER JOIN dbo.IgxEQExtension ext ON ext.EQNO = eq.EQNO
```

For status + next due, subquery or lateral join to latest open PMSched row.

---

## Component Tree

```
EquipmentListPage
├── PageHeader
├── EquipmentFilterBar
├── EquipmentTable (desktop)
├── EquipmentCard[] (mobile)
└── Pagination

EquipmentDetailPage
├── PageHeader (with back link)
├── IdentityCard
├── SpecSection
├── WoStatusSection
└── PmHistorySection (inside WoStatusSection or separate)
```

---

## Checklist (maps to spec §12)

- [x] 287 records accessible via list API (intentional registry scope)
- [x] List pagination 50/page with prev/next
- [x] Search debounced 300ms on tag + description
- [x] Plant → Area filter chains correctly
- [x] Equipment Type + Status multi-filter work
- [x] Detail shows all spec fields from IgxEQExtension
- [x] Detail shows current WO + PM history (expand to 50)
- [x] Status badge matches backend calculation
- [x] Mobile card layout below `md` breakpoint

---

## Reuse Notes

| Existing asset | Use in EMS |
|---|---|
| `pmCalibrationPlantMap.ts` | Plant dropdown labels |
| `calibrationEqTypeFromEqcode.js` (backend) | Equipment type classification |
| Table/pagination patterns from ticket list | Copy UI patterns, not components directly |

No direct copy from calibration dashboard — equipment registry is net-new UI.
