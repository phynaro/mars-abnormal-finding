#!/bin/bash

# Let's Encrypt Setup Script for mars-demo.trazor.cloud
# Run this script on your server: ssh root@mars-demo.trazor.cloud

set -e

DOMAIN="mars-demo.trazor.cloud"
NGINX_SITE_CONFIG="/etc/nginx/sites-available/$DOMAIN"
NGINX_SITE_ENABLED="/etc/nginx/sites-enabled/$DOMAIN"
WEBROOT="/var/www/html"

echo "🚀 Setting up Let's Encrypt for $DOMAIN"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root"
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install required packages
echo "📦 Installing required packages..."
apt install -y nginx snapd ufw

# Install certbot via snap
echo "🔧 Installing Certbot..."
snap install --classic certbot
ln -sf /snap/bin/certbot /usr/bin/certbot

# Create webroot directory for ACME challenges
echo "📁 Creating webroot directory..."
mkdir -p $WEBROOT
chown -R www-data:www-data $WEBROOT

# Configure firewall
echo "🔥 Configuring firewall..."
ufw --force enable
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw reload

# Create temporary nginx config for certificate generation
echo "⚙️ Creating temporary nginx configuration..."
cat > $NGINX_SITE_CONFIG << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    root $WEBROOT;
    index index.html;
    
    location /.well-known/acme-challenge/ {
        root $WEBROOT;
    }
    
    location / {
        return 200 'Certificate generation in progress...';
        add_header Content-Type text/plain;
    }
}
EOF

# Enable site
ln -sf $NGINX_SITE_CONFIG $NGINX_SITE_ENABLED

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
nginx -t

# Start nginx
echo "🚀 Starting nginx..."
systemctl start nginx
systemctl enable nginx

# Wait for nginx to start
sleep 3

# Obtain SSL certificate
echo "🔐 Obtaining SSL certificate..."
certbot certonly --webroot -w $WEBROOT -d $DOMAIN --non-interactive --agree-tos --email admin@trazor.cloud

# Update nginx configuration with SSL
echo "⚙️ Updating nginx configuration with SSL..."
cat > $NGINX_SITE_CONFIG << 'EOF'
# HTTP server - redirect to HTTPS
server {
    listen 80;
    server_name mars-demo.trazor.cloud;
    
    # Let's Encrypt challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect all other HTTP traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name mars-demo.trazor.cloud;
    
    # Let's Encrypt SSL Configuration
    ssl_certificate /etc/letsencrypt/live/mars-demo.trazor.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mars-demo.trazor.cloud/privkey.pem;
    
    # SSL Security Settings (modern configuration)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
    
    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Frontend root directory
    root /var/www/mars-demo.trazor.cloud/dist;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Handle React Router (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy API requests to backend
    location /api/ {
        # Update this URL to your actual backend URL
        proxy_pass https://api.trazor.cloud/api/;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Handle CORS
        proxy_set_header Origin https://mars-demo.trazor.cloud;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
    
    # Proxy file uploads
    location /uploads/ {
        proxy_pass https://api.trazor.cloud/uploads/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Upload settings
        client_max_body_size 50M;
        proxy_request_buffering off;
    }
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary "Accept-Encoding";
    }
    
    # Security: deny access to hidden files
    location ~ /\. {
        deny all;
    }
    
    # Security: deny access to sensitive files
    location ~* \.(env|log|conf)$ {
        deny all;
    }
}
EOF

# Test nginx configuration
echo "🧪 Testing updated nginx configuration..."
nginx -t

# Reload nginx
echo "🔄 Reloading nginx..."
systemctl reload nginx

# Set up automatic renewal
echo "⏰ Setting up automatic certificate renewal..."
cat > /etc/cron.d/certbot-renew << EOF
# Renew Let's Encrypt certificates twice daily
0 12 * * * root /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
0 0 * * * root /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
EOF

# Test renewal
echo "🧪 Testing certificate renewal..."
certbot renew --dry-run

# Create frontend directory
echo "📁 Creating frontend directory..."
mkdir -p /var/www/mars-demo.trazor.cloud/dist
chown -R www-data:www-data /var/www/mars-demo.trazor.cloud

echo "✅ Let's Encrypt setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Upload your frontend files to /var/www/mars-demo.trazor.cloud/dist/"
echo "2. Update the proxy_pass URLs in nginx config if needed"
echo "3. Test your site: https://$DOMAIN"
echo ""
echo "🔧 Useful commands:"
echo "- Check certificate status: certbot certificates"
echo "- Renew certificate: certbot renew"
echo "- Test nginx config: nginx -t"
echo "- Reload nginx: systemctl reload nginx"
echo "- Check nginx status: systemctl status nginx"
