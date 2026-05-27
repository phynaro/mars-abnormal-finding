# Cedar New Schema Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate EDEN's backend to be compatible with the new Cedar CMMS database schema while preserving all existing functionality.

**Architecture:** The new Cedar schema is a slimmed-down standard schema: `Person` lost 16 columns (EMAIL, PHONE, TITLE, PINCODE, PERSON_NAME, SiteNo, etc.), `Site` table was removed entirely, `PU`/`EQ`/`PM` lost SiteNo and other fields, and `sp_WOMain_Insert` signature changed. The approach is: (1) extend `IgxUserExtension` to own the person profile fields that Cedar no longer holds, (2) migrate existing data into it, (3) rewrite all affected queries, (4) re-verify the Cedar WO stored procedure.

**Tech Stack:** Node.js/Express, mssql (parameterized queries), MSSQL (SQL Server **2008** — no CONCAT function, use `ISNULL(x,'') + ' ' + ISNULL(y,'')`), Docker Compose

---

## ✅ Already Completed (as of 2026-05-26)

### PERSON_NAME sweep — ALL direct SQL SELECTs replaced
Every `p.PERSON_NAME` / `u.PERSON_NAME` reference in backend code was replaced with
`ISNULL(x.FIRSTNAME,'') + ' ' + ISNULL(x.LASTNAME,'')` using the `+` operator (SQL Server 2008 — no CONCAT).
`GROUP BY` clauses updated to use `FIRSTNAME, LASTNAME` instead of the alias.

Files completed:
- `controllers/ticketController.js`
- `controllers/ticketController/helpers.js`
- `controllers/dashboardController.js`
- `controllers/calibrationController.js`
- `controllers/calibrationUserEventsController.js`
- `controllers/pmCalibrationScheduleController.js`
- `controllers/inventoryController.js`
- `controllers/administrationController.js`
- `controllers/personnelController.js`
- `controllers/userController.js` (SELECT only — UPDATE left intentionally, see Task 3)
- `controllers/accessRequestController.js`
- `controllers/personalTargetController.js`
- `controllers/workflowController.js`
- `controllers/workRequestController.js`
- `services/dueDateNotificationService.js`
- `services/pendingTicketNotificationService.js`
- `services/finishedTicketReviewNotificationService.js`
- `services/calibrationDueDateNotificationService.js`

**Intentionally deferred:** `userManagementController.js` lines 58, 165, 373, 394, 528 — still references `PERSON_NAME` because ViewUserModal/EditUserModal actively display it. Must update frontend modals + controller together (Task 3 below).

### Site table cleanup — assetController.js (Task 7 ✅)
- Removed all `LEFT JOIN Site`, `SiteName`, `SiteCode` from `getProductionUnits`, `getEquipment`, `getProductionUnitDetails`, `getEquipmentDetails`
- `frontend/assetService.ts` — removed `SiteName?: string` from `ProductionUnit` interface
- `frontend/ProductionUnitPage.tsx` — removed Site column from table and mobile card

### Stored procedures — deferred (in-database patch needed)
These SPs internally SELECT `PERSON_NAME` — cannot fix from EDEN code side alone:
- `sp_Igx_GetUsersForNotification` — used by `reviewEscalationNotificationService.js`, `oldOpenTicketNotificationService.js`
- `sp_Dashboard_Backlog_AssignTo` — used by `backlogController.js` (`row.PERSON_NAME`)

These must be patched directly in the Cedar DB before cutover.

---

## Schema Diff Reference

### `Person` table — columns REMOVED from new Cedar

| Column | Impact |
|---|---|
| `PERSON_NAME` | **DONE** — replaced with `ISNULL(FIRSTNAME,'') + ' ' + ISNULL(LASTNAME,'')` everywhere |
| `EMAIL` | Auth, notifications, controllers. **Move to `IgxUserExtension.email`** (pending) |
| `PHONE` | Controllers. **Move to `IgxUserExtension.phone`** (pending) |
| `TITLE` | Controllers. **Move to `IgxUserExtension.title_text`** (avoid reserved word) (pending) |
| `PINCODE` | Auth. **Move to `IgxUserExtension.pincode`** (pending) |
| `SiteNo` | `auth.js`/`authController.js` already clean. Still in `workRequestController.js` line ~29, `userManagementController.js` INSERT ~394. Drop — no replacement. |

Also: `PERSONCODE` shrunk from `nvarchar(20)` → `varchar(10)` NOT NULL in new.

