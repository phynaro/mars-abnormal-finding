# Cedar New Schema Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate EDEN's backend to be compatible with the new Cedar CMMS database schema while preserving all existing functionality.

**Architecture:** The new Cedar schema is a slimmed-down standard schema: `Person` lost 16 columns (EMAIL, PHONE, TITLE, PINCODE, PERSON_NAME, SiteNo, etc.), `Site` table was removed entirely, `PU`/`EQ`/`PM` lost SiteNo and other fields, and `sp_WOMain_Insert` signature changed. The approach is: (1) extend `IgxUserExtension` to own the person profile fields that Cedar no longer holds, (2) migrate existing data into it, (3) rewrite all affected queries, (4) re-verify the Cedar WO stored procedure.

**Tech Stack:** Node.js/Express, mssql (parameterized queries), MSSQL (SQL Server), Docker Compose

---

## Schema Diff Reference

Use this as the source of truth throughout all tasks.

### `Person` table — 16 columns REMOVED from new Cedar

| Column | Type (old) | Impact |
|---|---|---|
| `PERSON_NAME` | `nvarchar(200)` | Used as `fullName` in `req.user` and throughout. **Replacement:** `CONCAT(ISNULL(FIRSTNAME,''),' ',ISNULL(LASTNAME,''))` |
| `EMAIL` | `nvarchar(200)` | Auth, notifications, all controllers. **Move to `IgxUserExtension.email`** |
| `PHONE` | `nvarchar(30)` | Auth, controllers. **Move to `IgxUserExtension.phone`** |
| `TITLE` | `nvarchar(200)` | Auth, controllers. **Move to `IgxUserExtension.title_text`** (avoid reserved word) |
| `PINCODE` | `nvarchar(10)` | Auth. **Move to `IgxUserExtension.pincode`** |
| `SiteNo` | `int` | Auth JOIN to Site. **Drop — Site table removed (see below)** |
| `CREATEUSER` / `CREATEDATE` | — | Audit columns, no EDEN queries use these |
| `Host`,`Port`,`EnableSsl` | — | Unused by EDEN |
| `VendorNo`,`FLAGRESPONSE`,`DEPTWR`,`DEPTWO`,`FLAGWAITQUO` | — | Unused by EDEN |

Also: `PERSONCODE` shrunk from `nvarchar(20)` → `varchar(10)` NOT NULL in new.

### `Site` table — COMPLETELY REMOVED from new Cedar

- Old Cedar had `dbo.Site(SiteNo, SiteCode, SiteName, …)`.
- New Cedar: table does not exist.
- EDEN wrote `req.user.siteNo`, `siteCode`, `siteName` from it.
- **Resolution:** Drop `siteCode`/`siteName` from `req.user`. Add `site_name VARCHAR(50)` to `IgxUserExtension` if site display is needed (optional, low priority).

### `_secUsers` — `PersonAccessNo` column removed

- Old had column `PersonAccessNo INT`. New does not.
- EDEN does not SELECT it (confirmed by grep), but it must not appear in any INSERT.

### `Dept` — columns removed in new Cedar

| Column | Old | Impact |
|---|---|---|
| `SiteNo` | `int` | Used in `assetController.js`. Remove JOIN/filter. |
| `LineToken` | `nvarchar(max)` | Not queried by EDEN (confirmed by grep). No action. |
| `COSTCENTERNO`, `UserGroupNo`, `FLAGGENQUO` | — | Not queried by EDEN. No action. |
| `CREATEUSER`, `CREATEDATE` | — | Not queried by EDEN. No action. |

### `PU` table — columns removed in new Cedar

| Column | Old | Impact |
|---|---|---|
| `SiteNo` | `int` | Queried in some controllers |
| `TEXT1-3` | `nvarchar(100-200)` → `varchar(20)` | **Truncation risk** if writing |
| `PUREFCODE` | `nvarchar(50)` → `varchar(20)` | Truncation risk if writing |
| `CREATEUSER`, `CREATEDATE` | — | Not queried |
| Many others | — | Not queried by EDEN |

### `EQ` table — columns removed in new Cedar

