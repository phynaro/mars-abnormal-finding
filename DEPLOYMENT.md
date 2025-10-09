# Portable Docker Deployment Guide

This guide explains how to build portable Docker images that can be copied to any server and run without additional build steps.

## Overview

The deployment system creates self-contained Docker images that include:
- **Backend**: Node.js application with all dependencies
- **Frontend**: Built React application served by nginx
- **Nginx**: Reverse proxy with production configuration

## Quick Start

### 1. Build Portable Images

```bash
# Build all images and create archive
./build-images.sh

# Or specify version and registry
./build-images.sh v1.0.0 myregistry.com/
```

This creates:
- `mars-backend:latest`
- `mars-frontend:latest` 
- `mars-nginx:latest`
- `mars-images-latest.tar.gz` (portable archive)

### 2. Deploy on Target Server

```bash
# Copy archive to target server
scp mars-images-latest.tar.gz user@target-server:/path/to/deployment/

# On target server, deploy
./deploy.sh
```

## Detailed Steps

### Building Images

1. **Backend Image** (`backend/Dockerfile.production`):
   - Multi-stage build for optimization
   - Non-root user for security
   - Health checks included
   - Production dependencies only

2. **Frontend Image** (`frontend/Dockerfile.production`):
   - Builds React app in build stage
   - Serves with nginx in production stage
   - Optimized for production

3. **Nginx Image** (`Dockerfile.nginx`):
   - Includes production nginx configuration
   - Non-root user
   - Health checks

### Deployment Process

1. **Load Images**: `docker load < mars-images-latest.tar.gz`
2. **Create Environment Files**: From templates if not present
3. **Start Services**: `docker-compose -f docker-compose.deploy.yml up -d`
4. **Health Checks**: Automatic verification of all services

## Configuration

### Environment Files

The deployment script creates environment files from templates:

- `backend/.env.production` - Backend configuration
- `frontend/.env.production` - Frontend configuration

**Important**: Edit these files with your actual configuration before deployment.

### Required Environment Variables

#### Backend (`backend/.env.production`)
```env
NODE_ENV=production
PORT=3001
DB_HOST=your-database-server
DB_PORT=1433
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
JWT_SECRET=your_jwt_secret_key
API_BASE_URL=http://localhost:3001
LINE_CHANNEL_ACCESS_TOKEN=your_line_token
LINE_CHANNEL_SECRET=your_line_secret
EMAIL_SERVICE_API_KEY=your_email_api_key
CORS_ORIGIN=http://localhost
```

#### Frontend (`frontend/.env.production`)
```env
VITE_API_BASE_URL=http://localhost/api
VITE_APP_NAME=MARS Application
VITE_ENVIRONMENT=production
VITE_ENABLE_DEBUG=false
VITE_ENABLE_ANALYTICS=true
VITE_LINE_LIFF_ID=your_line_liff_id
VITE_BUILD_VERSION=1.0.0
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │    │   Frontend      │    │   Backend       │
│   Port: 80/443  │    │   Port: 3000    │    │   Port: 3001    │
│                 │    │                 │    │                 │
│  /api/* → Backend │    │  React App     │    │  Node.js API    │
│  /* → Frontend   │    │  Static Files  │    │  Database       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Management Commands

### View Logs
```bash
# All services
docker-compose -f docker-compose.deploy.yml logs -f

# Specific service
docker-compose -f docker-compose.deploy.yml logs -f backend
```

### Restart Services
```bash
# All services
docker-compose -f docker-compose.deploy.yml restart

# Specific service
docker-compose -f docker-compose.deploy.yml restart backend
```

### Stop Services
```bash
docker-compose -f docker-compose.deploy.yml down
```

### Update Deployment
```bash
# Stop services
docker-compose -f docker-compose.deploy.yml down

# Load new images
docker load < mars-images-new-version.tar.gz

# Update image tags in docker-compose.deploy.yml
# Start services
docker-compose -f docker-compose.deploy.yml up -d
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**: Ensure ports 80, 443, 3000, 3001 are available
2. **Database Connection**: Verify database credentials in environment files
3. **Permission Issues**: Check Docker daemon permissions
4. **Health Check Failures**: Check service logs for errors

### Debug Commands

```bash
# Check service status
docker-compose -f docker-compose.deploy.yml ps

# Check individual container logs
docker logs mars-backend
docker logs mars-frontend
docker logs mars-nginx

# Test endpoints
curl http://localhost/api/health
curl http://localhost/
```

### Performance Optimization

1. **Resource Limits**: Add resource limits to docker-compose.deploy.yml
2. **Caching**: Configure nginx caching for static assets
3. **Database**: Use connection pooling
4. **Monitoring**: Add monitoring and logging

## Security Considerations

1. **Non-root Users**: All containers run as non-root users
2. **Environment Variables**: Sensitive data in environment files
3. **Network Isolation**: Services communicate through internal network
4. **Health Checks**: Automatic service monitoring
5. **SSL/TLS**: Configure SSL certificates for production

## Backup and Recovery

### Backup
```bash
# Backup volumes
docker run --rm -v mars-upload-data:/data -v $(pwd):/backup alpine tar czf /backup/upload-backup.tar.gz -C /data .
docker run --rm -v mars-log-data:/data -v $(pwd):/backup alpine tar czf /backup/log-backup.tar.gz -C /data .
```

### Recovery
```bash
# Restore volumes
docker run --rm -v mars-upload-data:/data -v $(pwd):/backup alpine tar xzf /backup/upload-backup.tar.gz -C /data
docker run --rm -v mars-log-data:/data -v $(pwd):/backup alpine tar xzf /backup/log-backup.tar.gz -C /data
```

## Production Checklist

- [ ] Environment files configured
- [ ] Database connection tested
- [ ] SSL certificates configured (if needed)
- [ ] Resource limits set
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Security review completed
- [ ] Performance testing completed