### `Site` table — COMPLETELY REMOVED ✅ DONE
Removed from `assetController.js` and frontend. No remaining references.

### `_secUsers` — `PersonAccessNo` column removed
Not queried by EDEN. No action needed.

### `Dept` — columns removed in new Cedar
`SiteNo` — not queried by EDEN after cleanup. `LineToken`, `COSTCENTERNO`, etc. — not queried. No action.

### `PU` / `EQ` / `PM` — SiteNo and other columns removed
`SiteNo` removed from all three. EDEN calibration queries may reference `pm.SiteNo` — see Task 9.

### `WO` table — columns changed
`SiteNo` removed — must remove from `cedarIntegrationService.js` (Task 8).

### `sp_WOMain_Insert` — signature changed
Old: 80 parameters including `@SiteNo`, `@EQTypeNo`, `@FlagTPM`, etc.
New: needs verification via `mcp__cedar_new__execute_read_query` — see Task 8.

---

## Files Remaining

| File | What still needs changing |
|---|---|
| `backend/src/middleware/auth.js` | `p.EMAIL` → `ue.email` (no Site JOIN, no PERSON_NAME remaining) |
| `backend/src/controllers/authController.js` | `p.EMAIL` → `ue.email` (3 query copies: login, LINE login, refresh) |
| `backend/src/controllers/userManagementController.js` | PERSON_NAME (lines 58,165,373,394,528) + `p.EMAIL/PHONE/TITLE/SiteNo/PINCODE` → IgxUserExtension |
| `backend/src/controllers/userController.js` | `p.EMAIL, p.PHONE, p.TITLE` → IgxUserExtension (PERSON_NAME SELECT already done) |
| `backend/src/controllers/personnelController.js` | `p.EMAIL, p.PHONE, p.SiteNo` → IgxUserExtension / remove SiteNo |
| `backend/src/controllers/workRequestController.js` | `p.SiteNo` (line ~29) — remove |
| `backend/src/controllers/workflowController.js` | `fp.EMAIL, fp.PHONE, fp.TITLE` (multi-alias pattern) → IgxUserExtension |
| `backend/src/controllers/administrationController.js` | `per.EMAIL, per.PHONE` → IgxUserExtension |
| `backend/src/controllers/ticketController.js` | Notification SELECTs still read `p.EMAIL` → `ue.email` |
| `backend/src/controllers/ticketController/helpers.js` | `p.EMAIL` in `getUserById*` → `ue.email` |
| `backend/src/services/dueDateNotificationService.js` | `p.EMAIL` → `ue.email` |
| `backend/src/services/pendingTicketNotificationService.js` | `p.EMAIL` → `ue.email` |
| `backend/src/services/finishedTicketReviewNotificationService.js` | `p.EMAIL` → `ue.email` |
| `backend/src/services/calibrationDueDateNotificationService.js` | `p.EMAIL` → `ue.email` |
| `backend/src/services/oldOpenTicketNotificationService.js` | SP call (deferred) + `p.EMAIL` → `ue.email` |
| `backend/src/services/reviewEscalationNotificationService.js` | SP call (deferred) + `p.EMAIL` → `ue.email` |
| `backend/src/services/cedarIntegrationService.js` | `sp_WOMain_Insert` parameter list (Task 8) |
| `backend/src/helpers/pmCalibrationScheduleQuery.js` | May reference `SiteNo` (Task 9) |
| `backend/src/helpers/calibrationEqTypeFromEqcode.js` | May reference EQ fields (Task 9) |

---

## Task 1: Extend `IgxUserExtension` and migrate person profile data

**Files:**
- Create: `backend/script/migrate-person-data-to-extension.js`

Person profile fields (`EMAIL`, `PHONE`, `TITLE`, `PINCODE`) will be owned by EDEN's `IgxUserExtension` table going forward. This task adds the columns and migrates the existing values from the old Cedar's `Person` table.

> **Run against: old Cedar DB** (while still live). Before switching to new Cedar, run this migration script once to copy data.

- [ ] **Step 1: Add columns to `IgxUserExtension`**

Connect to the database (old Cedar while migrating) and run this DDL:

```sql
ALTER TABLE IgxUserExtension
  ADD email       NVARCHAR(200) NULL,
      phone       NVARCHAR(30)  NULL,
      title_text  NVARCHAR(200) NULL,
      pincode     NVARCHAR(10)  NULL;
```