| Column | Old | Impact |
|---|---|---|
| `SiteNo` | `int` | Used in EMS queries |
| `TEXT1-3` | `nvarchar(200)` → `varchar(20)` | **Truncation risk** |
| `EQCODE` | `nvarchar(50)` → `varchar(25)` NOT NULL | Truncation risk |
| `CREATEUSER`, `CREATEDATE` | — | Not queried |

### `PM` table — columns removed in new Cedar

| Column | Old | Impact |
|---|---|---|
| `SiteNo` | `int` | Used in calibration queries |
| `PMCODE` | `nvarchar(50)` → `varchar(25)` | Truncation risk |
| `CREATEUSER`, `CREATEDATE` | — | Not queried |

### `WO` table — columns changed in new Cedar

| Column | Old | New | Impact |
|---|---|---|---|
| `WFStatusCode` | `nvarchar(100)` | `varchar(3)` | EDEN writes `'10'`, `'30'`, `'50'` — all ≤ 3 chars. **Safe.** |
| `SiteNo` | `int` | **REMOVED** | Must remove from any WO INSERT/UPDATE |
| `ASSIGN_REMARK` | `nvarchar(1000)` | `varchar(255)` | Truncation risk |
| `WRCODE` | `varchar(100)` | `varchar(10)` | Truncation risk |
| Many approval/billing/TPM cols | various | **REMOVED** | Used by `cedarIntegrationService.js` (see Task 5) |

### `sp_WOMain_Insert` — signature changed

- Old: 80 parameters including `@SiteNo`, `@EQTypeNo`, `@FlagTPM`, `@TPMNo`, `@JsaType`, `@JsaNo`, `@FlagCleaningJobFinish`, etc.
- New: MCP returned 0 parameters — **needs verification** (likely MCP introspection limitation; actual SP may still exist with different params).

---

## Files Affected

| File | What changes |
|---|---|
| `backend/src/middleware/auth.js` | Remove Person cols, Site JOIN, add computed PERSON_NAME |
| `backend/src/controllers/authController.js` | Same query appears 3× (login, refresh, LINE login) |
| `backend/src/controllers/administrationController.js` | PERSON_NAME, EMAIL, PHONE references |
| `backend/src/controllers/personnelController.js` | PERSON_NAME, EMAIL, PHONE, SiteNo references |
| `backend/src/controllers/userController.js` | EMAIL, PHONE, TITLE references |
| `backend/src/controllers/userManagementController.js` | EMAIL, PHONE, TITLE, SiteNo, PINCODE, Site JOIN |
| `backend/src/controllers/ticketController.js` | PERSON_NAME, EMAIL, PHONE, TITLE references (many places) |
| `backend/src/controllers/ticketController/helpers.js` | PERSON_NAME, EMAIL references |
| `backend/src/controllers/workRequestController.js` | EMAIL, PHONE, SiteNo, TITLENO references |
| `backend/src/controllers/workflowController.js` | EMAIL, PHONE, TITLE references |
| `backend/src/controllers/assetController.js` | SiteNo filter, Site JOIN |
| `backend/src/controllers/backlogController.js` | WFStatusCode (read only — safe, no change needed) |
| `backend/src/controllers/workOrderController.js` | WFStatusCode (read only — safe, no change needed) |
| `backend/src/services/cedarIntegrationService.js` | sp_WOMain_Insert params, SiteNo in WO queries |
| `backend/src/services/dueDateNotificationService.js` | PERSON_NAME, EMAIL |
| `backend/src/services/pendingTicketNotificationService.js` | PERSON_NAME, EMAIL |
| `backend/src/services/finishedTicketReviewNotificationService.js` | PERSON_NAME, EMAIL |
| `backend/src/services/calibrationDueDateNotificationService.js` | PERSON_NAME, EMAIL |
| `backend/src/services/oldOpenTicketNotificationService.js` | PERSON_NAME, EMAIL |
| `backend/src/services/reviewEscalationNotificationService.js` | PERSON_NAME |
| `backend/src/helpers/pmCalibrationScheduleQuery.js` | May reference SiteNo, PM fields |
| `backend/src/helpers/calibrationEqTypeFromEqcode.js` | May reference EQ fields |

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

  // Copy email, phone, title, pincode from old Person into IgxUserExtension
  const result = await pool.request().query(`
    UPDATE ue
    SET
      ue.email      = COALESCE(ue.email,     p.EMAIL),
      ue.phone      = COALESCE(ue.phone,     p.PHONE),
      ue.title_text = COALESCE(ue.title_text, p.TITLE),
      ue.pincode    = COALESCE(ue.pincode,   p.PINCODE)
    FROM IgxUserExtension ue
    INNER JOIN _secUsers u ON ue.UserID = u.UserID
    INNER JOIN Person p    ON u.PersonNo = p.PERSONNO
    WHERE p.EMAIL IS NOT NULL
       OR p.PHONE IS NOT NULL
       OR p.TITLE IS NOT NULL
       OR p.PINCODE IS NOT NULL
  `);

  console.log(`Rows updated: ${result.rowsAffected[0]}`);

  // Verify
  const check = await pool.request().query(`
    SELECT COUNT(*) AS total FROM IgxUserExtension WHERE email IS NOT NULL
  `);
  console.log(`Users with email after migration: ${check.recordset[0].total}`);

  await pool.close();
}

