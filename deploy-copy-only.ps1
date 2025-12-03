# Script đơn giản để copy files đã build lên IIS
# Chạy script này với quyền Administrator (nếu cần)

param(
    [string]$IISPath = "C:\inetpub\wwwroot\quanlyfile-fe",
    [switch]$Backup = $true
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Copy Files to IIS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kiểm tra thư mục dist
$distPath = ".\dist\quanlyfile-fe"
if (-not (Test-Path $distPath)) {
    Write-Host "ERROR: Build output not found at: $distPath" -ForegroundColor Red
    Write-Host "Please run 'npm run build:prod' first" -ForegroundColor Red
    exit 1
}

Write-Host "Source: $distPath" -ForegroundColor Yellow
Write-Host "Destination: $IISPath" -ForegroundColor Yellow
Write-Host ""

# Backup thư mục cũ (nếu tồn tại)
if ($Backup -and (Test-Path $IISPath)) {
    Write-Host "Backing up existing files..." -ForegroundColor Yellow
    $backupPath = "$IISPath-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    
    try {
        Copy-Item -Path $IISPath -Destination $backupPath -Recurse -Force
        Write-Host "Backup created at: $backupPath" -ForegroundColor Green
    } catch {
        Write-Host "WARNING: Could not create backup: $_" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Tạo thư mục IIS nếu chưa tồn tại
if (-not (Test-Path $IISPath)) {
    Write-Host "Creating IIS directory: $IISPath" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $IISPath -Force | Out-Null
    Write-Host ""
}

# Copy web.config
$webConfigSource = "$distPath\web.config"
$webConfigDest = "$IISPath\web.config"
if (Test-Path $webConfigSource) {
    Write-Host "Copying web.config..." -ForegroundColor Yellow
    Copy-Item -Path $webConfigSource -Destination $webConfigDest -Force
    Write-Host "web.config copied" -ForegroundColor Green
} elseif (Test-Path ".\web.config") {
    Write-Host "Copying web.config from root..." -ForegroundColor Yellow
    Copy-Item -Path ".\web.config" -Destination $webConfigDest -Force
    Write-Host "web.config copied" -ForegroundColor Green
} else {
    Write-Host "WARNING: web.config not found" -ForegroundColor Yellow
}
Write-Host ""

# Copy files mới
Write-Host "Copying files to IIS..." -ForegroundColor Yellow

try {
    # Xóa files cũ (trừ web.config nếu đã có)
    if (Test-Path $IISPath) {
        Get-ChildItem -Path $IISPath -Exclude "web.config" | Remove-Item -Recurse -Force
    }
    
    # Copy files mới
    Copy-Item -Path "$distPath\*" -Destination $IISPath -Recurse -Force
    
    Write-Host ""
    Write-Host "Files copied successfully!" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "ERROR: Failed to copy files: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deployment Completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Files deployed to: $IISPath" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test the application in browser" -ForegroundColor White
Write-Host "2. Clear browser cache if needed" -ForegroundColor White
Write-Host ""

