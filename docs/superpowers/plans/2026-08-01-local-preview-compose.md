# Local Preview Compose Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `docker-compose.local-preview.yml` that serves a production-built frontend while keeping the local hot-reload backend, worker, and redis.

**Architecture:** Clone `docker-compose.local.yml` into a new file. Keep backend/worker/redis/nginx identical in behavior (preview container names + network/volume). Replace the Vite frontend service with a multi-stage build of `frontend/Dockerfile` that nginx-serves `dist` on port 3000. Edge proxy stays `nginx-local-dev.conf`.

**Tech Stack:** Docker Compose, existing `frontend/Dockerfile` (Node build + nginx:alpine), `backend/Dockerfile`, Redis 7, nginx:alpine

**Spec:** `docs/superpowers/specs/2026-08-01-local-preview-compose-design.md`

## Global Constraints

- New file only for the stack: `docker-compose.local-preview.yml` (do not change `docker-compose.local.yml` behavior)
- Frontend: `frontend/Dockerfile`, image `mars-frontend:preview`, no source bind-mount, rebuild-on-change
- Build args: `NODE_ENV=production`, `VITE_API_URL=/api`, `VITE_LIFF_ID=2008351084-nRdr4kE4`
- Backend: `mars-backend:local`, `npm run dev`, `env_file: ./backend/.env`, overrides `DB_NEW_SERVER=192.168.0.208` and `DB_NEW_INSTANCE=`
- Project flag at runtime: `-p mars-preview`
- Network name: `mars-preview-network`
- Redis volume name: `mars-redis-data-preview`
- All container names use `*-preview` suffix
- Reuse `./nginx-local-dev.conf`
- Do not clean root `.env` / `.177` as part of this work

---

## File Structure

| File | Responsibility |
|---|---|
| `docker-compose.local-preview.yml` | Preview stack definition (create) |
| `docs/superpowers/specs/2026-08-01-local-preview-compose-design.md` | Approved design (already exists; no edit required) |
| `CLAUDE.md` | Add one row to the compose-files table so the new file is discoverable |

No frontend/backend application code changes. Existing `frontend/Dockerfile` and `frontend/nginx.conf` are reused as-is.

---

### Task 1: Create `docker-compose.local-preview.yml`

**Files:**
- Create: `docker-compose.local-preview.yml`
- Reference: `docker-compose.local.yml` (do not modify)
- Reference: `frontend/Dockerfile`, `nginx-local-dev.conf`

**Interfaces:**
- Consumes: existing backend/frontend Dockerfiles; `./backend/.env`; `nginx-local-dev.conf`
- Produces: compose project runnable as  
  `docker compose -p mars-preview -f docker-compose.local-preview.yml up --build -d`

- [ ] **Step 1: Write the compose file**

Create `docker-compose.local-preview.yml` with exactly this content:

```yaml
services:
  # Backend — same as local (hot reload). Preview container names only.
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    image: mars-backend:local
    container_name: mars-backend-preview
    command: npm run dev
    env_file:
      - ./backend/.env
    environment:
      - NODE_ENV=development
      - REDIS_URL=redis://redis:6379
      # CEDAR DB: use host IP in Docker (localhost in backend/.env is for native dev only)
      - DB_NEW_SERVER=192.168.0.208
      - DB_NEW_INSTANCE=
      - CHOKIDAR_USEPOLLING=true
    depends_on:
      - redis
    volumes:
      - ./backend/src:/app/src
      - ./backend/swagger:/app/swagger
      - ./backend/nodemon.json:/app/nodemon.json
      - ./backend/uploads:/app/uploads
      - ./backend/logs:/app/logs
      - /app/node_modules
    networks:
      - mars-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://127.0.0.1:3001/api/health"]
      interval: 60s
      timeout: 10s
      retries: 3
      start_period: 40s

  notification-worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    image: mars-backend:local
    container_name: mars-notification-worker-preview
    command: node src/workers/notificationWorker.js
    env_file:
      - ./backend/.env
    environment:
      - NODE_ENV=development
      - REDIS_URL=redis://redis:6379
      - DB_NEW_SERVER=192.168.0.208
      - DB_NEW_INSTANCE=
    volumes:
      - ./backend/src:/app/src
      - /app/node_modules
    networks:
      - mars-network
    depends_on:
      - redis
    restart: unless-stopped

  # Built frontend (static nginx) — customer preview; rebuild image to pick up UI changes
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        NODE_ENV: production
        VITE_API_URL: /api
        VITE_LIFF_ID: 2008351084-nRdr4kE4
    image: mars-frontend:preview
    container_name: mars-frontend-preview
    # No command override — Dockerfile CMD is nginx
    # No source bind-mount — assets are baked into the image
    networks:
      - mars-network
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://127.0.0.1:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    container_name: mars-nginx-preview
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx-local-dev.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      frontend:
        condition: service_healthy
      backend:
        condition: service_healthy
    networks:
      - mars-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  redis:
    image: redis:7-alpine
    container_name: mars-redis-preview
    ports:
      - "6379:6379"
    volumes:
      - mars_redis_data:/data
    networks:
      - mars-network
    restart: unless-stopped
    command: redis-server --appendonly yes

networks:
  mars-network:
    driver: bridge
    name: mars-preview-network

volumes:
  mars_redis_data:
    name: mars-redis-data-preview
```

- [ ] **Step 2: Validate compose syntax**

