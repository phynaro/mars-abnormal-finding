# IgxEQExtension — Verified Column Map

**Source DB:** `CEDAR` via MCP `cedar_new` (localhost\SQLSERVER2022DEV:1434)  
**Verified:** 2026-06-09  
**Record count:** 287 (all rows have `eqno` populated; 100% join to `dbo.EQ`)

> Spec originally referenced `IgxEquipment` with ~1,228 records. Current import has **287 rows** — confirm whether remaining records are pending import or intentionally filtered.

---

## Join Pattern

```sql
FROM dbo.IgxEQExtension ext
INNER JOIN dbo.EQ eq ON eq.EQNO = ext.eqno
  AND (eq.FLAGDEL IS NULL OR eq.FLAGDEL <> 'Y')
```

- `ext.tag_no` = `eq.EQCODE` (verified — exact match on sampled rows)
- Route param `:tagNo` maps to `ext.tag_no` / `eq.EQCODE`
- Primary join key: **`ext.eqno` → `eq.EQNO`**

---

## Spec → Actual Column Mapping

| Spec field (`IgxEquipment`) | `IgxEQExtension` column | Notes |
|---|---|---|
| `tag_no` | `tag_no` | Also `eq.EQCODE` |
| `description` | `description` | Also `eq.EQNAME` |
| `plant` | **Derived** | `LEFT(tag_no, CHARINDEX('-', tag_no + '-') - 1)` |
| `area` | `location` | Spec calls it "area"; DB column is `location` |
| `manufacturer` | `manufacturer` | |
| `model` | `model` | |
| `serial_no` | `serial_no` | |
| `equipment_type` | `equipment_type` | 16 distinct values |
| `working_range_min` | `working_range_min` | `float` |
| `working_range_max` | `working_range_max` | `float` |
| `working_range_unit` | `working_range_unit` | |
| `working_range_points` | `working_range_points` | `int` |
| `cal_range_min` | `cal_range_min` | `float` |
| `cal_range_max` | `cal_range_max` | `float` |
| `cal_range_unit` | `cal_range_unit` | |
| `cal_range_points` | `cal_range_points` | `int` |
| `mpe_type` | `mpe_type` | |
| `mpe_value` | `mpe_value` | `float` |
| `mpe_unit` | `mpe_unit` | |
| `mpe_condition` | `mpe_condition` | |
| `ccp_code` | `ccp_code` | |
| `cal_ref_wi` | `cal_ref_wi` | |
| `cal_ref_form` | `cal_ref_form` | |
| `cal_interval` | `cal_interval` | e.g. "52 Week", "26 Week" |
| `cal_interval_weeks` | `cal_interval_weeks` | `int` |
| `is_duplicate_tag` | **Not present** | Skip or derive at import time |
| `is_active` | **Not present** | Filter via `eq.FLAGDEL` instead |
| `created_at` | `created_at` | `datetime2`, default GETDATE() |
| `updated_at` | `updated_at` | `datetime2`, default GETDATE() |

### Extra columns (not in spec, useful for display/debug)

| Column | Type | Purpose |
|---|---|---|
| `id` | `int` PK | Surrogate key |
| `eqno` | `int` | FK to `dbo.EQ.EQNO` |
| `working_range_raw` | `nvarchar(255)` | Original Excel string before parse |
| `working_range_type` | `nvarchar(50)` | Parsed type label |
| `cal_range_raw` | `nvarchar(255)` | Original Excel string |
| `cal_range_type` | `nvarchar(50)` | Parsed type label |
| `mpe_raw` | `nvarchar(255)` | Original Excel string |

---

## Plant Prefix Distribution (287 rows)

| Prefix | Count | In `pmCalibrationPlantMap`? |
|---|---|---|
| DP | 228 | Yes — Dry Plant |
| DJ | 21 | Yes — Dry Jaroen |
| ST | 16 | **No** — add label or map to existing |
| SN | 13 | Yes — Dry Sanook |
| PIP | 9 | **No** — confirm with customer |

---

## Sample Row

```
tag_no:          DJ-DMH-MXG-WGT2
eqno:            6358
description:     Weight Scale at Liquid Mixing Hopper Final Mixer
location:        DMH LIQUID MIXING ROOM-832-R
equipment_type:  Other
manufacturer:    METTLER TOLEDO
model:           ACT350DIO DIN ETIP
cal_interval:    52 Week
```

---

## EMS Tables Not Yet Created

MCP query found only `IgxEQExtension` — these still need Phase 01 migration:

- `IgxEmsUserRole`
- `IgxEmsManagerArea`
- `IgxEmsNotificationLog` (optional, Phase 08)

---

## API Field Naming (camelCase for frontend)

```ts
interface EmsEquipment {
  tagNo: string;
  eqNo: number;
  description: string;
  plant: string;       // derived
  area: string;        // from location
  manufacturer: string;
  model: string;
  serialNo: string;
  equipmentType: string;
  workingRange: { min: number; max: number; unit: string; points: number; raw?: string };
  calRange: { min: number; max: number; unit: string; points: number; raw?: string };
  mpe: { type: string; value: number; unit: string; condition: string; raw?: string };
  ccpCode: string;
  calRefWi: string;
  calRefForm: string;
  calInterval: string;
  calIntervalWeeks: number;
  status: 'OVERDUE' | 'DUE SOON' | 'OK' | 'NO WO';
  nextDue: string | null;
}
```