run().catch(err => { console.error(err); process.exit(1); });
```

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

Verify N > 0. If 0, check that `.env` DB_SERVER points to old Cedar.

- [ ] **Step 4: Commit**

```bash
git add backend/script/migrate-person-data-to-extension.js
git commit -m "feat: migrate person profile fields (email/phone/title/pincode) to IgxUserExtension for Cedar new schema"
```

---

## Task 2: Fix the shared user SELECT query — auth middleware and authController

**Files:**
- Modify: `backend/src/middleware/auth.js:63-154`
- Modify: `backend/src/controllers/authController.js:210-265` (login query)
- Modify: `backend/src/controllers/authController.js:520-570` (LINE login query)
- Modify: `backend/src/controllers/authController.js:910-960` (refresh query)

The `authenticateToken` middleware and `authController` each contain their own copy of the Person+Site JOIN query. All three must be updated identically.

**The new canonical user SELECT** (replaces all three copies):

```sql
SELECT
  u.PersonNo,
  u.UserID,
  u.GroupNo,
  u.LevelReport,
  u.StoreRoom,
  u.DBNo,
  u.StartDate,
  u.LastDate,
  u.ExpireDate,
  u.NeverExpireFlag,
  ue.EmailVerified,
  ue.EmailVerificationToken,
  ue.EmailVerificationExpires,
  ue.LastLogin,
  ue.CreatedAt,
  ue.UpdatedAt,
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
  p.CRAFTNO,
  p.CREWNO,
  CONCAT(ISNULL(p.FIRSTNAME,''), ' ', ISNULL(p.LASTNAME,'')) AS PERSON_NAME,
  d.DEPTCODE,
  d.DEPTNAME
