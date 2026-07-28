# EMS Multi-Plant WO Period Chart Colors

**Date:** 2026-07-28  
**Status:** Approved  
**File:** `frontend/src/components/ems/dashboard/DashboardWoPeriodChart.tsx`

## Problem

In multi-plant (year) mode, every plant reuses the same On time / Late / Not finish colors. Stacked bars cannot be told apart by plant, and the default Recharts legend lists every `Plant · Status` pair, which is long and repetitive.

## Goals

1. Each plant has a distinct color so stacks are identifiable.
2. Late uses one shared red for all plants.
3. Not finish remains plant-identifiable (not a shared grey).
4. Legend shows only what is necessary.



## Non-goals

- API / data shape changes
- “All” aggregate mode color changes
- Plant filter UI / time-travel behavior changes



## Approach (A): Plant hue + shade



### Bar colors (multi-plant only)


| Status     | Fill                                                                             |
| ---------- | -------------------------------------------------------------------------------- |
| On time    | Solid unique color per plant (fixed palette for PP, DJ, DP, SN, CT, PS, ST, PIP) |
| Not finish | Lighter / muted tint of the same plant color                                     |
| Late       | Shared red `#ef4444` for every plant                                             |


Stacking stays unchanged: one stack per plant (`stackId={plant}`), periods P1–P13 on the X axis.

### Plant palette

Assign a fixed, distinguishable palette keyed by plant code (not by selection order), so colors stay stable when plants are toggled on/off.

Suggested hues (implementation may tune for contrast on light chart background):


| Plant | On time (solid) | Not finish (muted) |
| ----- | --------------- | ------------------ |
| PP    | blue            | light blue         |
| DJ    | teal            | light teal         |
| DP    | violet          | light violet       |
| SN    | sky             | light sky          |
| CT    | cyan            | light cyan         |
| PS    | emerald         | light emerald      |
| ST    | lime            | light lime         |
| PIP   | indigo          | light indigo       |


Late never uses a plant hue.

### Legend (multi-plant only)

Replace default `<Legend />` with a compact custom legend:

1. One solid swatch + plant code per **selected** plant (solid = On time)
2. One muted example swatch labeled **Not finish**
3. One red swatch labeled **Late**

Do not list `Plant · On time`, `Plant · Late`, `Plant · Not finish` rows.

“All” mode keeps the existing three-status legend (On time / Late / Not finish).

### Tooltip

Keep per-plant period breakdown. Color On time / Not finish labels with the plant’s colors; Late in red.

### “All” mode

Unchanged: green On time, amber Late, grey Not finish, single stack.

## Implementation notes

- Add `PLANT_COLORS` (or similar) map next to existing `STATUS_COLORS` in `DashboardWoPeriodChart.tsx`.
- Derive muted Not finish fills (e.g. lighter hex / HSL) from the plant solid color.
- Custom `Legend` `content` or a sibling flex row under the chart for multi-plant mode.
- Bar `fill` and `name` must match the new scheme; hide redundant series from the default legend path.



## Acceptance criteria

- [ ] With 2+ plants selected, each plant’s On time segment uses a different solid color.
- [ ] Late segments for all plants are the same red.
- [ ] Not finish segments use a muted tint of that plant’s color (not shared grey).
- [ ] Legend shows selected plants + Not finish + Late only (no per-status plant rows).
- [ ] “All” mode look and legend unchanged.
- [ ] Click-through to schedule still works per plant/period.