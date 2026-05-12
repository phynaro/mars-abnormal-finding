# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EDEN Abnormal Finding** — a CMMS (Computerized Maintenance Management System) for plant operations. Workers report abnormal findings as tickets; engineers and managers triage, assign, plan, and close them. Integrates with LINE messaging for push notifications and the external Cedar CMMS.

## Commands

### Backend (Node.js/Express — plain JS)
```bash
cd backend
npm run dev          # nodemon on src/app.js, port 3001
npm run worker       # BullMQ notification worker (separate process)
npm run validate-api # validate OpenAPI/Swagger spec
```

### Frontend (React/TypeScript/Vite)
```bash
cd frontend
npm run dev          # Vite dev server, port 5173
npm run lint         # ESLint
npm run build        # production build
```

### Docker (local dev with pre-built images)
```bash
docker compose up    # uses GHCR images defined in docker-compose.yml
```

Backend env: `backend/.env.development`  
Frontend env: `frontend/.env.development`

## Architecture

### Request Flow
Nginx (80/443) → `/api/*` proxied to backend:3001, `/*` served from frontend container.

In local dev without Docker, set `VITE_API_URL=http://localhost:3001/api` in frontend env.

### Backend Structure
```
src/
  app.js              # Express setup, route mounting, scheduled job init
  routes/<resource>.js          # Route definitions with Swagger JSDoc
  controllers/<resource>Controller.js   # Business logic
  controllers/ticketController/  # ticketController is split into a folder
    index.js / helpers.js        # helpers extracted for reuse
  middleware/
    auth.js           # authenticateToken, requirePermissionLevel, requireFormPermission
    upload.js         # multer config
  services/           # External integrations (LINE, email via Resend, Cedar)
  queues/             # BullMQ producers (notificationQueue.js)
  workers/            # BullMQ consumers (notificationWorker.js — separate process)
  jobs/               # node-cron scheduled jobs (5 notification schedules)
  config/
    dbConfig.js       # MSSQL pool config from env vars
    swagger.js        # swagger-jsdoc/swagger-ui-express setup
```

**API response shape** — all controllers return:
```js
{ success: boolean, data?: any, message: string }
```

**Database access** — always `sql.connect(dbConfig)` at the top of each controller function (no shared pool on `req`). Use parameterized queries via `request.input('name', sql.Type, value)`.

### Backend Auth & Permissions
- `authenticateToken` middleware validates JWT, fetches full user from DB, attaches to `req.user`
- `req.user.levelReport` — numeric permission level (1 = L1 Operator, 2 = L2 Engineer, 3 = L3 Manager)
- `requirePermissionLevel(n)` — route-level minimum level guard
- `requireFormPermission(formId, action)` — granular form-based permission from DB table

### Frontend Structure
```
src/
  App.tsx             # Router + provider tree + all route declarations
  contexts/           # AuthContext, ThemeContext, LanguageContext, ToastContext
  services/
    api.ts            # Base ApiService class (typed fetch wrapper with auth headers)
    <domain>Service.ts  # One service per domain, wraps api.ts
  components/
    common/           # PermissionRoute, Loading, AccessDenied, etc.
    ui/               # shadcn/ui-style primitives (Button, Dialog, etc.)
    layout/           # Layout, sidebar, navbar
    <domain>/         # Feature-specific components grouped by domain
  pages/<domain>/     # Page components — thin, delegate to components/services
  utils/
    permissionChecker.ts   # Frontend permission utility (see note below)
    authHeaders.ts         # Injects Bearer token into fetch calls
```

**Provider order** (outer → inner):  
`ThemeProvider` → `LanguageProvider` → `AuthProvider` → `ToastProvider`

**Route protection**:
- `ProtectedRoute` — redirects to `/login` if not authenticated
- `PermissionRoute` — wraps routes needing elevated access; uses `checkPermission(personNo, type)`

**Important**: `frontend/src/utils/permissionChecker.ts` uses **hardcoded PersonNo arrays** (`ADMIN_USERS`, `MANAGER_USERS`) for frontend-side access control. When adding a new admin/manager, update these arrays. Backend permission middleware is the authoritative enforcement layer.

**i18n**: Translation strings live inline in `LanguageContext.tsx` as a `translations` object (en/th). Access with `const { t } = useLanguage()` then `t('key')`. Add new keys to both `en` and `th` blocks.

**Styling**: Always use `cn()` from `@/lib/utils` for conditional class merging. All UI built with Radix UI primitives + Tailwind; no inline styles.

### Notification System
Ticket status changes enqueue jobs to Redis via `notificationQueue.js` (BullMQ producer). The **notification worker** (`npm run worker`) must be running as a separate process to actually send LINE/email notifications. Five cron jobs (initialized in `app.js` on startup) send scheduled reminders for pending/overdue/due-date tickets; each can be disabled via env var (e.g., `ENABLE_PENDING_TICKET_NOTIFICATIONS=false`).

### LINE Integration
Users link their LINE account to their CMMS account. `lineService.js` + `services/line/` handle flex message construction. LINE LIFF is initialized in `AuthContext` for the frontend web app login flow. LINE credentials (`LINE_CHANNEL_ACCESS_TOKEN`, `LIFF_ID`, etc.) are required in backend env for notifications to work.

### File Uploads
multer processes uploads; files stored in `backend/uploads/` (Docker volume `mars_upload_data`). Images resized with `sharp`. Served at `/uploads/<filename>` by Express static middleware.

### CI/CD
GitHub Actions (`.github/workflows/`):
- `ci.yml` — builds and pushes Docker images to GHCR on push/PR to `main`
- `deploy-staging.yml` — deploys to staging
- `promote-prod.yml` — promotes staging image to production

Image tags use the commit SHA: `ghcr.io/<owner>/frontend:sha-<sha>`.
