# PowerShell Script để Build và Deploy Angular App lên IIS
# Chạy script này với quyền Administrator

param(
    [string]$IISPath = "C:\inetpub\wwwroot\quanlyfile-fe",
    [switch]$SkipBuild = $false,
    [switch]$Backup = $true
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Angular IIS Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kiểm tra Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js is not installed or not in PATH!" -ForegroundColor Red
    exit 1
}

# Kiểm tra npm
Write-Host "Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: npm is not installed or not in PATH!" -ForegroundColor Red
    exit 1
}

# Build application
if (-not $SkipBuild) {
    Write-Host ""
    Write-Host "Building Angular application..." -ForegroundColor Yellow
    Write-Host "This may take a few minutes..." -ForegroundColor Yellow
    
    npm run build:prod
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "ERROR: Build failed!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "Build completed successfully!" -ForegroundColor Green
} else {
    Write-Host "Skipping build (--SkipBuild flag set)" -ForegroundColor Yellow
}

# Kiểm tra thư mục dist
$distPath = ".\dist\quanlyfile-fe"
if (-not (Test-Path $distPath)) {
    Write-Host ""
    Write-Host "ERROR: Build output not found at: $distPath" -ForegroundColor Red
    Write-Host "Please run 'npm run build:prod' first" -ForegroundColor Red
    exit 1
}

# Backup thư mục cũ (nếu tồn tại)
if ($Backup -and (Test-Path $IISPath)) {
    Write-Host ""
    Write-Host "Backing up existing files..." -ForegroundColor Yellow
    $backupPath = "$IISPath-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    
    try {
        Copy-Item -Path $IISPath -Destination $backupPath -Recurse -Force
        Write-Host "Backup created at: $backupPath" -ForegroundColor Green
    } catch {
        Write-Host "WARNING: Could not create backup: $_" -ForegroundColor Yellow
    }
}

# Tạo thư mục IIS nếu chưa tồn tại
if (-not (Test-Path $IISPath)) {
    Write-Host ""
    Write-Host "Creating IIS directory: $IISPath" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $IISPath -Force | Out-Null
}

# Copy web.config (ưu tiên từ dist, nếu không có thì từ root)
$webConfigSource = "$distPath\web.config"
$webConfigDest = "$IISPath\web.config"
if (Test-Path $webConfigSource) {
    Write-Host ""
    Write-Host "Copying web.config from dist..." -ForegroundColor Yellow
    Copy-Item -Path $webConfigSource -Destination $webConfigDest -Force
    Write-Host "web.config copied" -ForegroundColor Green
} elseif (Test-Path ".\web.config") {
    Write-Host ""
    Write-Host "Copying web.config from root..." -ForegroundColor Yellow
    Copy-Item -Path ".\web.config" -Destination $webConfigDest -Force
    Write-Host "web.config copied" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "WARNING: web.config not found" -ForegroundColor Yellow
    Write-Host "Please create web.config manually" -ForegroundColor Yellow
}

# Copy files mới
Write-Host ""
Write-Host "Copying files to IIS..." -ForegroundColor Yellow
Write-Host "Source: $distPath" -ForegroundColor Gray
Write-Host "Destination: $IISPath" -ForegroundColor Gray

try {
    # Xóa files cũ (trừ web.config nếu đã có)
    if (Test-Path $IISPath) {
        Get-ChildItem -Path $IISPath -Exclude "web.config" | Remove-Item -Recurse -Force
    }
    
    # Copy files mới
    Copy-Item -Path "$distPath\*" -Destination $IISPath -Recurse -Force
    
    Write-Host "Files copied successfully!" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "ERROR: Failed to copy files: $_" -ForegroundColor Red
    exit 1
}

# Set permissions (optional - uncomment nếu cần)
# Write-Host ""
# Write-Host "Setting permissions..." -ForegroundColor Yellow
# $acl = Get-Acl $IISPath
# $permission = "IIS_IUSRS","ReadAndExecute","ContainerInherit,ObjectInherit","None","Allow"
# $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule $permission
# $acl.SetAccessRule($accessRule)
# Set-Acl $IISPath $acl
# Write-Host "Permissions set" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deployment Completed Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Files deployed to: $IISPath" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Verify website in IIS Manager" -ForegroundColor White
Write-Host "2. Test the application in browser" -ForegroundColor White
Write-Host "3. Check IIS logs if there are any issues" -ForegroundColor White
Write-Host ""