Run:

```bash
docker compose -p mars-preview -f docker-compose.local-preview.yml config --quiet
```

Expected: exit code `0`, no stderr errors.

- [ ] **Step 3: Confirm frontend service differs from local (sanity grep)**

Run:

```bash
docker compose -p mars-preview -f docker-compose.local-preview.yml config | grep -E 'dockerfile:|image:|container_name:|VITE_|mars-preview'
```

Expected (among other lines):
- `dockerfile: Dockerfile` under frontend (not `Dockerfile.dev`)
- `image: mars-frontend:preview`
- `container_name: mars-frontend-preview`
- `name: mars-preview-network`
- `name: mars-redis-data-preview`
- build args include `VITE_API_URL: /api` and LIFF id

- [ ] **Step 4: Commit** (only if the user asked to commit)

```bash
git add docker-compose.local-preview.yml
git commit -m "$(cat <<'EOF'
Add local-preview compose with built frontend and hot-reload backend.

EOF
)"
```

---

### Task 2: Document the compose file in `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md` (compose files table under “Docker compose files”)

**Interfaces:**
- Consumes: Task 1 file name and purpose
- Produces: discoverable row in project command docs

- [ ] **Step 1: Add table row**

In `CLAUDE.md`, find the Docker compose files table (currently lists `docker-compose.local.yml`, `docker-compose.yml`, `docker-compose.deploy.yml`, `docker-compose.production.yml`) and insert this row after the local row:

```markdown
| `docker-compose.local-preview.yml` | **Local customer preview** — same backend/worker/redis hot-reload as local, but frontend is a production build served by nginx. Use `-p mars-preview`. Stop the Vite local stack first (ports 80/443/6379). |
```

- [ ] **Step 2: Verify the table still renders as markdown**

Open `CLAUDE.md` and confirm the new row sits inside the same `| File | Purpose |` table with matching column count.

- [ ] **Step 3: Commit** (only if the user asked to commit)

```bash
git add CLAUDE.md
git commit -m "$(cat <<'EOF'
Document local-preview docker compose in CLAUDE.md.

EOF
)"
```

---

### Task 3: Bring up the preview stack and verify success criteria

**Files:**
- None (runtime verification only)

**Interfaces:**
- Consumes: Task 1 compose file; existing images/Dockerfiles
- Produces: evidence that spec success criteria 1–3 hold (criterion 4 is procedural: stacks must not share ports)

- [ ] **Step 1: Stop the Vite local stack**

Run:

```bash
docker compose -f docker-compose.local.yml down
```

Expected: `mars-backend-local`, `mars-frontend-local`, `mars-nginx-local`, `mars-redis-local`, `mars-notification-worker-local` stop/remove. Ports 80/443/6379 free.

- [ ] **Step 2: Start preview stack**

Run:

```bash
docker compose -p mars-preview -f docker-compose.local-preview.yml up --build -d
```

Expected: build completes; containers `mars-backend-preview`, `mars-frontend-preview`, `mars-nginx-preview`, `mars-redis-preview`, `mars-notification-worker-preview` are `Up`. Frontend build may take several minutes the first time.

- [ ] **Step 3: Wait for healthy services**

Run:

```bash
docker compose -p mars-preview -f docker-compose.local-preview.yml ps
```

Expected: `backend`, `frontend`, `nginx` show healthy (or at least `Up`); worker/redis `Up`.

- [ ] **Step 4: Verify static frontend (not Vite)**

Run:

```bash
curl -sI http://localhost/ | head -n 20
docker exec mars-frontend-preview ps aux | head -n 20
```

Expected:
- HTTP 200 from `http://localhost/`
- Frontend process is `nginx` (not `node` / `vite`)

- [ ] **Step 5: Verify API still reaches hot-reload backend**

Run:

```bash
curl -s http://localhost/api/health
docker exec mars-backend-preview printenv | grep -E '^DB_SERVER=|^DB_NEW_SERVER=|^DB_NEW_INSTANCE='
```

Expected:
- Health JSON/response from backend (`success` or known health payload)
- `DB_SERVER=192.168.0.208` (from `backend/.env`)
- `DB_NEW_SERVER=192.168.0.208`
- `DB_NEW_INSTANCE=` empty (or unset/blank)

- [ ] **Step 6: Confirm backend is still `npm run dev`**

Run:

```bash
docker inspect mars-backend-preview --format '{{json .Config.Cmd}}'
```

Expected: `["npm","run","dev"]` (or equivalent argv showing `npm run dev`).

- [ ] **Step 7: Optional smoke — leave preview running or switch back**

If returning to Vite local:

```bash
docker compose -p mars-preview -f docker-compose.local-preview.yml down
docker compose -f docker-compose.local.yml up -d
```

Do **not** commit runtime state or uploads.

---

## Spec coverage checklist

| Spec requirement | Task |
|---|---|
| New `docker-compose.local-preview.yml` | Task 1 |
| Built frontend via `frontend/Dockerfile` + prod build args | Task 1 |
| Backend/worker/redis hot-reload parity + DB overrides | Task 1 |
| Preview network / volume / container names | Task 1 |
| Reuse `nginx-local-dev.conf` | Task 1 |
| Runbook / discoverability | Task 2 + Task 3 |
| Success criteria 1–3 verified | Task 3 |
| Do not change local.yml / root `.env` | All tasks (explicit non-goals) |
