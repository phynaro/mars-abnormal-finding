# Sub-Phase 07 — Roles & Settings

**Goal:** EMS role assignment and Plant Manager area configuration at `/ems/settings/roles`.  
**Est. effort:** 3–4 days  
**Depends on:** [01](./01-Foundation-Schema.md), [02](./02-Backend-Scaffold.md), [03](./03-Navigation-Shell.md)

---

## Spec Reference (§3, §7)

### EMS Roles
| Role | DB value | Description |
|---|---|---|
| Calibrator | `calibrator` | Performs calibration; gets 30-day + overdue alerts |
| AM | `am` | Maintenance backup; same notifications as calibrator |
| Plant Manager | `plant_manager` | Gets 14-day overdue escalation |

### Access Control
- **View/manage roles:** `levelReport = 3` OR EMS `plant_manager`
- One user can hold multiple EMS roles
- Manager area config: Person → Plant/Area mapping in `IgxEmsManagerArea`

---

## Tasks

### 7.1 Role assignment API (complete Phase 02 stub)

**File:** `backend/src/controllers/ems/roleController.js`

| Method | Path | Description |
|---|---|---|
| GET | `/api/ems/roles` | List all assignments with person name |
| POST | `/api/ems/roles` | `{ personNo, emsRole }` |
| DELETE | `/api/ems/roles/:id` | Remove assignment |
| GET | `/api/ems/manager-areas` | List area mappings |
| POST | `/api/ems/manager-areas` | `{ personNo, plant, area? }` |
| DELETE | `/api/ems/manager-areas/:id` | Remove mapping |

Validate duplicates via UNIQUE constraint on `(person_no, ems_role)`.

Search persons: reuse existing personnel API or query `Person` table with search param.

---

### 7.2 Expose EMS roles on login / profile

**Option A (preferred):** Extend `authenticateToken` or login response to include `emsRoles: string[]`.

**Option B:** Separate `GET /api/ems/me` called after login.

Frontend `AuthContext` should store `emsRoles` for gating Settings tab and notification recipient resolution.

**Acceptance (spec §12):** EMS role visible on user profile — add read-only badge section to existing profile page or EMS settings header.

---

### 7.3 Role assignment table

**File:** `frontend/src/components/ems/roles/RoleAssignmentTable.tsx`

UI:
- Search/select person (combobox with personnel search)
- Multi-select role checkboxes: Calibrator, AM, Plant Manager
- Table of current assignments: Person, Roles (badges), Actions (remove)
- Add button

Use shadcn `Table`, `Dialog`, `Command` (combobox pattern from existing codebase).

---

### 7.4 Manager area config

**File:** `frontend/src/components/ems/roles/ManagerAreaConfig.tsx`

UI:
- Person selector (typically Plant Manager or AM)
- Plant dropdown (from `pmCalibrationPlantMap.ts`)
- Area dropdown (optional — empty = all areas in plant)
- Table of current mappings
- Add / delete rows

**Note (spec §3.3):** Not required for Phase 1 go-live notifications (WO assignee is primary) but UI should be built now for escalation in Phase 08.

---

### 7.5 Role settings page

**File:** `frontend/src/pages/ems/RoleSettingsPage.tsx`

```tsx
// Gate: requireEmsAdmin (L3 or plant_manager)
// Sections:
//   1. RoleAssignmentTable
//   2. ManagerAreaConfig
```

Show access denied if user lacks admin permission.

---

### 7.6 emsService role methods

```ts
listRoleAssignments(): Promise<...>
assignRole(personNo: string, emsRole: string): Promise<...>
removeRole(id: number): Promise<...>
listManagerAreas(): Promise<...>
createManagerArea(data): Promise<...>
deleteManagerArea(id: number): Promise<...>
```

---

### 7.7 Frontend admin gate

In `EmsLayout.tsx`, conditionally show Settings tab:

```tsx
const { user } = useAuth();
const canAdmin = user.levelReport >= 3 || user.emsRoles?.includes('plant_manager');
```

Wrap `RoleSettingsPage` route with admin check.

---

## Data Model Reference

```sql
-- Example seed for testing
INSERT INTO IgxEmsUserRole (person_no, ems_role) VALUES ('12345', 'calibrator');
INSERT INTO IgxEmsManagerArea (person_no, plant, area) VALUES ('67890', 'PP', NULL);
```

---

## Checklist (spec §12)

- [x] L3 user can assign/remove EMS roles for any user
- [x] Plant Manager can assign roles (if permitted — confirm: PM admin vs L3-only)
- [x] EMS role visible on user profile
- [x] Plant Manager can configure `IgxEmsManagerArea` entries
- [x] Duplicate role assignment prevented
- [x] Settings page hidden from non-admin users

---

## Open Question #5

Customer must provide AM role holders and plant/area coverage before go-live. Track in project backlog; UI can ship empty.

---

## Out of Scope

- Cedar WO assignee sync (assignee comes from Cedar PM.ASSIGN, not EMS roles)
- Bulk import of roles from Excel
- Audit log of role changes (Phase 2)
