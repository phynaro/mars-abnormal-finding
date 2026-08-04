# Local Preview Compose — Built Frontend + Hot-Reload Backend

**Date:** 2026-08-01  
**Status:** Approved design  
**Goal:** Customer-facing local preview with a fast static frontend, while keeping the existing local backend/worker/redis hot-reload workflow.

## Problem

`docker-compose.local.yml` runs the frontend with Vite (`npm run dev`). That is slow for customer demos. Production/deploy compose files serve a built frontend but also switch the backend to production images (no hot reload, no redis/worker parity with local).

## Decision

Add a new compose file that clones the local stack and only changes how the frontend is built and served.

| Concern | Choice |
|---|---|
| Approach | New file `docker-compose.local-preview.yml` (not an override, not deploy.yml) |
| Frontend | Multi-stage `frontend/Dockerfile` → nginx serves `dist` on port 3000 |
| Frontend updates | Rebuild image when needed (`up --build frontend`) — option A |
| Build mode | `NODE_ENV=production` → `npm run build:prod` |
| Vite bake-ins | `VITE_API_URL=/api`, `VITE_LIFF_ID=2008351084-nRdr4kE4` (same as local) |
| Backend / worker | Same as local: `mars-backend:local`, `npm run dev` / worker command, source mounts |
| DB | Same as local: `env_file: ./backend/.env` + override `DB_NEW_SERVER=192.168.0.208`, `DB_NEW_INSTANCE=` |
| Edge proxy | Reuse `nginx-local-dev.conf` (proxies `/` → `frontend:3000`; HMR headers are harmless) |
| Compose project | `-p mars-preview` to avoid colliding with the Vite stack |
| Network | `mars-preview-network` (not `mars-local-network`) |
| Images / names | Frontend image `mars-frontend:preview`; all containers use `*-preview` suffix (`mars-backend-preview`, `mars-frontend-preview`, `mars-nginx-preview`, `mars-redis-preview`, `mars-notification-worker-preview`) |
| Redis volume | Separate: `mars-redis-data-preview` |

## Service matrix

| Service | Same as local? | Notes |
|---|---|---|
| `backend` | Yes | Hot reload, uploads/logs mounts, healthcheck |
| `notification-worker` | Yes | Same image + env overrides |
| `redis` | Yes (isolated volume) | Port 6379 — stop Vite stack first |
| `frontend` | **No** | Built static assets; no source bind-mount |
| `nginx` | Yes | Ports 80/443; depends on healthy frontend/backend |

## Runbook

```bash
# Stop Vite stack first (ports 80/443/6379)
docker compose -f docker-compose.local.yml down

docker compose -p mars-preview -f docker-compose.local-preview.yml up --build -d

# After frontend code changes:
docker compose -p mars-preview -f docker-compose.local-preview.yml up --build -d frontend
```

Switch back to Vite local:

```bash
docker compose -p mars-preview -f docker-compose.local-preview.yml down
docker compose -f docker-compose.local.yml up -d
```

## Out of scope

- Cleaning unused root `.env` (`DB_SERVER=192.168.0.177`)
- Changing `docker-compose.local.yml` behavior
- Frontend HMR / bind-mount of source into the preview frontend
- Sharing redis volume with the Vite stack

## Success criteria

1. Opening `http://localhost` serves the production-built SPA (not Vite).
2. API / uploads still proxy to the hot-reload backend.
3. Backend source edits still reload via nodemon as in local.
4. Vite stack and preview stack are not run at the same time on the same ports.