FROM _secUsers u
LEFT JOIN IgxUserExtension ue ON u.UserID = ue.UserID
LEFT JOIN _secUserGroups g    ON u.GroupNo = g.GroupNo
LEFT JOIN Person p            ON u.PersonNo = p.PERSONNO
LEFT JOIN Dept d              ON p.DEPTNO = d.DEPTNO
WHERE u.UserID = @userID AND (ue.IsActive = 1 OR ue.IsActive IS NULL)
```

Key changes from old query:
- Removed: `p.EMAIL`, `p.PHONE`, `p.TITLE`, `p.SiteNo`, `p.PINCODE`, `p.PERSON_NAME`
- Removed: `LEFT JOIN dbo.Site s ON p.SiteNo = s.SiteNo`
- Removed from SELECT: `s.SiteCode`, `s.SiteName`
- Added: `ue.email AS EMAIL`, `ue.phone AS PHONE`, `ue.title_text AS TITLE`, `ue.pincode AS PINCODE`
- Added: `CONCAT(ISNULL(p.FIRSTNAME,''), ' ', ISNULL(p.LASTNAME,'')) AS PERSON_NAME`

- [ ] **Step 1: Update `auth.js` middleware query**

In `backend/src/middleware/auth.js`, replace the entire SQL string inside `authenticateToken` (the `pool.request()...query(...)` block, roughly lines 63–113) with the canonical query above. Also update the `req.user` mapping block below it: remove `siteNo`, `siteCode`, `siteName` assignments (lines ~139–141).

Updated `req.user` block (remove the three site lines):
```js
req.user = {
  id: user.PersonNo,
  userId: user.UserID,
  username: user.UserID,
  personCode: user.PERSONCODE,
  firstName: user.FIRSTNAME,
  lastName: user.LASTNAME,
  fullName: user.PERSON_NAME,
  email: user.EMAIL,
  phone: user.PHONE,
  title: user.TITLE,
  department: user.DEPTNO,
  departmentCode: user.DEPTCODE,
  departmentName: user.DEPTNAME,
  craft: user.CRAFTNO,
  crew: user.CREWNO,
  groupNo: user.GroupNo,
  groupCode: user.UserGCode,
  groupName: user.UserGName,
  levelReport: user.LevelReport,
  permissionLevel: user.LevelReport,
  storeRoom: user.StoreRoom,
  dbNo: user.DBNo,
  lineId: user.LineID,
  avatarUrl: user.AvatarUrl,
  lastLogin: user.LastLogin,
  createdAt: user.CreatedAt,
  pinCode: user.PINCODE,
};
```

- [ ] **Step 2: Apply same query to `authController.js` login path (~line 210)**

Find the block in the `login` function that reads `p.EMAIL, p.PHONE, p.TITLE, p.SiteNo, p.PINCODE, p.PERSON_NAME` and `LEFT JOIN dbo.Site s ON p.SiteNo = s.SiteNo`. Replace with the canonical query. Remove site-related result mappings from the returned user object.

- [ ] **Step 3: Apply same query to `authController.js` LINE login path (~line 520)**

Same as Step 2. Find the second copy of the same query and replace.

- [ ] **Step 4: Apply same query to `authController.js` refresh path (~line 910)**

Same as Step 2. Find the third copy and replace.

- [ ] **Step 5: Start backend and test login**

```bash
cd backend
npm run dev
```

Test:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"<valid_user>","password":"<valid_pass>"}'
```

Expected: `{"success":true,"data":{"token":"...","user":{...}}}` with no `siteCode`/`siteName` fields, but with `email`, `phone`, `title`, `fullName` present.

- [ ] **Step 6: Commit**

```bash
git add backend/src/middleware/auth.js backend/src/controllers/authController.js
git commit -m "fix: update auth queries for new Cedar schema (remove Site JOIN, source profile from IgxUserExtension)"
```

---

## Task 3: Fix Person queries in userManagementController and userController

**Files:**
- Modify: `backend/src/controllers/userManagementController.js:55-200`
- Modify: `backend/src/controllers/userController.js:265-275`

- [ ] **Step 1: Fix `userManagementController.js` first user query (~line 55)**

Find the SELECT that includes `p.EMAIL, p.PHONE, p.TITLE, p.SiteNo, p.PINCODE` and `LEFT JOIN dbo.Site s ON p.SiteNo = s.SiteNo`. Replace with:

```sql
ue.email      AS EMAIL,
ue.phone      AS PHONE,
ue.title_text AS TITLE,
ue.pincode    AS PINCODE,
CONCAT(ISNULL(p.FIRSTNAME,''), ' ', ISNULL(p.LASTNAME,'')) AS PERSON_NAME,
```

Remove the `LEFT JOIN dbo.Site s ON p.SiteNo = s.SiteNo` line and any `s.SiteCode`, `s.SiteName` references. Remove `p.SiteNo`.

- [ ] **Step 2: Fix `userManagementController.js` second query (~line 178)**

Same changes as Step 1 for the second copy of the query in this file.

- [ ] **Step 3: Fix `userController.js` (~line 269)**

Replace `p.EMAIL, p.PHONE, p.TITLE` with `ue.email AS EMAIL, ue.phone AS PHONE, ue.title_text AS TITLE`. Ensure `IgxUserExtension ue` is already joined (it should be). If not, add: `LEFT JOIN IgxUserExtension ue ON u.UserID = ue.UserID`.

- [ ] **Step 4: Test user management endpoint**

```bash
curl http://localhost:3001/api/users/management \
  -H "Authorization: Bearer <token>"
```