If deploying to new Cedar, `IgxUserExtension` is in the same DB and this is safe to run once.

- [ ] **Step 2: Write the migration script**

Create `backend/script/migrate-person-data-to-extension.js`:

```js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const sql = require('mssql');
const dbConfig = require('../src/config/dbConfig');

async function run() {
  const pool = await sql.connect(dbConfig);

  const result = await pool.request().query(`
    UPDATE ue
    SET
      ue.email      = CASE WHEN ue.email      IS NULL THEN p.EMAIL   ELSE ue.email      END,
      ue.phone      = CASE WHEN ue.phone      IS NULL THEN p.PHONE   ELSE ue.phone      END,
      ue.title_text = CASE WHEN ue.title_text IS NULL THEN p.TITLE   ELSE ue.title_text END,
      ue.pincode    = CASE WHEN ue.pincode    IS NULL THEN p.PINCODE ELSE ue.pincode    END
    FROM IgxUserExtension ue
    INNER JOIN _secUsers u ON ue.UserID = u.UserID
    INNER JOIN Person p    ON u.PersonNo = p.PERSONNO
    WHERE p.EMAIL IS NOT NULL
       OR p.PHONE IS NOT NULL
       OR p.TITLE IS NOT NULL
       OR p.PINCODE IS NOT NULL
  `);

  console.log('Rows updated: ' + result.rowsAffected[0]);

  const check = await pool.request().query(
    'SELECT COUNT(*) AS total FROM IgxUserExtension WHERE email IS NOT NULL'
  );
  console.log('Users with email after migration: ' + check.recordset[0].total);

  await pool.close();
}

run().catch(function(err) { console.error(err); process.exit(1); });
```

> **Note:** Uses `CASE WHEN ... IS NULL` instead of `COALESCE` to avoid SQL Server 2008 issues. No `CONCAT()`.

- [ ] **Step 3: Run migration against old Cedar (before cutover)**

```bash
cd backend
node script/migrate-person-data-to-extension.js
```

Expected output:
```
Rows updated: <N>
Users with email after migration: <N>
```

Verify N > 0. If 0, check that `.env` `DB_SERVER` points to old Cedar.

- [ ] **Step 4: Commit**

```bash
git add backend/script/migrate-person-data-to-extension.js
git commit -m "feat: migrate person profile fields (email/phone/title/pincode) to IgxUserExtension for Cedar new schema"
```

---

## Task 2: Fix the shared user SELECT query — auth middleware and authController

**Files:**
- Modify: `backend/src/middleware/auth.js`
- Modify: `backend/src/controllers/authController.js` (3 copies: login, LINE login, refresh)

**Current state:** No `Site` JOIN, no `PERSON_NAME`. Still reads `p.EMAIL` directly from `Person`. Must move to `ue.email` from `IgxUserExtension`.

**The new canonical user SELECT** (replaces auth middleware query and all authController copies):

```sql
SELECT
  u.PersonNo,
  u.UserID,
  u.GroupNo,
  u.LevelReport,
  u.ExpireDate,
  u.NeverExpireFlag,
  ue.EmailVerified,
  ue.LastLogin,
  ue.CreatedAt,
  ue.LineID,
  ue.AvatarUrl,
  ue.IsActive,
  ue.email      AS EMAIL,
  ue.phone      AS PHONE,
  ue.title_text AS TITLE,
  ue.pincode    AS PINCODE,
  g.UserGCode,
  g.UserGName,
  p.PERSONCODE,
  p.FIRSTNAME,
  p.LASTNAME,
  p.DEPTNO,
  ISNULL(p.FIRSTNAME,'') + ' ' + ISNULL(p.LASTNAME,'') AS PERSON_NAME,
  d.DEPTCODE,
  d.DEPTNAME
FROM _secUsers u
LEFT JOIN IgxUserExtension ue ON u.UserID = ue.UserID
LEFT JOIN _secUserGroups g    ON u.GroupNo = g.GroupNo
LEFT JOIN Person p            ON u.PersonNo = p.PERSONNO
LEFT JOIN Dept d              ON p.DEPTNO = d.DEPTNO
WHERE u.UserID = @userID AND (ue.IsActive = 1 OR ue.IsActive IS NULL)
```

Key changes from current query:
- Remove: `p.EMAIL` (now `ue.email AS EMAIL`)
- Added: `ue.phone AS PHONE`, `ue.title_text AS TITLE`, `ue.pincode AS PINCODE`
- `PERSON_NAME` already computed via `+` operator (not CONCAT — SQL Server 2008)

