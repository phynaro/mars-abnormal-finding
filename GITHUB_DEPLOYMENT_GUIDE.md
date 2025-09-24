# GitHub Deployment Guide for Mars Frontend

## 🚀 **GitHub-Based Deployment Benefits**

- ✅ **No file uploads** - Everything comes from GitHub
- ✅ **Version control** - Track all changes
- ✅ **Easy updates** - Just push to GitHub and pull on server
- ✅ **Collaborative** - Multiple developers can work together
- ✅ **Backup** - Code is safely stored in GitHub
- ✅ **CI/CD ready** - Can add automated deployments later

## 📋 **Setup Steps**

### **Step 1: Push to GitHub**

```bash
# On your local machine:
git add .
git commit -m "Add Docker Compose frontend deployment"
git push origin main
```

### **Step 2: Deploy on Ubuntu Server**

```bash
# On your Ubuntu server:
wget https://raw.githubusercontent.com/phynaro/mars-abnormal-finding/main/deploy-from-github.sh
chmod +x deploy-from-github.sh
./deploy-from-github.sh
```

The script will:
- ✅ Install Docker and Git (if needed)
- ✅ Clone your repository
- ✅ Build Docker image
- ✅ Start services

### **Step 3: Update nginx Config**

Edit the nginx config on the server:
```bash
nano /opt/mars-frontend/frontend/nginx.conf
# Replace 'your-ngrok-url.ngrok.io' with your actual ngrok URL
```

### **Step 4: Restart Services**

```bash
cd /opt/mars-frontend
docker compose -f docker-compose-frontend.yml up -d --build
```

## 🔄 **Updating Deployment**

### **Method 1: Manual Update**
```bash
# On your Ubuntu server:
cd /opt/mars-frontend
git pull origin main
docker compose -f docker-compose-frontend.yml up -d --build
```

### **Method 2: Use Update Script**
```bash
# On your Ubuntu server:
wget https://raw.githubusercontent.com/phynaro/mars-abnormal-finding/main/update-from-github.sh
chmod +x update-from-github.sh
./update-from-github.sh
```

## 🎯 **Complete Workflow**

### **Local Development:**
1. Make changes to code
2. Test locally
3. Commit and push to GitHub

### **Server Deployment:**
1. SSH to server
2. Run update script
3. Done!

## 📁 **Repository Structure**

```
mars-abnormal-finding/
├── frontend/
│   ├── src/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .dockerignore
├── backend/
├── docker-compose-frontend.yml
├── deploy-from-github.sh
└── update-from-github.sh
```

## 🔧 **Server Management Commands**

```bash
# Check service status
cd /opt/mars-frontend
docker compose -f docker-compose-frontend.yml ps

# View logs
docker compose -f docker-compose-frontend.yml logs

# Restart services
docker compose -f docker-compose-frontend.yml restart

# Stop services
docker compose -f docker-compose-frontend.yml down
```

## 🚨 **Important Notes**

1. **Update nginx config** with your ngrok URL after first deployment
2. **Set up SSL** with Let's Encrypt for production
3. **Configure DNS** to point to your server
4. **Keep ngrok running** on your local machine

This approach is much cleaner and more maintainable!