Expected: `{"success":true,"data":[...]}` with user email/phone fields populated from `IgxUserExtension`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/userManagementController.js backend/src/controllers/userController.js
git commit -m "fix: source email/phone/title from IgxUserExtension in user management controllers"
```

---

## Task 4: Fix Person queries in ticket and ticket helpers

**Files:**
- Modify: `backend/src/controllers/ticketController.js` (lines 276, 1125, 2099, 3114, 3120, 4623, 4712–4725)
- Modify: `backend/src/controllers/ticketController/helpers.js` (lines 460, 479)

These queries read `p.PERSON_NAME`, `p.EMAIL`, `p.PHONE`, `p.TITLE` from `Person`.

- [ ] **Step 1: Fix all Person SELECT references in `ticketController.js`**

For each query block that selects from `Person p`, apply these substitutions:

Replace:
```sql
p.PERSON_NAME
p.EMAIL
p.PHONE
p.TITLE
```

With:
```sql
CONCAT(ISNULL(p.FIRSTNAME,''), ' ', ISNULL(p.LASTNAME,'')) AS PERSON_NAME
ue.email      AS EMAIL
ue.phone      AS PHONE
ue.title_text AS TITLE
```

For each such query, ensure there is a `LEFT JOIN IgxUserExtension ue ON u.UserID = ue.UserID` (where `u` is `_secUsers` joined on `PersonNo = u.PersonNo`). In many ticket queries, `IgxUserExtension` is already joined via `ue`; for those that join `Person p` directly without going through `_secUsers`, use:

```sql
LEFT JOIN _secUsers su       ON p.PERSONNO = su.PersonNo
LEFT JOIN IgxUserExtension ue ON su.UserID = ue.UserID
```

Confirm alias names match surrounding query context in each case.

- [ ] **Step 2: Fix `ticketController/helpers.js` lines 460 and 479**

Both are `SELECT p.PERSONNO, p.PERSON_NAME, p.EMAIL, ...` subqueries. Replace as in Step 1.

- [ ] **Step 3: Test ticket creation and viewing**

```bash
# Create a ticket
curl -X POST http://localhost:3001/api/tickets \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"test","description":"test","puno":1}'

# View ticket
curl http://localhost:3001/api/tickets/<id> \
  -H "Authorization: Bearer <token>"
```

Expected: Ticket returns `reporter_name`, `assignee_name` etc. with actual names, not null.

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/ticketController.js backend/src/controllers/ticketController/helpers.js
git commit -m "fix: replace Person.PERSON_NAME/EMAIL/PHONE with IgxUserExtension equivalents in ticket controller"
```

---

## Task 5: Fix Person queries in remaining controllers

**Files:**
- Modify: `backend/src/controllers/administrationController.js`
- Modify: `backend/src/controllers/personnelController.js`
- Modify: `backend/src/controllers/workRequestController.js`
- Modify: `backend/src/controllers/workflowController.js`

- [ ] **Step 1: Fix `administrationController.js`**

Multiple queries use `per.PERSON_NAME`, `per.EMAIL`, `per.PHONE` (lines 37, 55, 73, 74, 104, 157, 1010, 1015, 1018). Apply the same pattern as Task 4: replace `per.PERSON_NAME` with the CONCAT alias, replace `per.EMAIL`/`per.PHONE` with `ue.email`/`ue.phone`, add the `_secUsers`+`IgxUserExtension` join if not present.

For the queries that already join `_secUsers` (check context), add:
```sql
LEFT JOIN IgxUserExtension ue ON u.UserID = ue.UserID
```

For queries that only join `Person per` without going through `_secUsers`, add:
```sql
LEFT JOIN _secUsers su ON per.PERSONNO = su.PersonNo
LEFT JOIN IgxUserExtension ue ON su.UserID = ue.UserID
```

- [ ] **Step 2: Fix `personnelController.js`**

References `p.PERSON_NAME`, `p.EMAIL`, `p.PHONE`, `p.SiteNo` (lines 25, 71, 120, 348, 396, 586, 587, 596). Apply same pattern. Remove `p.SiteNo` references (no replacement needed unless the controller returns site info — if so, return `null`).

- [ ] **Step 3: Fix `workRequestController.js`**