- [ ] **Step 1: Update `auth.js` middleware query**

In `backend/src/middleware/auth.js`, replace the SQL string inside `authenticateToken`. Find the `pool.request()...query(...)` block. Replace the SELECT columns to remove `p.EMAIL` and add the four `ue.*` columns above.

Also update the `req.user` mapping block to add:
```js
req.user = {
  // ... existing fields ...
  email: user.EMAIL,        // now from ue.email
  phone: user.PHONE,        // now from ue.phone
  title: user.TITLE,        // now from ue.title_text
  pinCode: user.PINCODE,    // now from ue.pincode
  fullName: user.PERSON_NAME,
  // ... no siteNo, siteCode, siteName ...
};
```

- [ ] **Step 2: Apply same query to `authController.js` login path**

Find the `login` function query block that reads `p.EMAIL`. Replace with the canonical query. Remove any remaining `s.SiteCode`, `s.SiteName` result mappings if present.

- [ ] **Step 3: Apply same query to `authController.js` LINE login path**

Same as Step 2 for the LINE login function.

- [ ] **Step 4: Apply same query to `authController.js` refresh path**

Same as Step 2 for the token refresh function.

- [ ] **Step 5: Start backend and test login**

```bash
cd backend
npm run dev
```

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"<valid_user>","password":"<valid_pass>"}'
```

Expected: `{"success":true,"data":{"token":"...","user":{...}}}` with `email` field populated from `IgxUserExtension` (will be `null` until Task 1 migration script runs, but should not error).

- [ ] **Step 6: Commit**

```bash
git add backend/src/middleware/auth.js backend/src/controllers/authController.js
git commit -m "fix: source email/phone/title/pincode from IgxUserExtension in auth queries (Cedar new schema)"
```

---

## Task 3: Fix `userManagementController.js` and `userController.js`

**Files:**
- Modify: `backend/src/controllers/userManagementController.js`
- Modify: `backend/src/controllers/userController.js`
- Modify: `frontend/src/components/user-management/ViewUserModal.tsx`
- Modify: `frontend/src/components/user-management/EditUserModal.tsx`

**Current state:** `userManagementController.js` still reads `p.PERSON_NAME` (lines 58, 165) and writes it (lines 373, 394, 528). Also reads `p.EMAIL, p.PHONE, p.TITLE, p.SiteNo, p.PINCODE`. These were intentionally left because the frontend modals display them. Update backend and frontend together.

- [ ] **Step 1: Fix `userManagementController.js` SELECT queries (lines ~55 and ~165)**

For both SELECT queries, replace:
```sql
p.PERSON_NAME,
p.EMAIL,
p.PHONE,
p.TITLE,
p.PINCODE,
p.SiteNo,
```

With:
```sql
ISNULL(p.FIRSTNAME,'') + ' ' + ISNULL(p.LASTNAME,'') AS PERSON_NAME,
ue.email      AS EMAIL,
ue.phone      AS PHONE,
ue.title_text AS TITLE,
ue.pincode    AS PINCODE,
```

Remove any `LEFT JOIN dbo.Site s ON p.SiteNo = s.SiteNo` and remove `s.SiteCode`, `s.SiteName` from SELECT. Remove `p.SiteNo`. Ensure `LEFT JOIN IgxUserExtension ue ON u.UserID = ue.UserID` is present.

- [ ] **Step 2: Fix `userManagementController.js` INSERT/UPDATE (lines ~373, ~394, ~528)**

Remove `PERSON_NAME` from INSERT column list and corresponding `@PERSON_NAME` parameter binding. Remove `SiteNo` from INSERT/UPDATE. These columns no longer exist in new Cedar.

- [ ] **Step 3: Fix `userController.js` profile query (~line 269)**

Replace `p.EMAIL, p.PHONE, p.TITLE` with `ue.email AS EMAIL, ue.phone AS PHONE, ue.title_text AS TITLE`. Ensure `LEFT JOIN IgxUserExtension ue ON u.UserID = ue.UserID` is present in the query.

- [ ] **Step 4: Update `ViewUserModal.tsx` to use `FIRSTNAME + LASTNAME`**

The modal currently reads `user.PERSON_NAME`. Change to display `user.FIRSTNAME + ' ' + user.LASTNAME` (or the `fullName` field returned from the API). Remove any `PERSON_NAME` display field.

- [ ] **Step 5: Update `EditUserModal.tsx`**

Same as Step 4. If the modal has an editable "full name" field backed by `PERSON_NAME`, split it or remove it. EDEN does not manage first/last name — those come from Cedar and are read-only.

- [ ] **Step 6: Test user management UI**

Open the user management page, click View and Edit on a user. Expected: Names display correctly from FIRSTNAME/LASTNAME, email/phone/title populate from IgxUserExtension.

- [ ] **Step 7: Commit**

```bash
git add backend/src/controllers/userManagementController.js \
        backend/src/controllers/userController.js \
        frontend/src/components/user-management/ViewUserModal.tsx \
        frontend/src/components/user-management/EditUserModal.tsx
