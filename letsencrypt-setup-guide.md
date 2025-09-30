# Let's Encrypt Setup Guide for mars-demo.trazor.cloud

## Prerequisites
- SSH access to your server: `ssh root@mars-demo.trazor.cloud`
- Domain `mars-demo.trazor.cloud` pointing to your server's IP
- Nginx installed and running
- Ports 80 and 443 open in firewall

## Step 1: Install Certbot

```bash
# Update system packages
apt update && apt upgrade -y

# Install snapd (required for certbot)
apt install snapd -y

# Install certbot via snap
snap install --classic certbot

# Create symlink for easy access
ln -s /snap/bin/certbot /usr/bin/certbot
```

## Step 2: Stop nginx temporarily (if needed)

```bash
# Stop nginx to free up port 80 for certificate validation
systemctl stop nginx
```

## Step 3: Obtain SSL Certificate

```bash
# Get certificate using standalone mode
certbot certonly --standalone -d mars-demo.trazor.cloud

# Or if you prefer nginx plugin (nginx must be running):
# certbot --nginx -d mars-demo.trazor.cloud
```

## Step 4: Update nginx configuration

The certificate files will be stored at:
- Certificate: `/etc/letsencrypt/live/mars-demo.trazor.cloud/fullchain.pem`
- Private Key: `/etc/letsencrypt/live/mars-demo.trazor.cloud/privkey.pem`

## Step 5: Test certificate renewal

```bash
# Test renewal process
certbot renew --dry-run
```

## Step 6: Set up automatic renewal

```bash
# Create renewal script
cat > /etc/cron.d/certbot-renew << EOF
# Renew Let's Encrypt certificates twice daily
0 12 * * * root /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
0 0 * * * root /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
EOF
```

## Step 7: Update firewall (if using ufw)

```bash
# Allow HTTP and HTTPS traffic
ufw allow 80/tcp
ufw allow 443/tcp
ufw reload
```

## Troubleshooting

### If certificate generation fails:
1. Check domain DNS: `nslookup mars-demo.trazor.cloud`
2. Ensure port 80 is accessible: `netstat -tlnp | grep :80`
3. Check firewall: `ufw status`

### If nginx fails to start:
1. Test configuration: `nginx -t`
2. Check certificate paths
3. Check file permissions: `ls -la /etc/letsencrypt/live/mars-demo.trazor.cloud/`

### Manual certificate renewal:
```bash
certbot renew --force-renewal
systemctl reload nginx
```

## Security Notes

- Certificates expire every 90 days but auto-renewal handles this
- Keep your server time synchronized: `timedatectl set-ntp true`
- Monitor renewal logs: `journalctl -u certbot.timer`