References `p.EMAIL`, `p.PHONE`, `p.SiteNo`, `p.TITLENO` (lines 25–29). 
- `EMAIL`/`PHONE` → IgxUserExtension
- `SiteNo` → remove or return null
- `TITLENO` still exists in new `Person` table — no change needed

- [ ] **Step 4: Fix `workflowController.js`**

References `fp.EMAIL`, `fp.PHONE`, `fp.TITLE`, `rp.EMAIL`, etc. (lines 197–211, 323–337 — three-alias pattern: `fp` = from person, `rp` = receive person, `ap` = approved person). For each person alias, add a corresponding `IgxUserExtension` join with a distinct alias:

```sql
LEFT JOIN _secUsers su_fp      ON fp.PERSONNO = su_fp.PersonNo
LEFT JOIN IgxUserExtension uef ON su_fp.UserID = uef.UserID
-- then use uef.email AS FromPersonEmail, uef.phone AS FromPersonPhone, uef.title_text AS FromPersonTitle
```

Repeat for `rp` (alias `uer`) and `ap` (alias `uea`).

- [ ] **Step 5: Test each affected endpoint**

```bash
# Administration
curl http://localhost:3001/api/administration/approvers \
  -H "Authorization: Bearer <token>"

# Personnel
curl http://localhost:3001/api/personnel \
  -H "Authorization: Bearer <token>"

# Work requests
curl http://localhost:3001/api/workrequest \
  -H "Authorization: Bearer <token>"
```

Expected: All return `{"success":true}` with no SQL errors.

- [ ] **Step 6: Commit**

```bash
git add backend/src/controllers/administrationController.js \
        backend/src/controllers/personnelController.js \
        backend/src/controllers/workRequestController.js \
        backend/src/controllers/workflowController.js
git commit -m "fix: update Person queries in administration/personnel/workRequest/workflow controllers"
```

---

## Task 6: Fix Person queries in notification services

**Files:**
- Modify: `backend/src/services/dueDateNotificationService.js`
- Modify: `backend/src/services/pendingTicketNotificationService.js`
- Modify: `backend/src/services/finishedTicketReviewNotificationService.js`
- Modify: `backend/src/services/calibrationDueDateNotificationService.js`
- Modify: `backend/src/services/oldOpenTicketNotificationService.js`
- Modify: `backend/src/services/reviewEscalationNotificationService.js`

All services query `p.PERSON_NAME`, `p.EMAIL` (or `ue.LineID` via IgxUserExtension which is already joined in most cases).

- [ ] **Step 1: Fix each service**

Pattern for each file — find any `p.PERSON_NAME` or `p.EMAIL` reference and apply:
- `PERSON_NAME` → `CONCAT(ISNULL(p.FIRSTNAME,''),' ',ISNULL(p.LASTNAME,'')) AS PERSON_NAME`
- `p.EMAIL` → `ue.email AS EMAIL`

Most services already join `IgxUserExtension ue ON u.UserID = ue.UserID`. For those that don't, add the join.

Check `calibrationDueDateNotificationService.js:195` specifically — it selects `p.PERSON_NAME AS AssigneeName`, replace with `CONCAT(ISNULL(p.FIRSTNAME,''), ' ', ISNULL(p.LASTNAME,'')) AS AssigneeName`.

- [ ] **Step 2: Test notification worker manually**

```bash
cd backend
node -e "
  require('dotenv').config({ path: '.env' });
  const svc = require('./src/services/pendingTicketNotificationService');
  svc.sendPendingTicketNotifications().then(r => console.log('OK', r)).catch(console.error);
"
```

Expected: Runs without SQL errors. May send 0 notifications if no pending tickets.

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/dueDateNotificationService.js \
        backend/src/services/pendingTicketNotificationService.js \
        backend/src/services/finishedTicketReviewNotificationService.js \
        backend/src/services/calibrationDueDateNotificationService.js \
        backend/src/services/oldOpenTicketNotificationService.js \
        backend/src/services/reviewEscalationNotificationService.js