git commit -m "fix: remove PERSON_NAME and SiteNo from user management; source profile from IgxUserExtension"
```

---

## Task 4: Fix EMAIL references in ticket controller and helpers

**Files:**
- Modify: `backend/src/controllers/ticketController.js`
- Modify: `backend/src/controllers/ticketController/helpers.js`

**Current state:** PERSON_NAME sweep is complete. Notification SELECTs still read `p.EMAIL` from Person. Need to change to `ue.email`.

- [ ] **Step 1: Fix notification SELECTs in `ticketController.js`**

Search for `p.EMAIL` in notification query blocks (lines ~1126, ~1496, ~2100, ~3115, ~3121). For each:

Replace:
```sql
p.EMAIL
```
With:
```sql
ue.email AS EMAIL
```

Confirm that each of these queries already has `LEFT JOIN IgxUserExtension ue ON ...` (they should — added during PERSON_NAME sweep). If any is missing, add:
```sql
LEFT JOIN _secUsers su ON p.PERSONNO = su.PersonNo
LEFT JOIN IgxUserExtension ue ON su.UserID = ue.UserID
```

- [ ] **Step 2: Fix `helpers.js` `getUserById` and `getUserByIdWithAvatar`**

Both functions have a SELECT that currently includes `p.EMAIL`. Replace with `ue.email AS EMAIL`. The `IgxUserExtension ue` join is already present in these helpers.

- [ ] **Step 3: Test ticket notification flow**

Trigger a ticket status change (e.g., accept a ticket) and check backend logs for SQL errors. Expected: No `Invalid column name 'EMAIL'` errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/ticketController.js \
        backend/src/controllers/ticketController/helpers.js
git commit -m "fix: replace p.EMAIL with ue.email in ticket controller notification queries"
```

---

## Task 5: Fix remaining controllers — administration, personnel, workRequest, workflow

**Files:**
- Modify: `backend/src/controllers/administrationController.js`
- Modify: `backend/src/controllers/personnelController.js`
- Modify: `backend/src/controllers/workRequestController.js`
- Modify: `backend/src/controllers/workflowController.js`

**Current state:** PERSON_NAME sweep is complete in all four. Still need to fix `EMAIL`/`PHONE` references and `SiteNo` removal.

- [ ] **Step 1: Fix `administrationController.js` — EMAIL/PHONE**

Search for `per.EMAIL` and `per.PHONE` (lines ~37, ~55, ~73, ~74, ~104, ~157, ~1010, ~1015, ~1018). For each:
- Replace `per.EMAIL` → `ue.email AS EMAIL`
- Replace `per.PHONE` → `ue.phone AS PHONE`

For queries joining `Person per` directly (without `_secUsers`), add:
```sql
LEFT JOIN _secUsers su ON per.PERSONNO = su.PersonNo
LEFT JOIN IgxUserExtension ue ON su.UserID = ue.UserID
```

For queries already joining `_secUsers u`, add:
```sql
LEFT JOIN IgxUserExtension ue ON u.UserID = ue.UserID
```

- [ ] **Step 2: Fix `personnelController.js` — EMAIL/PHONE/SiteNo**

Search for `p.EMAIL`, `p.PHONE`, `p.SiteNo` (lines ~25, ~71, ~120, ~348, ~396, ~586, ~587, ~596).
- `p.EMAIL` → `ue.email AS EMAIL`
- `p.PHONE` → `ue.phone AS PHONE`
- `p.SiteNo` → remove entirely (no replacement). Remove corresponding `request.input('siteNo', ...)` bindings if only used for this.

Add IgxUserExtension join where missing (same pattern as Step 1).

- [ ] **Step 3: Fix `workRequestController.js` — SiteNo**

