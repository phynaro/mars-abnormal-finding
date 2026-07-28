# EMS Multi-Plant Chart Colors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In multi-plant WO period chart mode, give each plant a distinct On time / Not finish color pair, shared red for Late, and a compact legend.

**Architecture:** Keep stacking (`stackId={plant}`) and data keys. Add a fixed plant color map; mute Not finish from the plant solid; Late uses `#ef4444`. Replace default Recharts legend in multi-plant mode with a custom compact legend.

**Tech Stack:** React, Recharts, existing `DashboardWoPeriodChart.tsx`, i18n via `useLanguage`.

**Spec:** `docs/superpowers/specs/2026-07-28-ems-multi-plant-chart-colors-design.md`

## Global Constraints

- Touch only `frontend/src/components/ems/dashboard/DashboardWoPeriodChart.tsx` (plus plan/spec docs if needed).
- “All” mode colors and legend stay green / amber / grey.
- Plant colors keyed by plant code, not selection order.
- No API changes.
- Do not commit unless the user asks.

---

### Task 1: Plant color helpers + bar fills

**Files:**
- Modify: `frontend/src/components/ems/dashboard/DashboardWoPeriodChart.tsx`

**Interfaces:**
- Produces: `PLANT_COLORS: Record<string, { ontime: string; notFinish: string }>`, `LATE_COLOR = '#ef4444'`, `getPlantFill(plant, status): string`

- [ ] **Step 1:** Add fixed palette for PP, DJ, DP, SN, CT, PS, ST, PIP (solid + muted tint each).
- [ ] **Step 2:** In multi-plant `Bar` rendering, set `fill` via plant/status helper; Late always `LATE_COLOR`.
- [ ] **Step 3:** Update multi-plant tooltip status label colors to match (plant ontime/notFinish, late red).
- [ ] **Step 4:** Visually verify logic by reading fills; run frontend lint on the file if practical.

### Task 2: Compact custom legend

**Files:**
- Modify: `frontend/src/components/ems/dashboard/DashboardWoPeriodChart.tsx`

**Interfaces:**
- Consumes: `PLANT_COLORS`, `LATE_COLOR`, `selectedPlants`, `statusLabels`
- Produces: custom legend UI under/in chart for multi-plant mode

- [ ] **Step 1:** When `!isAllMode`, omit default `<Legend />` (or pass empty content).
- [ ] **Step 2:** Render custom legend: selected plant solid swatches + Not finish muted sample + Late red.
- [ ] **Step 3:** When `isAllMode`, keep existing status legend.

### Task 3: Smoke check

- [ ] **Step 1:** Confirm TypeScript/ESLint clean for the edited file.
- [ ] **Step 2:** Summarize what changed for the user (manual UI check: select 2+ plants on year chart).