git commit -m "fix: update PERSON_NAME and EMAIL references in notification services for new Cedar schema"
```

---

## Task 7: Fix `assetController.js` — remove Site JOIN and SiteNo filter

**Files:**
- Modify: `backend/src/controllers/assetController.js` (lines ~94, 137, 344, 358, 487, 499, 603)

The asset controller joins `Site s ON p.SiteNo = s.SiteNo` and filters by `p.SiteNo = @siteNo`.

- [ ] **Step 1: Remove Site JOIN and SiteNo filter from all queries**

For each occurrence:
- Remove `LEFT JOIN Site s ON p.SiteNo = s.SiteNo`
- Remove any SELECT of `s.SiteCode`, `s.SiteName`
- Remove `AND p.SiteNo = @siteNo` WHERE conditions (or make them no-ops if the filter must remain — return all records regardless of site since there's no Site data)
- Remove any `request.input('siteNo', ...)` parameter bindings for those queries

If the API currently accepts a `siteNo` query param used only for this filter, it can be silently ignored until a future phase.

- [ ] **Step 2: Test asset endpoints**

```bash
curl http://localhost:3001/api/assets \
  -H "Authorization: Bearer <token>"
```

Expected: Returns records without SQL errors. If previously filtered by site, may now return more records — that is expected.

- [ ] **Step 3: Commit**

```bash
git add backend/src/controllers/assetController.js
git commit -m "fix: remove Site table JOIN and SiteNo filter from assetController (Site table removed in new Cedar)"
```

---

## Task 8: Investigate and fix `sp_WOMain_Insert` in Cedar integration

**Files:**
- Modify: `backend/src/services/cedarIntegrationService.js`

The old `sp_WOMain_Insert` had 80 parameters. New Cedar returned 0 parameters — this needs direct verification before code changes.

- [ ] **Step 1: Verify the new SP signature via raw query**

Run this against new Cedar to get the actual parameter list:

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

Use the MCP tool:
```
mcp__cedar_new__execute_read_query with the SQL above
```

Expected: Returns the actual parameter list. Compare against old (80 params).

- [ ] **Step 2: Load the read query MCP tool**

```
ToolSearch: select:mcp__cedar_new__execute_read_query
```

Then run the query from Step 1 against new Cedar.

- [ ] **Step 3: Map old params to new params**

Key params that may have been removed (based on WO table column removals):
- `@SiteNo` — likely removed (SiteNo removed from WO)
- `@EQTypeNo` — likely removed
- `@FlagTPM`, `@TPMNo` — likely removed
- `@JsaType`, `@JsaNo` — likely removed
- `@FlagCleaningJobFinish*` — likely removed
- `@FlagHandoverOper*` — likely removed
- `@FlagSafety`, `@FlagEnvironment` — check

In `cedarIntegrationService.js`, the `setWorkOrderParameters` method (~line 485) sets all 80 params. Remove any `request.input(...)` calls for params that no longer exist in the new SP.

- [ ] **Step 4: Update `setWorkOrderParameters` in `cedarIntegrationService.js`**

After confirming the new SP signature, update `setWorkOrderParameters` to only set the parameters that exist in the new SP. Wrap removed params in a conditional or simply delete them.

Likely safe to remove (based on removed WO columns):
```js
// REMOVE these request.input calls:
// request.input('@SiteNo', sql.Int, woData.siteNo);
// request.input('@EQTypeNo', sql.Int, woData.eqTypeNo);
// request.input('@FlagTPM', sql.NVarChar, woData.flagTPM);
// request.input('@TPMNo', sql.Int, woData.tpmNo);
// request.input('@JsaType', sql.Int, woData.jsaType);
// request.input('@JsaNo', sql.NVarChar, woData.jsaNo);
// request.input('@FlagCleaningJobFinish', sql.NVarChar, ...);
// request.input('@FlagCleaningJobFinishNotReq', sql.NVarChar, ...);
// request.input('@FlagHandoverOper', sql.NVarChar, ...);
// request.input('@FlagHandoverOperNotReq', sql.NVarChar, ...);
```

- [ ] **Step 5: Test WO creation via Cedar integration**

Use a test ticket that is in "accepted" state and call the Cedar sync:

```bash
curl -X POST http://localhost:3001/api/cedar-integration/sync/<ticketId> \
  -H "Authorization: Bearer <token>"
