# Sub-Phase 03 — Navigation & EMS Shell

**Goal:** Add top-level "Calibration" rail item, `/ems/*` routes, and shared EMS layout with sub-navigation.  
**Est. effort:** 1–2 days  
**Depends on:** [02-Backend-Scaffold](./02-Backend-Scaffold.md) (partial — routes can stub while backend builds)

---

## Spec Reference (§2)

| Property | Value |
|---|---|
| Rail label | **Calibration** |
| Icon | `Gauge` (lucide-react) |
| Base route | `/ems` → redirect `/ems/dashboard` |
| Permission | EMS role OR `levelReport >= 2` |

---

## Tasks

### 3.1 Add sidebar rail item

**File:** `frontend/src/components/layout/menuConfig.tsx`

Add new **top-level** menu item (not under Dashboard submenu):

```tsx
import { Gauge } from 'lucide-react';

{
  id: 'ems',
  label: 'Calibration',  // or t('ems.nav.label') after i18n keys added
  icon: <Gauge className="h-5 w-5" />,
  path: '/ems',
  permissionLevel: 2,  // base gate; EMS role check in PermissionRoute
}
```

**Decision:** Keep existing `/dashboard/calibration-v2` menu item during transition, or hide it once EMS dashboard is live. Recommend hiding after Phase 05 validation.

---

### 3.2 EMS permission route

**File:** `frontend/src/components/common/EmsRoute.tsx` (new)

```tsx
// Allow if: user.levelReport >= 2 OR user has any emsRole
// Fetch emsRoles from AuthContext (extend login response or separate GET /api/ems/me/roles)
```

Alternatively extend existing `PermissionRoute` with `type="ems"`.

**Backend:** Optionally add `GET /api/ems/me` returning `{ emsRoles, canAdmin }` for frontend gating.

---

### 3.3 Route declarations

**File:** `frontend/src/App.tsx`

```tsx
import EmsLayout from '@/pages/ems/EmsLayout';
import EmsDashboardPage from '@/pages/ems/DashboardPage';
import EquipmentListPage from '@/pages/ems/EquipmentListPage';
import EquipmentDetailPage from '@/pages/ems/EquipmentDetailPage';
import SchedulePage from '@/pages/ems/SchedulePage';
import RoleSettingsPage from '@/pages/ems/RoleSettingsPage';

// Inside protected routes:
<Route path="ems" element={<EmsRoute><EmsLayout /></EmsRoute>}>
  <Route index element={<Navigate to="dashboard" replace />} />
  <Route path="dashboard" element={<EmsDashboardPage />} />
  <Route path="equipment" element={<EquipmentListPage />} />
  <Route path="equipment/:tagNo" element={<EquipmentDetailPage />} />
  <Route path="schedule" element={<SchedulePage />} />
  <Route path="settings/roles" element={<RoleSettingsPage />} />
</Route>
```

---

### 3.4 EmsLayout component

**File:** `frontend/src/pages/ems/EmsLayout.tsx`

Shared layout with EMS sub-navigation tabs/links:

| Tab | Path |
|---|---|
| Dashboard | `/ems/dashboard` |
| Equipment | `/ems/equipment` |
| Schedule | `/ems/schedule` |
| Settings | `/ems/settings/roles` (admin only) |

**Pattern:** Follow existing `Layout.tsx` structure — use `Outlet` for child routes, horizontal tab bar below page header.

**Mobile:** Bottom tab bar or hamburger sub-nav (match EDEN mobile patterns from `BottomNavigation`).

---

### 3.5 Create emsService stub

**File:** `frontend/src/services/emsService.ts`

Fork structure from `calibrationService.ts` but point to `/api/ems`:

```ts
const BASE_URL = `${API_BASE}/ems`;
```

Initial methods (expand in later phases):
- `getDashboardKpi(params)`
- `getOverdue(params)`
- `getDueThisWeek(params)`
- `getDueSoon(params)`
- `listEquipment(params)`
- `getEquipmentDetail(tagNo)`
- `getScheduleList(params)`

---

### 3.6 i18n keys

**File:** `frontend/src/contexts/LanguageContext.tsx`

Add keys under `ems.*` for both `en` and `th`:

```
ems.nav.label, ems.nav.dashboard, ems.nav.equipment, ems.nav.schedule, ems.nav.settings
ems.status.overdue, ems.status.dueSoon, ems.status.ok, ems.status.noWo
```

---

### 3.7 Placeholder pages

Create minimal placeholder pages for each route so navigation works end-to-end before Phase 04–07 fill in UI:

- `DashboardPage.tsx` — "Coming soon" or loading skeleton
- `EquipmentListPage.tsx` — placeholder
- `EquipmentDetailPage.tsx` — placeholder
- `SchedulePage.tsx` — placeholder
- `RoleSettingsPage.tsx` — placeholder

Replace placeholders as each sub-phase completes.

---

## Checklist

- [x] Gauge icon rail item visible for L2+ users (and EMS role holders via `emsMenu`)
- [x] `/ems` redirects to `/ems/dashboard`
- [x] Sub-nav tabs switch between EMS pages
- [x] L1 users with EMS role can access (via `/api/ems/me`)
- [x] Settings tab hidden for non-admin users
- [x] `emsService.ts` points to `/api/ems`
- [x] i18n keys added (en + th)
- [x] Mobile-friendly horizontal scroll sub-nav
- [x] `EmsAccessProvider` + `GET /api/ems/me`

---

## Out of Scope

| Existing | EMS equivalent | Action |
|---|---|---|
| `/dashboard/calibration-v2` | `/ems/dashboard` | Copy UI in Phase 05; deprecate old route later |
| Dashboard submenu item | Top-level Gauge item | New entry; hide old when ready |

Do **not** delete `/dashboard/calibration-v2` until stakeholder sign-off on EMS dashboard.
