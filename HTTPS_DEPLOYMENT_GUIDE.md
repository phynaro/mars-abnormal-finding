# Quick Deployment Guide: Let's Encrypt for mars-demo.trazor.cloud

## 🚀 Quick Setup (Automated)

### Option 1: Use the automated script
```bash
# SSH into your server
ssh root@mars-demo.trazor.cloud

# Upload and run the setup script
# (You'll need to upload setup-letsencrypt.sh to your server first)
chmod +x setup-letsencrypt.sh
./setup-letsencrypt.sh
```

### Option 2: Manual setup (step by step)

```bash
# 1. SSH into your server
ssh root@mars-demo.trazor.cloud

# 2. Update system
apt update && apt upgrade -y

# 3. Install Certbot
snap install --classic certbot
ln -sf /snap/bin/certbot /usr/bin/certbot

# 4. Configure firewall
ufw allow 80/tcp
ufw allow 443/tcp

# 5. Create webroot for ACME challenges
mkdir -p /var/www/html
chown www-data:www-data /var/www/html

# 6. Create temporary nginx config
cat > /etc/nginx/sites-available/mars-demo.trazor.cloud << 'EOF'
server {
    listen 80;
    server_name mars-demo.trazor.cloud;
    
    root /var/www/html;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 200 'Certificate generation in progress...';
        add_header Content-Type text/plain;
    }
}
EOF

# 7. Enable site
ln -sf /etc/nginx/sites-available/mars-demo.trazor.cloud /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 8. Obtain certificate
certbot certonly --webroot -w /var/www/html -d mars-demo.trazor.cloud --non-interactive --agree-tos --email admin@trazor.cloud

# 9. Update nginx config with SSL (use the provided nginx-mars-demo-letsencrypt.conf)
# Copy the content from nginx-mars-demo-letsencrypt.conf to /etc/nginx/sites-available/mars-demo.trazor.cloud

# 10. Test and reload
nginx -t && systemctl reload nginx

# 11. Set up auto-renewal
cat > /etc/cron.d/certbot-renew << 'EOF'
0 12 * * * root /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
EOF
```

## 📁 File Upload Instructions

After SSL is set up, you need to upload your frontend files:

```bash
# Create frontend directory
mkdir -p /var/www/mars-demo.trazor.cloud/dist

# Upload your frontend build files to:
# /var/www/mars-demo.trazor.cloud/dist/

# Set proper permissions
chown -R www-data:www-data /var/www/mars-demo.trazor.cloud
```

## 🔧 Configuration Updates Needed

### 1. Update Backend CORS Settings
In your backend environment variables, ensure:
```bash
CORS_ORIGIN=https://mars-demo.trazor.cloud
FRONTEND_URL=https://mars-demo.trazor.cloud
```

### 2. Update Frontend API URLs
In your frontend, update API base URLs to use HTTPS:
```typescript
// Update your API service files to use HTTPS
const API_BASE_URL = 'https://mars-demo.trazor.cloud/api';
```

### 3. Update Docker Compose (if using)
Update your docker-compose.yml CORS settings:
```yaml
environment:
  - CORS_ORIGIN=https://mars-demo.trazor.cloud
  - FRONTEND_URL=https://mars-demo.trazor.cloud
```

## 🧪 Testing Your Setup

```bash
# Test SSL certificate
curl -I https://mars-demo.trazor.cloud

# Test certificate renewal
certbot renew --dry-run

# Check certificate status
certbot certificates

# Test nginx configuration
nginx -t

# Check nginx status
systemctl status nginx
```

## 🚨 Troubleshooting

### Certificate generation fails:
1. Check DNS: `nslookup mars-demo.trazor.cloud`
2. Check port 80: `netstat -tlnp | grep :80`
3. Check firewall: `ufw status`

### Nginx fails to start:
1. Test config: `nginx -t`
2. Check logs: `journalctl -u nginx`
3. Check certificate files: `ls -la /etc/letsencrypt/live/mars-demo.trazor.cloud/`

### Frontend not loading:
1. Check file permissions: `ls -la /var/www/mars-demo.trazor.cloud/dist/`
2. Check nginx error logs: `tail -f /var/log/nginx/error.log`

## 📋 Post-Setup Checklist

- [ ] SSL certificate obtained and working
- [ ] HTTP redirects to HTTPS
- [ ] Frontend files uploaded to `/var/www/mars-demo.trazor.cloud/dist/`
- [ ] Backend CORS configured for HTTPS
- [ ] API endpoints accessible via HTTPS
- [ ] Certificate auto-renewal configured
- [ ] Security headers in place
- [ ] Site accessible at https://mars-demo.trazor.cloud

## 🔐 Security Notes

- Certificates auto-renew every 90 days
- HSTS header configured for 2 years
- Modern TLS protocols only (TLS 1.2+)
- Strong cipher suites configured
- Security headers implemented
- Hidden files blocked
- Sensitive file types blocked
