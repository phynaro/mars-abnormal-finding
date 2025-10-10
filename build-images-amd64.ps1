# Build script for AMD64 servers (Intel/AMD processors)

Write-Host "Building images for AMD64 servers..." -ForegroundColor Yellow
Write-Host "This will build images compatible with Intel/AMD processors." -ForegroundColor Yellow
Write-Host ""

# Call the main build script with AMD64 platform
.\build-images.ps1 -Version latest -Registry "" -Platform linux/amd64

if ($LASTEXITCODE -eq 0) {
    Write-Host "AMD64 images built successfully!" -ForegroundColor Green
    Write-Host "These images will work on Intel/AMD servers." -ForegroundColor Green
} else {
    Write-Host "AMD64 build failed!" -ForegroundColor Red
    exit 1
}
