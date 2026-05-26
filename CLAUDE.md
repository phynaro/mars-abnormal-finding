# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EDEN** — a CMMS (Computerized Maintenance Management System) for plant operations. The core module (**Abnormality Handling / EDEN**) lets workers report abnormal findings as tickets; engineers and managers triage, assign, plan, and close them. A second module (**EMS — Equipment Management System**) is under active development to track instrument calibration. Both run inside the same frontend/backend application, accessed via Cloudflare Tunnel (dev/staging: `pch.trazor.cloud`). Target production environment is an Ubuntu Desktop + Docker setup with **no internet access** — no Cloudflare, no LINE LIFF. LINE notifications in production will be replaced with Power Automate (Microsoft 365 outbound).

The system reads/writes to an **external Cedar CMMS MSSQL database**. There are two Cedar versions: the old schema (current live) and a newer migrated schema with changed table structures. Always clarify which Cedar version is being targeted before touching Cedar-sourced queries.

## Commands

### Local Development (primary workflow)
```bash
# Build and run everything with hot-reload source mounts
docker compose -f docker-compose.local.yml up --build

# Backend uses ./backend/.env (not .env.development) when running via docker-compose.local.yml
# Frontend env is baked into the compose file (VITE_API_URL=/api, VITE_LIFF_ID=...)
```

### Backend (Node.js/Express — plain JS)
```bash
cd backend
npm run dev          # nodemon on src/app.js, port 3001
npm run worker       # BullMQ notification worker (must run as separate process)
npm run validate-api # validate OpenAPI/Swagger spec

# Queue management scripts (useful when debugging stuck jobs)
npm run queue:check
npm run queue:failed
npm run queue:failed:retry
```

### Frontend (React/TypeScript/Vite)
```bash
cd frontend
npm run dev          # Vite dev server, port 5173
npm run lint         # ESLint
npm run build        # production build
```

### Docker compose files
| File | Purpose |
|---|---|
| `docker-compose.local.yml` | **Local dev** — builds images locally, mounts src for hot-reload, includes Redis |
| `docker-compose.yml` | Pulls GHCR pre-built images (dev/staging) |
| `docker-compose.deploy.yml` | Deploys locally-tagged images to production |
| `docker-compose.production.yml` | Production image composition |

Backend env: `backend/.env` (local dev) or `backend/.env.development` / `backend/.env.production`  
API docs: `http://localhost:3001/api-docs` | Health: `http://localhost:3001/api/health`

## Architecture

### Request Flow
Nginx (80/443) → `/api/*` proxied to backend:3001, `/*` served from frontend container.

In local dev without Docker, set `VITE_API_URL=http://localhost:3001/api` in frontend env.

### Backend Structure
```
src/
  app.js              # Express setup, route mounting, scheduled job init
  routes/<resource>.js
  controllers/<resource>Controller.js
  controllers/ticketController/   # split into folder
    index.js / helpers.js         # helpers extracted for shared use
  middleware/
    auth.js           # authenticateToken, requirePermissionLevel, requireFormPermission
    upload.js         # multer config (10MB limit, sharp resize)
  services/           # External integrations: LINE, email (Resend), Cedar CMMS
  queues/             # BullMQ producer: notificationQueue.js
  workers/            # BullMQ consumer: notificationWorker.js (separate process)
  jobs/               # node-cron scheduled jobs (6 cron notification jobs)
  config/
    dbConfig.js       # MSSQL pool — supports DB_INSTANCE env var for named instances
    swagger.js
```

**API response shape** — all controllers return:
```js
{ success: boolean, data?: any, message: string }
```

**Database access** — always `sql.connect(dbConfig)` at the top of each controller function. Never share a pool on `req`. Use parameterized queries via `request.input('name', sql.Type, value)`.

### Backend Auth & Permissions

`authenticateToken` middleware validates JWT, fetches the full user record from DB, and attaches to `req.user`. The user object includes:

- `req.user.levelReport` — numeric level (1 = L1 Operator, 2 = L2 Engineer, 3 = L3 Manager)
- `req.user.groupCode` — group code string (e.g. `ADMIN`, `MP`, `ME`, `MT`, `MM`, `MA`, `OP`, `OS`, `ST`, `SP`)

Middleware available in `middleware/auth.js`:
- `requirePermissionLevel(n)` — minimum `levelReport` guard
- `requireGroup(allowedGroups)` — match against `groupCode`
- `requireFormPermission(formId, action)` — granular per-form permission from DB
- `requireDeleteTicketPermission` — allows if TKT delete permission OR ticket creator
- Named group shorthands: `requireAdmin`, `requireMaintenancePlanner`, `requireOperation`, etc.

### Ticket Lifecycle

Tickets flow through these BullMQ job names on status change:  
`create-ticket` → `accept-ticket` → `plan-ticket` → `start-ticket` → `finish-ticket` → `reviewed-ticket` → `close-ticket`  
Side transitions: `reject-ticket`, `escalate-ticket`, `reassign-ticket`, `reopen-ticket`, `status-update-ticket`, `assignment-ticket`

