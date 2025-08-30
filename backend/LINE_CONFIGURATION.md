# LINE Image Configuration Guide

## Environment Variables

Add these to your `.env` file:

```bash
# LINE Bot Configuration
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token_here

# LINE Image Configuration
# Set to 'true' to allow local images (NOT recommended for production)
LINE_ALLOW_LOCAL_IMAGES=false

# Image hosting service for LINE notifications
# Options: 'none', 'imgur', 'cloudinary', 'aws_s3'
LINE_IMAGE_HOSTING_SERVICE=none

# Backend URL for image serving
# Use your public domain in production
BACKEND_URL=http://localhost:3001
```

## Configuration Options

### 1. Local Development (Default)
```bash
LINE_ALLOW_LOCAL_IMAGES=false
LINE_IMAGE_HOSTING_SERVICE=none
```
- **Behavior**: Images are filtered out, only text notifications sent
- **Use Case**: Local development where LINE can't access localhost
- **Pros**: Works immediately, no external dependencies
- **Cons**: No images in notifications

### 2. Allow Local Images (Not Recommended)
```bash
LINE_ALLOW_LOCAL_IMAGES=true
LINE_IMAGE_HOSTING_SERVICE=none
```
- **Behavior**: All images sent (will fail for localhost)
- **Use Case**: Testing with public image URLs
- **Pros**: Can test with public images
- **Cons**: Local images will cause LINE API errors

### 3. Use Ngrok for Development (Recommended for Local Testing)
```bash
LINE_ALLOW_LOCAL_IMAGES=true
BACKEND_URL=https://your-ngrok-url.ngrok.io
```
- **Behavior**: Images served via ngrok public tunnel, accessible to LINE
- **Use Case**: Local development with full image functionality
- **Pros**: Full image support, no external hosting needed, works immediately
- **Cons**: URL changes when ngrok restarts, not for production

### 4. Use Image Hosting Service (Recommended for Production)
```bash
LINE_ALLOW_LOCAL_IMAGES=false
LINE_IMAGE_HOSTING_SERVICE=imgur
```
- **Behavior**: Images uploaded to hosting service, then sent to LINE
- **Use Case**: Production environment with public image access
- **Pros**: Reliable image delivery, works everywhere
- **Cons**: Requires external service setup

## Current Behavior

### Default Settings (`LINE_ALLOW_LOCAL_IMAGES=false`):
1. **Ticket Created** → System detects images
2. **Image Check** → Filters out localhost URLs
3. **LINE Notification** → Text only (no images)
4. **Log Output** → Shows image count and accessibility status

### With Ngrok (`LINE_ALLOW_LOCAL_IMAGES=true` + `BACKEND_URL=https://ngrok-url.ngrok.io`):
1. **Ticket Created** → System detects images
2. **Image Check** → All images accessible via ngrok
3. **LINE Notification** → Text + images
4. **Log Output** → Shows all images as accessible

## Testing the Current Setup

### Without Ngrok (Default):
1. **Create a ticket with images**
2. **Check backend logs** for:
   ```
   LINE Image Debug Info: {
     "total": 2,
     "accessible": 0,
     "local": 2
   }
   ```
3. **LINE notification** will be text-only
4. **Images are still stored** in your database and accessible via web interface

### With Ngrok (Full Image Support):
1. **Start ngrok**: `ngrok http 3001`
2. **Update .env**: `BACKEND_URL=https://your-ngrok-url.ngrok.io`
3. **Set**: `LINE_ALLOW_LOCAL_IMAGES=true`
4. **Restart backend** to pick up new environment variables
5. **Create a ticket with images**
6. **Check logs** - should show all images as accessible
7. **LINE notification** will include text + images!

## Next Steps for Production

When you're ready to deploy with image support:

1. **Set up a public domain** for your backend
2. **Configure image hosting service** (Imgur, Cloudinary, etc.)
3. **Update BACKEND_URL** to your public domain
4. **Test with public image URLs**

## Troubleshooting

### Images Not Showing in LINE (Default)
- ✅ **Expected behavior** for localhost URLs
- ✅ Check logs: "0 accessible for LINE"
- ✅ LINE servers cannot access localhost

### Images Not Showing with Ngrok
- ❌ **Check ngrok URL** in .env file
- ❌ **Verify ngrok is running** and accessible
- ❌ **Restart backend** after changing environment variables
- ❌ **Check ngrok tunnel** is active and forwarding correctly

### Want to Test with Images
- Use public image URLs (https://example.com/image.jpg)
- Set `LINE_ALLOW_LOCAL_IMAGES=true` temporarily
- Upload images to a public hosting service

### Production Deployment
- Use public domain for backend
- Implement image hosting service
- Set `LINE_ALLOW_LOCAL_IMAGES=false`
- Configure `BACKEND_URL` to public domain