Line ~29: Remove `p.SiteNo` from the SELECT. Remove corresponding `request.input` binding if present. Also check `p.EMAIL`/`p.PHONE` in this file and replace with `ue.*`.

- [ ] **Step 4: Fix `workflowController.js` — multi-alias EMAIL/PHONE/TITLE**

Lines ~197–211 and ~323–337 have a three-alias pattern (`fp` = from person, `rp` = receive person, `ap` = approved person). Each person alias needs its own IgxUserExtension join:

```sql
LEFT JOIN _secUsers su_fp      ON fp.PERSONNO = su_fp.PersonNo
LEFT JOIN IgxUserExtension uef ON su_fp.UserID = uef.UserID

LEFT JOIN _secUsers su_rp      ON rp.PERSONNO = su_rp.PersonNo
LEFT JOIN IgxUserExtension uer ON su_rp.UserID = uer.UserID

LEFT JOIN _secUsers su_ap      ON ap.PERSONNO = su_ap.PersonNo
LEFT JOIN IgxUserExtension uea ON su_ap.UserID = uea.UserID
```

Then replace:
- `fp.EMAIL` → `uef.email AS FromPersonEmail`, `fp.PHONE` → `uef.phone`, `fp.TITLE` → `uef.title_text`
- `rp.EMAIL` → `uer.email`, etc.
- `ap.EMAIL` → `uea.email`, etc.

- [ ] **Step 5: Test affected endpoints**

```bash
curl http://localhost:3001/api/administration/approvers -H "Authorization: Bearer <token>"
curl http://localhost:3001/api/personnel -H "Authorization: Bearer <token>"
curl http://localhost:3001/api/workrequest -H "Authorization: Bearer <token>"
```

Expected: All return `{"success":true}` with no SQL errors.

- [ ] **Step 6: Commit**

```bash
git add backend/src/controllers/administrationController.js \
        backend/src/controllers/personnelController.js \
        backend/src/controllers/workRequestController.js \
        backend/src/controllers/workflowController.js
git commit -m "fix: replace p.EMAIL/PHONE/SiteNo with IgxUserExtension in administration/personnel/workRequest/workflow"
```

---

## Task 6: Fix EMAIL references in notification services

**Files:**
- Modify: `backend/src/services/dueDateNotificationService.js`
- Modify: `backend/src/services/pendingTicketNotificationService.js`
- Modify: `backend/src/services/finishedTicketReviewNotificationService.js`
- Modify: `backend/src/services/calibrationDueDateNotificationService.js`
- Modify: `backend/src/services/oldOpenTicketNotificationService.js`
- Modify: `backend/src/services/reviewEscalationNotificationService.js`

**Current state:** PERSON_NAME sweep complete in all six. Still read `p.EMAIL` from Person. Also: `oldOpenTicketNotificationService.js` and `reviewEscalationNotificationService.js` call SPs that internally use `PERSON_NAME` — those SPs need in-database patches (separate action, see SP note below).

- [ ] **Step 1: Fix `p.EMAIL` → `ue.email` in all six services**

For each file, search for `p.EMAIL` or `u.EMAIL` in SQL query strings. Replace with `ue.email AS EMAIL` (or matching alias). Ensure `LEFT JOIN IgxUserExtension ue ON u.UserID = ue.UserID` is present (most services already have this join).

- [ ] **Step 2: Note on `sp_Igx_GetUsersForNotification` and `sp_Dashboard_Backlog_AssignTo`**

These SPs are called from `reviewEscalationNotificationService.js`, `oldOpenTicketNotificationService.js`, and `backlogController.js`. The SPs internally SELECT `PERSON_NAME` — cannot fix from EDEN code. Must patch in the Cedar database:

```sql
-- Run against Cedar DB (both old for testing, and new before cutover):
-- In sp_Igx_GetUsersForNotification: replace p.PERSON_NAME with
--   ISNULL(p.FIRSTNAME,'') + ' ' + ISNULL(p.LASTNAME,'')
-- In sp_Dashboard_Backlog_AssignTo: same replacement
```

Coordinate with DBA or whoever has write access to Cedar stored procedures.

- [ ] **Step 3: Test notification services**

```bash
cd backend
node -e "
  require('dotenv').config({ path: '.env' });
  var svc = require('./src/services/pendingTicketNotificationService');
  svc.sendPendingTicketNotifications().then(function(r) { console.log('OK', r); }).catch(console.error);
"
```