Scheduled jobs enqueue: `schedule-pending-tickets`, `schedule-due-date`, `schedule-old-open-tickets`, `schedule-finished-ticket-review`, `schedule-review-escalation`, `schedule-calibration-due-date`

Each cron job can be disabled via env var (e.g., `ENABLE_PENDING_TICKET_NOTIFICATIONS=false`). All 6 jobs are initialized in `app.js` on startup.

### Frontend Structure
```
src/
  App.tsx             # Router + provider tree + all route declarations
  contexts/           # AuthContext, ThemeContext, LanguageContext, ToastContext
  services/
    api.ts            # Base ApiService class (typed fetch wrapper with auth headers)
    <domain>Service.ts
  components/
    common/           # PermissionRoute, Loading, AccessDenied
    ui/               # shadcn/ui-style primitives (Button, Dialog, etc.)
    layout/           # Layout, sidebar, BottomNavigation
    <domain>/         # Feature components grouped by domain
  pages/<domain>/     # Page components — thin, delegate to components/services
  utils/
    permissionChecker.ts   # Hardcoded PersonNo arrays (ADMIN_USERS, MANAGER_USERS)
    authHeaders.ts         # Injects Bearer token into fetch calls
```

**Provider order** (outer → inner):  
`ThemeProvider` → `LanguageProvider` → `AuthProvider` → `ToastProvider`

**Route protection**:
- `ProtectedRoute` — redirects to `/login` if not authenticated
- `PermissionRoute` — uses `checkPermission(personNo, type)` from `permissionChecker.ts`

**Important**: `permissionChecker.ts` uses **hardcoded PersonNo arrays** for frontend-only access control. When adding a new admin or manager user, update these arrays. Backend middleware is the authoritative enforcement layer.

**i18n**: Translation strings live inline in `LanguageContext.tsx` as `translations` object (en/th). Access with `const { t } = useLanguage()`. Add new keys to both `en` and `th` blocks.

**Styling**: Always use `cn()` from `@/lib/utils` for conditional class merging. All UI built with Radix UI primitives + Tailwind. No inline styles.

**Charts**: ECharts (`echarts-for-react`), Recharts, and `react-calendar-heatmap` are all in use.

### Notification System

Ticket status changes enqueue BullMQ jobs via `notificationQueue.js`. The **notification worker** (`npm run worker`) must run as a separate process — it is NOT part of the backend server. Redis is required (`REDIS_URL` env var, defaults to `redis://localhost:6379`). If Redis is unavailable, notifications are silently skipped (graceful degradation).

**Notification channels:**
- **LINE push messages** — flex message templates in `services/line/` and `services/abnormalFindingFlexService.js`. Requires `LINE_CHANNEL_ACCESS_TOKEN`.
- **Email** — sent via Resend API (`emailService.js`).
- **Power Automate** — used when deployed offline at customer site (no internet LINE API access). Already implemented.

### Cedar CMMS Integration

`services/cedarIntegrationService.js` creates Work Orders in Cedar by calling the stored procedure `sp_WOMain_Insert`. The system currently reads and writes to the same MSSQL database via `dbConfig.js`.

**Schema migration risk**: Cedar has been migrated from an older schema to a newer version at the customer site. Column names and table structures differ. Before writing any Cedar-sourced query, verify against the actual Cedar schema version in use. Tables in use include `_secUsers`, `_secUserGroups`, `Person`, `Dept`, `Site`, `IgxTickets`, and Cedar native tables (`dbo.EQ`, `dbo.PM`, `dbo.WO`).

### EMS Module (Under Development)

Equipment Management System for calibration tracking. Spec at `ems/docs/EMS_Phase1_Spec.md`. Equipment data (1,228 records) is in `ems/resources/equipment_list.xlsx` for one-time import.

**New DB tables**: `IgxEquipment`, `IgxEmsUserRole`, `IgxEmsManagerArea`  
**EMS roles** (separate from `levelReport`): `calibrator`, `am`, `plant_manager`  
**Routes**: `/ems/*` in frontend, `/api/ems/*` in backend  
**File layout** to follow when building: `routes/ems.js`, `controllers/ems/`, `services/ems/`, `pages/ems/`, `components/ems/`  
**Phase 1 is read-only**: equipment registry, dashboard, schedule view, notifications. No WO write-back to Cedar yet.

### File Uploads

multer processes uploads; files stored in `backend/uploads/` (Docker volume `mars_upload_data`). Images resized with `sharp`. Served at `/uploads/<filename>` by Express static middleware. **No backup strategy exists** — uploads are at risk if the volume is lost.

### CI/CD

GitHub Actions (`.github/workflows/`):
- `ci.yml` — builds and pushes Docker images to GHCR on push/PR to `main`
- `deploy-staging.yml` — deploys to staging
- `promote-prod.yml` — promotes staging image to production

Image tags use the commit SHA: `ghcr.io/<owner>/frontend:sha-<sha>`.
