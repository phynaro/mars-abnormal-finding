# Mars Demo Deployment Guide
# Hybrid Setup: Backend (Docker + ngrok) + Frontend (Ubuntu Server)

## 🏗️ Architecture Overview

```
┌─────────────────┐    HTTPS     ┌──────────────────┐
│   Frontend      │ ──────────► │   Ubuntu Server  │
│ mars-demo.trazor │              │   (nginx)        │
│     .cloud      │              └──────────────────┘
└─────────────────┘                       │
                                          │ Proxy /api/*
                                          ▼
┌─────────────────┐    HTTPS     ┌──────────────────┐
│   Backend       │ ◄──────────  │   ngrok tunnel   │
│  (Docker)       │              │   (public URL)   │
│  Local SQL DB    │              └──────────────────┘
└─────────────────┘
```

## 📋 Prerequisites

### Local Machine (Backend)
- [ ] Docker and Docker Compose installed
- [ ] ngrok account and authtoken
- [ ] Local SQL Server running
- [ ] Node.js (for building frontend)

### Ubuntu Server (Frontend)
- [ ] nginx installed and running
- [ ] SSL certificates for trazor.cloud
- [ ] Domain mars-demo.trazor.cloud pointing to server
- [ ] User with sudo access

## 🚀 Setup Steps

### Step 1: Prepare Backend (Local)

1. **Install ngrok**:
   ```bash
   # Get authtoken from https://dashboard.ngrok.com/get-started/your-authtoken
   ```

2. **Configure environment**:
   ```bash
   cp env.example .env
   nano .env
   # Fill in your values, especially:
   # - DB_PASSWORD (your local SQL Server password)
   # - NGROK_AUTHTOKEN (your ngrok authtoken)
   # - JWT_SECRET (generate a strong secret)
   ```

3. **Start backend**:
   ```bash
   chmod +x start-backend.sh
   ./start-backend.sh
   ```

4. **Note the ngrok URL** (e.g., `https://abc123.ngrok.io`)

### Step 2: Deploy Frontend (Ubuntu Server)

1. **Build frontend locally**:
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Update nginx configuration**:
   ```bash
   # Edit nginx-mars-demo.conf
   # Replace "your-ngrok-url.ngrok.io" with your actual ngrok URL
   ```

3. **Deploy to server**:
   ```bash
   # Copy files to server
   scp -r dist/* user@your-server:/var/www/mars-demo.trazor.cloud/
   scp nginx-mars-demo.conf user@your-server:/tmp/
   
   # On the server:
   sudo cp /tmp/nginx-mars-demo.conf /etc/nginx/sites-available/mars-demo.trazor.cloud
   sudo ln -sf /etc/nginx/sites-available/mars-demo.trazor.cloud /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### Step 3: Test Deployment

1. **Check backend**: Visit your ngrok URL (e.g., `https://abc123.ngrok.io/api/health`)
2. **Check frontend**: Visit `https://mars-demo.trazor.cloud`
3. **Test API calls**: Try logging in or creating a ticket

## 🔧 Configuration Files

### Backend Configuration
- `docker-compose.yml` - Docker setup with ngrok
- `backend/Dockerfile` - Backend container
- `backend/start.sh` - Startup script
- `.env` - Environment variables

### Frontend Configuration
- `nginx-mars-demo.conf` - nginx configuration
- `deploy-frontend.sh` - Deployment script

## 🔄 Daily Workflow

### Starting Development
1. **Start backend**:
   ```bash
   ./start-backend.sh
   ```

2. **Note ngrok URL** and update nginx config if it changed

3. **Reload nginx**:
   ```bash
   sudo systemctl reload nginx
   ```

### Updating Frontend
1. **Build locally**:
   ```bash
   cd frontend && npm run build
   ```

2. **Deploy to server**:
   ```bash
   rsync -avz --delete dist/ user@your-server:/var/www/mars-demo.trazor.cloud/
   ```

## 🚨 Important Notes

1. **ngrok URL Changes**: Each time you restart ngrok, you get a new URL
2. **Update nginx**: You must update the nginx config with the new ngrok URL
3. **SSL Certificates**: Ensure your SSL certificates are valid for trazor.cloud
4. **Database**: Your local SQL Server must be accessible from Docker
5. **CORS**: Backend is configured to accept requests from mars-demo.trazor.cloud

## 🛠️ Troubleshooting

### Backend Issues
- Check Docker logs: `docker-compose logs`
- Verify database connection in .env
- Ensure ngrok authtoken is correct

### Frontend Issues
- Check nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Verify SSL certificates
- Test nginx config: `sudo nginx -t`

### API Issues
- Check if ngrok URL is correct in nginx config
- Verify CORS settings in backend
- Check browser network tab for errors

## 📞 Support

If you encounter issues:
1. Check the logs (Docker and nginx)
2. Verify all configuration files
3. Test each component separately
4. Ensure all prerequisites are met