Expected: Runs without SQL errors. May send 0 notifications if no pending tickets.

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/dueDateNotificationService.js \
        backend/src/services/pendingTicketNotificationService.js \
        backend/src/services/finishedTicketReviewNotificationService.js \
        backend/src/services/calibrationDueDateNotificationService.js \
        backend/src/services/oldOpenTicketNotificationService.js \
        backend/src/services/reviewEscalationNotificationService.js
git commit -m "fix: replace p.EMAIL with ue.email in notification services for new Cedar schema"
```

---

## Task 7: Fix `assetController.js` — Site JOIN removal ✅ DONE

**Completed 2026-05-26.** All `LEFT JOIN Site`, `SiteName`, `SiteCode` references removed from `assetController.js`. Frontend updated to remove `SiteName` from `ProductionUnit` interface and table column. No further action needed.

---

## Task 8: Investigate and fix `sp_WOMain_Insert` in Cedar integration

**Files:**
- Modify: `backend/src/services/cedarIntegrationService.js`

The old `sp_WOMain_Insert` had 80 parameters. New Cedar returned 0 parameters from MCP introspection — needs direct verification.

- [ ] **Step 1: Verify the new SP signature via raw query**

Load the MCP tool and run against new Cedar:

```
ToolSearch: select:mcp__cedar_new__execute_read_query
```

Then run:
```sql
SELECT
  p.name AS parameter_name,
  t.name AS data_type,
  p.max_length,
  p.is_output
FROM sys.procedures sp
INNER JOIN sys.parameters p ON sp.object_id = p.object_id
INNER JOIN sys.types t ON p.user_type_id = t.user_type_id
WHERE sp.name = 'sp_WOMain_Insert'
ORDER BY p.parameter_id;
```

Expected: Returns actual parameter list. Compare against old (80 params).

- [ ] **Step 2: Map old params to new params**

Key params likely removed (based on WO column removals):
- `@SiteNo` — removed (SiteNo removed from WO)
- `@EQTypeNo` — likely removed
- `@FlagTPM`, `@TPMNo` — likely removed
- `@JsaType`, `@JsaNo` — likely removed
- `@FlagCleaningJobFinish`, `@FlagCleaningJobFinishNotReq` — likely removed
- `@FlagHandoverOper`, `@FlagHandoverOperNotReq` — likely removed

In `cedarIntegrationService.js`, the `setWorkOrderParameters` method (~line 485) sets all 80 params. Remove `request.input(...)` calls for params that no longer exist in the new SP.

- [ ] **Step 3: Update `setWorkOrderParameters` in `cedarIntegrationService.js`**

After confirming the new SP signature, remove the `request.input` calls for each dropped parameter. Do not guess — only remove params confirmed absent from the Step 1 query.

- [ ] **Step 4: Test WO creation**

```bash
curl -X POST http://localhost:3001/api/cedar-integration/sync/<ticketId> \
  -H "Authorization: Bearer <token>"
```

Expected: `{"success":true,"data":{"wono": <new_wo_number>}}` — a WO is created in Cedar.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/cedarIntegrationService.js
git commit -m "fix: update sp_WOMain_Insert parameter list for new Cedar schema"
```

---

## Task 9: Fix calibration/EMS queries — PM, EQ SiteNo references

**Files:**
- Modify: `backend/src/helpers/pmCalibrationScheduleQuery.js`
- Modify: `backend/src/helpers/calibrationEqTypeFromEqcode.js`
- Modify: `backend/src/controllers/calibrationController.js`
- Modify: `backend/src/controllers/pmCalibrationScheduleController.js`

**Current state:** `pmCalibrationScheduleController.js` PERSON_NAME is done. Check if `SiteNo` references remain in helpers/controller.

- [ ] **Step 1: Audit calibration helpers for removed columns**

```bash
grep -n "SiteNo\|EQTypeNo\|CREATEDATE\|CREATEUSER" backend/src/helpers/pmCalibrationScheduleQuery.js
grep -n "SiteNo\|EQTypeNo\|CREATEDATE\|CREATEUSER" backend/src/controllers/calibrationController.js
grep -n "SiteNo" backend/src/helpers/calibrationEqTypeFromEqcode.js
```

List all matches.

- [ ] **Step 2: Remove SiteNo filter / JOIN from PM and EQ queries**

