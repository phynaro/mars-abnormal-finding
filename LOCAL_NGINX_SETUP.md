# Local Nginx Development Setup

This guide helps you set up a standalone nginx server for local development that routes to your frontend (port 3000) and backend (port 3001).

## 🎯 Why Use Standalone Nginx?

- **Production Parity**: Mimics your production environment
- **Single Port Access**: Access everything through port 80/443
- **Proper Routing**: Handle API routes, static files, and SPA routing
- **SSL Testing**: Easy to test HTTPS locally
- **CORS Handling**: Proper CORS configuration
- **Performance**: Better caching and compression

## 🚀 Quick Setup

### Option 1: Automated Setup (Recommended)

```bash
# Run the setup script
./scripts/setup-local-nginx.sh
```

### Option 2: Manual Setup

1. **Install nginx** (if not already installed):
   ```bash
   # macOS
   brew install nginx
   
   # Ubuntu/Debian
   sudo apt-get install nginx
   
   # CentOS/RHEL
   sudo yum install nginx
   ```

2. **Copy configuration**:
   ```bash
   # macOS
   sudo cp nginx-local-dev.conf /usr/local/etc/nginx/nginx-local-dev.conf
   
   # Linux
   sudo cp nginx-local-dev.conf /etc/nginx/nginx-local-dev.conf
   ```

3. **Create SSL certificates** (optional):
   ```bash
   sudo mkdir -p /etc/nginx/ssl
   sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
       -keyout /etc/nginx/ssl/localhost.key \
       -out /etc/nginx/ssl/localhost.crt \
       -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
   ```

## 🏃‍♂️ Running the Setup

### Method 1: Standalone Nginx

1. **Start your services**:
   ```bash
   # Terminal 1 - Frontend
   cd frontend && npm run dev
   
   # Terminal 2 - Backend
   cd backend && npm run dev
   ```

2. **Start nginx**:
   ```bash
   # Using the generated script
   ./start-local-nginx.sh
   
   # Or manually
   sudo nginx -c /usr/local/etc/nginx/nginx-local-dev.conf -g "daemon off;"
   ```

3. **Access your application**:
   - Frontend: http://localhost
   - Backend API: http://localhost/api
   - HTTPS: https://localhost (with self-signed cert)

### Method 2: Docker Compose

```bash
# Start everything with Docker
docker-compose -f docker-compose.nginx-local.yml up -d

# View logs
docker-compose -f docker-compose.nginx-local.yml logs -f

# Stop everything
docker-compose -f docker-compose.nginx-local.yml down
```

## 🔧 Configuration Details

### Routing Rules

- **`/api/*`** → Proxies to `localhost:3001/api/*`
- **`/uploads/*`** → Proxies to `localhost:3001/uploads/*`
- **`/socket.io/*`** → Proxies to `localhost:3001/socket.io/*` (WebSocket)
- **`/*`** → Proxies to `localhost:3000/*` (Frontend SPA)

### Features Included

- ✅ **CORS Support**: Proper CORS headers for development
- ✅ **SPA Routing**: Handles React Router routes
- ✅ **File Uploads**: Large file upload support (50MB)
- ✅ **WebSocket Support**: For real-time features
- ✅ **Gzip Compression**: Better performance
- ✅ **SSL/HTTPS**: Self-signed certificates for testing
- ✅ **Logging**: Separate access and error logs

## 🛠️ Troubleshooting

### Common Issues

1. **Port 80 already in use**:
   ```bash
   # Find what's using port 80
   sudo lsof -i :80
   
   # Kill the process
   sudo kill -9 <PID>
   ```

2. **Permission denied**:
   ```bash
   # Make sure you're using sudo for nginx commands
   sudo nginx -t -c /path/to/nginx-local-dev.conf
   ```

3. **SSL certificate errors**:
   ```bash
   # Accept self-signed certificate in browser
   # Or regenerate certificates
   sudo rm /etc/nginx/ssl/localhost.*
   # Then run the setup script again
   ```

4. **Services not responding**:
   ```bash
   # Check if your services are running
   curl http://localhost:3000  # Frontend
   curl http://localhost:3001/api/health  # Backend
   ```

### Useful Commands

```bash
# Test nginx configuration
sudo nginx -t -c /usr/local/etc/nginx/nginx-local-dev.conf

# Reload nginx configuration
sudo nginx -s reload

# Stop nginx
sudo nginx -s stop

# View nginx logs
sudo tail -f /var/log/nginx/local-dev-access.log
sudo tail -f /var/log/nginx/local-dev-error.log
```

## 🔄 Switching Between Environments

You can easily switch between different nginx configurations:

```bash
# Development
sudo nginx -c /usr/local/etc/nginx/nginx-local-dev.conf

# Production-like
sudo nginx -c /usr/local/etc/nginx/nginx-production.conf

# Docker
sudo nginx -c /usr/local/etc/nginx/nginx-docker.conf
```

## 📝 Customization

### Adding New Routes

Edit `nginx-local-dev.conf` and add new location blocks:

```nginx
# Example: Add a new API endpoint
location /admin/ {
    proxy_pass http://localhost:3001/admin/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Changing Ports

If your services run on different ports, update the proxy_pass directives:

```nginx
# Frontend on port 3000
proxy_pass http://localhost:3000/;

# Backend on port 3001
proxy_pass http://localhost:3001/api/;
```

## 🎉 Benefits You'll Get

- **Unified Access**: Everything accessible through localhost
- **Production Testing**: Test nginx configurations before deployment
- **Better Performance**: Nginx handles static files efficiently
- **SSL Testing**: Test HTTPS features locally
- **CORS Management**: Proper CORS handling for development
- **Load Testing**: Easy to test with multiple backend instances

## 📚 Additional Resources

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Nginx Beginner's Guide](https://nginx.org/en/docs/beginners_guide.html)
- [SSL Certificate Generation](https://nginx.org/en/docs/http/configuring_https_servers.html)
