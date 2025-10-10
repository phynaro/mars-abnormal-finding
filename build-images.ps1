# Build script for portable Docker images
param(
    [string]$Version = "latest",
    [string]$Registry = "",
    [string]$Platform = "linux/amd64"
)

# Configuration
$BackendImageName = "mars-backend"
$FrontendImageName = "mars-frontend"
$NginxImageName = "mars-nginx"

Write-Host "Building Docker images for $Platform..." -ForegroundColor Yellow

# Build backend image
Write-Host "Building backend image for $Platform..." -ForegroundColor Yellow
docker build --platform $Platform -f backend/Dockerfile.production -t "${Registry}${BackendImageName}:${Version}" ./backend

if ($LASTEXITCODE -ne 0) {
    Write-Host "Backend build failed!" -ForegroundColor Red
    exit 1
}

# Build frontend image
Write-Host "Building frontend image for $Platform..." -ForegroundColor Yellow
docker build --platform $Platform `
    --build-arg NODE_ENV=production `
    --build-arg VITE_API_URL=/api `
    --build-arg VITE_LIFF_ID=2007697113-EWn7vw08 `
    -f frontend/Dockerfile.production `
    -t "${Registry}${FrontendImageName}:${Version}" ./frontend

if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed!" -ForegroundColor Red
    exit 1
}

# Build nginx image with configuration
Write-Host "Building nginx image for $Platform..." -ForegroundColor Yellow
docker build --platform $Platform -f Dockerfile.nginx -t "${Registry}${NginxImageName}:${Version}" .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Nginx build failed!" -ForegroundColor Red
    exit 1
}

# Create image archive
Write-Host "Creating image archive..." -ForegroundColor Yellow
$ArchiveName = "mars-images-${Version}.tar.gz"
docker save "${Registry}${BackendImageName}:${Version}" "${Registry}${FrontendImageName}:${Version}" "${Registry}${NginxImageName}:${Version}" | gzip > $ArchiveName

if ($LASTEXITCODE -ne 0) {
    Write-Host "Archive creation failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host "Images:" -ForegroundColor Green
Write-Host "  - ${Registry}${BackendImageName}:${Version}" -ForegroundColor Green
Write-Host "  - ${Registry}${FrontendImageName}:${Version}" -ForegroundColor Green
Write-Host "  - ${Registry}${NginxImageName}:${Version}" -ForegroundColor Green
Write-Host "Archive: $ArchiveName" -ForegroundColor Green
Write-Host ""
Write-Host "To deploy on target server:" -ForegroundColor Yellow
Write-Host "1. Copy $ArchiveName to target server" -ForegroundColor Yellow
Write-Host "2. Run: docker load < $ArchiveName" -ForegroundColor Yellow
Write-Host "3. Copy deployment files and run: docker-compose -f docker-compose.deploy.yml up -d" -ForegroundColor Yellow
Write-Host ""
Write-Host "Usage examples:" -ForegroundColor Yellow
Write-Host "  Build for AMD64 servers: .\build-images.ps1 -Version latest -Registry '' -Platform linux/amd64" -ForegroundColor Yellow
Write-Host "  Build for ARM64 servers: .\build-images.ps1 -Version latest -Registry '' -Platform linux/arm64" -ForegroundColor Yellow
Write-Host "  Build for both platforms: .\build-images.ps1 -Version latest -Registry '' -Platform linux/amd64,linux/arm64" -ForegroundColor Yellow
