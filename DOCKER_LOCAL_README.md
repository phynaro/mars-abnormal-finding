# Docker Local Development Setup

This guide explains how to run the MARS Abnormal Finding application locally using Docker.

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- `.env.development` files in both `backend/` and `frontend/` directories

### 1. Build and Start Services

```bash
# Build all Docker images and start services
./scripts/docker-local.sh build
./scripts/docker-local.sh up

# Or do both in one command
./scripts/docker-local.sh rebuild
```

### 2. Access the Application

- **Frontend**: http://localhost
- **Backend API**: http://localhost/api
- **Direct Backend**: http://localhost:3001
- **Direct Frontend**: http://localhost:3000

## 📋 Available Commands

Use the `docker-local.sh` script for easy management:

```bash
# Build images
./scripts/docker-local.sh build

# Start services
./scripts/docker-local.sh up

# Stop services
./scripts/docker-local.sh down

# Restart services
./scripts/docker-local.sh restart

# View logs
./scripts/docker-local.sh logs
./scripts/docker-local.sh logs-backend
./scripts/docker-local.sh logs-frontend
./scripts/docker-local.sh logs-nginx

# Check status
./scripts/docker-local.sh status

# Clean up (removes containers, networks, volumes)
./scripts/docker-local.sh clean

# Rebuild everything
./scripts/docker-local.sh rebuild

# Open shell in containers
./scripts/docker-local.sh shell-backend
./scripts/docker-local.sh shell-frontend

# Show help
./scripts/docker-local.sh help
```

## 🏗️ Architecture

The local setup includes:

### Services

1. **Backend** (`mars-backend:local`)
   - Built from `./backend/Dockerfile`
   - Runs on port 3001
   - Source code mounted for development
   - Health checks enabled

2. **Frontend** (`mars-frontend:local`)
   - Built from `./frontend/Dockerfile`
   - Serves static files on port 3000
   - Development build with hot reload support

3. **Nginx** (Reverse Proxy)
   - Routes `/api/*` to backend
   - Routes `/uploads/*` to backend
   - Routes `/*` to frontend
   - Runs on port 80

### Networks

- `mars-local-network`: Bridge network for service communication

### Volumes

- `mars-upload-data-local`: Persistent storage for uploaded files
- Source code mounts for development

## 🔧 Configuration

### Environment Files

Make sure you have the following environment files:

- `backend/.env.development`
- `frontend/.env.development`

### Build Arguments

The frontend build accepts these arguments:

- `NODE_ENV`: Set to `development`
- `VITE_API_URL`: API base URL (default: `http://localhost/api`)
- `VITE_LIFF_ID`: LINE LIFF ID for development

### Nginx Configuration

Uses `nginx-development.conf` for local development with:
- API proxying to backend
- File upload handling
- Frontend serving
- Gzip compression
- Proper headers and timeouts

## 🐛 Debugging

### View Logs

```bash
# All services
./scripts/docker-local.sh logs

# Specific service
./scripts/docker-local.sh logs-backend
./scripts/docker-local.sh logs-frontend
./scripts/docker-local.sh logs-nginx
```

### Access Containers

```bash
# Backend shell
./scripts/docker-local.sh shell-backend

# Frontend shell
./scripts/docker-local.sh shell-frontend
```

### Health Checks

All services include health checks:
- Backend: `http://localhost:3001/health`
- Frontend: `http://localhost/`
- Nginx: `http://localhost/`

## 🔄 Development Workflow

### 1. Initial Setup

```bash
# Clone repository and navigate to project root
cd mars-abnormal-finding

# Create environment files
cp backend/env.template backend/.env.development
cp frontend/env.template frontend/.env.development

# Edit environment files with your local settings
# Then build and start
./scripts/docker-local.sh rebuild
```

### 2. Daily Development

```bash
# Start services
./scripts/docker-local.sh up

# Make code changes (auto-reload enabled)
# View logs if needed
./scripts/docker-local.sh logs

# Stop when done
./scripts/docker-local.sh down
```

### 3. Rebuilding After Changes

```bash
# If you change dependencies or Dockerfiles
./scripts/docker-local.sh rebuild

# If you just want to restart
./scripts/docker-local.sh restart
```

## 🧹 Cleanup

### Remove Everything

```bash
# Stop and remove containers, networks, volumes
./scripts/docker-local.sh clean
```

### Remove Images

```bash
# Remove local images
docker rmi mars-backend:local mars-frontend:local
```

## 🔍 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   lsof -i :80
   lsof -i :3001
   
   # Stop conflicting services or change ports in docker-compose.local.yml
   ```

2. **Build Failures**
   ```bash
   # Clean rebuild
   ./scripts/docker-local.sh clean
   ./scripts/docker-local.sh build
   ```

3. **Environment File Issues**
   ```bash
   # Check if environment files exist
   ls -la backend/.env.development frontend/.env.development
   ```

4. **Permission Issues**
   ```bash
   # Make script executable
   chmod +x scripts/docker-local.sh
   ```

### Health Check Failures

If health checks fail:

```bash
# Check service status
./scripts/docker-local.sh status

# View specific service logs
./scripts/docker-local.sh logs-backend
```

### Database Connection Issues

If you're using an external database, ensure:
- Database is accessible from Docker containers
- Connection strings in `.env.development` are correct
- Network connectivity is working

## 📝 Notes

- The local setup is optimized for development with hot reload
- Source code is mounted as read-only for safety
- Uploads are persisted in Docker volumes
- All services include health checks for reliability
- Nginx handles routing and static file serving
- SSL is not configured for local development (HTTP only)

## 🔗 Related Files

- `docker-compose.local.yml` - Main compose file
- `scripts/docker-local.sh` - Management script
- `nginx-development.conf` - Nginx configuration
- `backend/Dockerfile` - Backend image definition
- `frontend/Dockerfile` - Frontend image definition