For each occurrence:
- Remove `AND pm.SiteNo = @siteNo` or `AND eq.SiteNo = @siteNo`
- Remove corresponding `request.input('siteNo', ...)` if only used for that filter
- Remove `pm.CREATEUSER`, `pm.CREATEDATE` from any SELECT (columns gone)

- [ ] **Step 3: Test calibration schedule endpoint**

```bash
curl http://localhost:3001/api/calibration/schedule \
  -H "Authorization: Bearer <token>"
```

Expected: Returns PM schedule records without SQL errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/helpers/pmCalibrationScheduleQuery.js \
        backend/src/helpers/calibrationEqTypeFromEqcode.js \
        backend/src/controllers/calibrationController.js \
        backend/src/controllers/pmCalibrationScheduleController.js
git commit -m "fix: remove SiteNo and removed-column references from calibration/EMS queries"
```

---

## Task 10: Update `dbConfig.js` and env for new Cedar

**Files:**
- Modify: `backend/.env` (or `.env.production`)

- [ ] **Step 1: Update DB connection env vars to point to new Cedar**

In `backend/.env` (local dev) or `backend/.env.production`:

```
DB_SERVER=<new-cedar-server-ip-or-hostname>
DB_NAME=CEDAR
DB_USER=<user>
DB_PASSWORD=<password>
DB_PORT=1433
DB_INSTANCE=
```

The new Cedar DB name is `CEDAR` (old was `Cedar6_Mars`).

- [ ] **Step 2: Restart backend and run health check**

```bash
docker compose -f docker-compose.local.yml up backend --build
curl http://localhost:3001/api/health
```

Expected: `{"status":"OK",...}`

- [ ] **Step 3: Run a full auth test against new Cedar**

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"<user>","password":"<pass>"}'
```

Expected: Valid JWT returned, `user.email` populated from `IgxUserExtension`.

- [ ] **Step 4: Note — do not commit `.env`**

`.env` files are gitignored. Update `.env.example` to document `DB_NAME=CEDAR`.

```bash
git add backend/.env.example
git commit -m "docs: update DB_NAME to CEDAR in env example for new Cedar schema"
```

---

## Task 11: Smoke test all affected endpoints

**Files:** No code changes — verification only.

- [ ] **Step 1: Test auth flow end-to-end**

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"<user>","password":"<pass>"}' | node -e "var d='';process.stdin.on('data',function(c){d+=c});process.stdin.on('end',function(){console.log(JSON.parse(d).data.token)})")

curl http://localhost:3001/api/users/profile \
  -H "Authorization: Bearer $TOKEN"
```

Expected: Profile returns `email`, `phone`, `fullName` populated.

- [ ] **Step 2: Test ticket lifecycle**

Create → Accept → Plan → Start → Finish. Each step triggers Cedar sync and notification queue.

- [ ] **Step 3: Test notification worker**

```bash
cd backend && npm run worker &
npm run queue:check
```

Expected: No failed jobs. Scheduled jobs fire without SQL errors.

- [ ] **Step 4: Test calibration schedule page**

Open `http://localhost/ems/schedule` in browser (via Docker). Expected: Schedule loads with equipment list.

- [ ] **Step 5: Log any remaining SQL errors**

Check backend logs for `Invalid column name` or `Invalid object name` errors. Each maps to a missed query — fix inline and commit.

- [ ] **Step 6: Final commit**

```bash
git add -p
git commit -m "fix: resolve remaining Cedar new schema SQL errors found during smoke test"
```

---

## Cutover Checklist

Run in this order on the day of Cedar DB cutover:

- [ ] Patch `sp_Igx_GetUsersForNotification` in Cedar DB (replace `PERSON_NAME` with `ISNULL(FIRSTNAME,'') + ' ' + ISNULL(LASTNAME,'')`)
- [ ] Patch `sp_Dashboard_Backlog_AssignTo` in Cedar DB (same replacement)
- [ ] Run Task 1 migration script against **old Cedar** (before switching connection string): `node backend/script/migrate-person-data-to-extension.js`
- [ ] Verify email count > 0 in `IgxUserExtension`
- [ ] Confirm Tasks 2–9 code changes are merged to main
- [ ] Update `.env.production` to point to new Cedar (`DB_NAME=CEDAR`, new server)
- [ ] Restart backend container: `docker compose -f docker-compose.deploy.yml up backend -d`
- [ ] Smoke test: login, create ticket, notifications (escalation + old-open), WO creation, calibration schedule, backlog dashboard
- [ ] Monitor backend logs for 15 minutes for any `Invalid column name` errors
