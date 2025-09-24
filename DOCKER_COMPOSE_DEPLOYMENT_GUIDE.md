# Docker Compose Deployment Guide for Mars Frontend

## 🐳 **Complete Docker Setup**

I've created a complete Docker Compose setup for your frontend deployment:

### **Files Created:**
- `frontend/Dockerfile` - Multi-stage build (Node.js build + nginx serve)
- `frontend/nginx.conf` - nginx configuration for your domain
- `docker-compose-frontend.yml` - Docker Compose configuration
- `deploy-docker-compose.sh` - Automated deployment script

## 🚀 **Deployment Steps**

### **Step 1: Upload Files to Ubuntu Server**

```bash
# Upload all necessary files
scp -r frontend/ user@your-server:/tmp/
scp docker-compose-frontend.yml user@your-server:/tmp/
scp deploy-docker-compose.sh user@your-server:/tmp/
```

### **Step 2: Run Deployment Script**

```bash
# On your Ubuntu server:
cd /tmp
chmod +x deploy-docker-compose.sh
./deploy-docker-compose.sh
```

The script will:
- ✅ Install Docker and Docker Compose (if not installed)
- ✅ Create deployment directory `/opt/mars-frontend`
- ✅ Copy files to deployment directory
- ✅ Build Docker image
- ✅ Start services

### **Step 3: Update nginx Config**

Before running the script, you need to update the nginx configuration:

**Edit `frontend/nginx.conf`** and replace:
```bash
# Replace this line:
proxy_pass https://your-ngrok-url.ngrok.io/api/;

# With your actual ngrok URL:
proxy_pass https://abc123.ngrok.io/api/;
```

### **Step 4: Configure Domain & SSL**

```bash
# Install certbot for SSL
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d mars-demo.trazor.cloud
```

## 🔧 **Manual Deployment (Alternative)**

If you prefer manual deployment:

```bash
# On your Ubuntu server:

# 1. Install Docker
sudo apt update
sudo apt install -y docker.io docker-compose

# 2. Create deployment directory
sudo mkdir -p /opt/mars-frontend
sudo chown $USER:$USER /opt/mars-frontend

# 3. Copy files
cp -r /tmp/frontend /opt/mars-frontend/
cp /tmp/docker-compose-frontend.yml /opt/mars-frontend/

# 4. Update nginx config with your ngrok URL
nano /opt/mars-frontend/frontend/nginx.conf

# 5. Build and start
cd /opt/mars-frontend
docker compose -f docker-compose-frontend.yml up -d
```

## 📊 **Management Commands**

```bash
# Check service status
docker compose -f docker-compose-frontend.yml ps

# View logs
docker compose -f docker-compose-frontend.yml logs

# Restart services
docker compose -f docker-compose-frontend.yml restart

# Stop services
docker compose -f docker-compose-frontend.yml down

# Update and rebuild
docker compose -f docker-compose-frontend.yml up -d --build
```

## 🎯 **Expected Result**

After deployment:
- **Frontend**: Available at `http://mars-demo.trazor.cloud`
- **API calls**: Proxied to your ngrok backend
- **SSL**: After certbot setup, available at `https://mars-demo.trazor.cloud`

## 🔍 **Troubleshooting**

```bash
# Check Docker logs
docker compose -f docker-compose-frontend.yml logs frontend

# Check nginx logs inside container
docker exec -it mars-frontend-frontend-1 cat /var/log/nginx/error.log

# Test nginx config
docker exec -it mars-frontend-frontend-1 nginx -t
```

This Docker Compose setup is much cleaner and easier to manage than manual nginx installation!