```

Expected: `{"success":true,"data":{"wono": <new_wo_number>}}` — a WO is created in Cedar.

- [ ] **Step 6: Commit**

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

- [ ] **Step 1: Audit calibration helpers for removed columns**

Read both helper files and look for any reference to:
- `PM.SiteNo` / `pm.SiteNo`
- `EQ.SiteNo` / `eq.SiteNo`
- `PM.EQTypeNo`
- `PM.CREATEUSER`, `PM.CREATEDATE`
- `EQ.TEXT1` / `EQ.TEXT2` / `EQ.TEXT3` (now varchar(20), truncation risk on write)

```bash
grep -n "SiteNo\|EQTypeNo\|CREATEDATE\|CREATEUSER" backend/src/helpers/pmCalibrationScheduleQuery.js
grep -n "SiteNo\|EQTypeNo\|CREATEDATE\|CREATEUSER" backend/src/controllers/calibrationController.js
```

- [ ] **Step 2: Remove SiteNo filter / JOIN from PM and EQ queries**

For each occurrence:
- Remove `AND pm.SiteNo = @siteNo` or `AND eq.SiteNo = @siteNo`
- Remove corresponding `request.input('siteNo', ...)` if only used for this filter
- Remove `pm.CREATEUSER`, `pm.CREATEDATE` from any SELECT (these columns are gone)

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
- Modify: `backend/src/config/dbConfig.js` (if needed)

- [ ] **Step 1: Update DB connection env vars to point to new Cedar**

In `backend/.env` (local dev) or `backend/.env.production`:

```
DB_SERVER=<new-cedar-server-ip-or-hostname>
DB_NAME=CEDAR
DB_USER=<user>
DB_PASSWORD=<password>
DB_PORT=1433
DB_INSTANCE=       # leave blank if no named instance
```

The new Cedar DB name is `CEDAR` (confirmed from MCP — old was `Cedar6_Mars`).

- [ ] **Step 2: Restart backend and run health check**

```bash
# Restart Docker dev stack
docker compose -f docker-compose.local.yml up backend --build

# Health check
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

- [ ] **Step 4: Commit**

Do NOT commit `.env` files (they are gitignored). Update `.env.example` or document the change:

```bash
git add backend/src/config/dbConfig.js   # only if changed
git commit -m "docs: update DB_NAME to CEDAR for new Cedar schema cutover"
```

---

## Task 11: Smoke test all affected endpoints

**Files:** No code changes — this is a verification task.

- [ ] **Step 1: Test auth flow end-to-end**

Login → verify token → call protected endpoint:
```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"<user>","password":"<pass>"}' | jq -r '.data.token')

curl http://localhost:3001/api/users/profile \
  -H "Authorization: Bearer $TOKEN"
```

Expected: Profile returns `email`, `phone`, `fullName`.

- [ ] **Step 2: Test ticket lifecycle**

Create → Accept → Plan → Start → Finish (each step should trigger Cedar sync and notification queue).

- [ ] **Step 3: Test notification worker**

```bash
cd backend && npm run worker &
npm run queue:check
```

Expected: No failed jobs. Scheduled jobs fire without SQL errors.

- [ ] **Step 4: Test calibration schedule page**

Open `http://localhost/ems/schedule` in browser (via Docker). Expected: Schedule loads with equipment list.

- [ ] **Step 5: Log any remaining SQL errors**

Check backend logs for `Invalid column name` or `Invalid object name` errors. Each one maps to a missed query — fix inline and commit.

- [ ] **Step 6: Final commit**

```bash
git add -p   # review any remaining fixes
git commit -m "fix: resolve remaining Cedar new schema SQL errors found during smoke test"
```

---

## Cutover Checklist

Run these steps in order on the day of Cedar DB cutover:

- [ ] Run Task 1 migration script against **old Cedar** (before switching connection string)
- [ ] Verify email count > 0 in `IgxUserExtension`
- [ ] Update `.env.production` to point to new Cedar (`DB_NAME=CEDAR`, new server)
- [ ] Restart backend container: `docker compose -f docker-compose.deploy.yml up backend -d`
- [ ] Test `/api/auth/login` returns valid user with email populated
- [ ] Test one ticket status change fires Cedar WO sync without error
- [ ] Monitor backend logs for 15 minutes for any `Invalid column name` errors
