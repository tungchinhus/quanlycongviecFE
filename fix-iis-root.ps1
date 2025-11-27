# Script để fix Physical Path (Root) của IIS Site
# Chạy với quyền Administrator

Import-Module WebAdministration

$siteName = "quanlyfile"
$defaultIISPath = "C:\inetpub\wwwroot\quanlyfile-fe"
$projectRoot = Split-Path -Parent $PSScriptRoot
$distPath = Join-Path $projectRoot "dist\quanlyfile-fe"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Fix IIS Physical Path (Root)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Bước 1: Kiểm tra website tồn tại
Write-Host "1. Checking website '$siteName'..." -ForegroundColor Yellow
$website = Get-Website -Name $siteName -ErrorAction SilentlyContinue

if (-not $website) {
    Write-Host "   ERROR: Website '$siteName' not found!" -ForegroundColor Red
    Write-Host "   Available websites:" -ForegroundColor Yellow
    Get-Website | ForEach-Object { Write-Host "     - $($_.Name)" -ForegroundColor Gray }
    exit 1
} else {
    Write-Host "   OK: Website '$siteName' found" -ForegroundColor Green
    Write-Host "   State: $($website.State)" -ForegroundColor Cyan
}

# Bước 2: Lấy physical path hiện tại
Write-Host ""
Write-Host "2. Checking current physical path..." -ForegroundColor Yellow

$currentPath = (Get-WebFilePath -PSPath "IIS:\Sites\$siteName").FullName
Write-Host "   Current path: $currentPath" -ForegroundColor Cyan

# Kiểm tra xem path có đúng không
if ($currentPath -like "*inetpub\wwwroot*" -and $currentPath -notlike "*quanlyfile*") {
    Write-Host "   WARNING: Path points to default IIS directory!" -ForegroundColor Red
    Write-Host "   This is why you see the default IIS welcome page" -ForegroundColor Red
} elseif (Test-Path $currentPath) {
    $hasIndexHtml = Test-Path (Join-Path $currentPath "index.html")
    if ($hasIndexHtml) {
        Write-Host "   OK: Path exists and contains index.html" -ForegroundColor Green
    } else {
        Write-Host "   WARNING: Path exists but no index.html found" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ERROR: Path does not exist!" -ForegroundColor Red
}

# Bước 3: Tìm đường dẫn đúng
Write-Host ""
Write-Host "3. Finding correct path..." -ForegroundColor Yellow

$correctPath = $null

# Ưu tiên 1: Kiểm tra dist folder trong project
if (Test-Path $distPath) {
    $hasIndexHtml = Test-Path (Join-Path $distPath "index.html")
    if ($hasIndexHtml) {
        $correctPath = $distPath
        Write-Host "   Found: $distPath (project dist folder)" -ForegroundColor Green
    }
}

# Ưu tiên 2: Kiểm tra default IIS path
if (-not $correctPath -and (Test-Path $defaultIISPath)) {
    $hasIndexHtml = Test-Path (Join-Path $defaultIISPath "index.html")
    if ($hasIndexHtml) {
        $correctPath = $defaultIISPath
        Write-Host "   Found: $defaultIISPath (default IIS path)" -ForegroundColor Green
    }
}

# Nếu không tìm thấy, hỏi user
if (-not $correctPath) {
    Write-Host ""
    Write-Host "   Could not find Angular build folder automatically" -ForegroundColor Yellow
    Write-Host "   Please provide the correct path to your Angular dist folder" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Expected locations:" -ForegroundColor Cyan
    Write-Host "     - $distPath" -ForegroundColor Gray
    Write-Host "     - $defaultIISPath" -ForegroundColor Gray
    Write-Host ""
    
    $userPath = Read-Host "   Enter path to dist/quanlyfile-fe folder (or press Enter to skip)"
    
    if ($userPath -and (Test-Path $userPath)) {
        $hasIndexHtml = Test-Path (Join-Path $userPath "index.html")
        if ($hasIndexHtml) {
            $correctPath = $userPath
            Write-Host "   OK: Using path: $correctPath" -ForegroundColor Green
        } else {
            Write-Host "   ERROR: Path does not contain index.html" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "   ERROR: Invalid path or path not provided" -ForegroundColor Red
        Write-Host ""
        Write-Host "   Please:" -ForegroundColor Yellow
        Write-Host "   1. Build your Angular app: npm run build" -ForegroundColor White
        Write-Host "   2. Or copy files to: $defaultIISPath" -ForegroundColor White
        Write-Host "   3. Run this script again" -ForegroundColor White
        exit 1
    }
}

# Bước 4: So sánh và cập nhật path
Write-Host ""
Write-Host "4. Updating physical path..." -ForegroundColor Yellow

# Normalize paths for comparison
$currentPathNormalized = $currentPath.TrimEnd('\')
$correctPathNormalized = $correctPath.TrimEnd('\')

if ($currentPathNormalized -eq $correctPathNormalized) {
    Write-Host "   OK: Physical path is already correct!" -ForegroundColor Green
    Write-Host "   No changes needed" -ForegroundColor Green
} else {
    Write-Host "   Current: $currentPath" -ForegroundColor Gray
    Write-Host "   New:     $correctPath" -ForegroundColor Gray
    Write-Host ""
    
    $confirm = Read-Host "   Update physical path? (Y/N)"
    if ($confirm -eq "Y" -or $confirm -eq "y") {
        try {
            # Stop website trước khi thay đổi
            if ($website.State -eq "Started") {
                Write-Host "   Stopping website..." -ForegroundColor Yellow
                Stop-WebSite -Name $siteName
                Start-Sleep -Seconds 1
            }
            
            # Cập nhật physical path
            Set-ItemProperty -Path "IIS:\Sites\$siteName" -Name physicalPath -Value $correctPath
            Write-Host "   OK: Physical path updated!" -ForegroundColor Green
            
            # Start lại website
            Write-Host "   Starting website..." -ForegroundColor Yellow
            Start-WebSite -Name $siteName
            Write-Host "   OK: Website started" -ForegroundColor Green
            
        } catch {
            Write-Host "   ERROR: Failed to update physical path: $_" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "   Skipped: Physical path not updated" -ForegroundColor Yellow
    }
}

# Bước 5: Kiểm tra lại
Write-Host ""
Write-Host "5. Verifying configuration..." -ForegroundColor Yellow

$finalPath = (Get-WebFilePath -PSPath "IIS:\Sites\$siteName").FullName
Write-Host "   Physical path: $finalPath" -ForegroundColor Cyan

$hasIndexHtml = Test-Path (Join-Path $finalPath "index.html")
$hasWebConfig = Test-Path (Join-Path $finalPath "web.config")

if ($hasIndexHtml) {
    Write-Host "   OK: index.html found" -ForegroundColor Green
} else {
    Write-Host "   WARNING: index.html not found!" -ForegroundColor Yellow
}

if ($hasWebConfig) {
    Write-Host "   OK: web.config found" -ForegroundColor Green
} else {
    Write-Host "   WARNING: web.config not found!" -ForegroundColor Yellow
    Write-Host "   Angular routing may not work without web.config" -ForegroundColor Yellow
}

# Bước 6: Restart Application Pool
Write-Host ""
Write-Host "6. Restarting Application Pool..." -ForegroundColor Yellow

try {
    $appPoolName = $website.applicationPool
    Restart-WebAppPool -Name $appPoolName
    Write-Host "   OK: Application Pool '$appPoolName' restarted" -ForegroundColor Green
} catch {
    Write-Host "   WARNING: Could not restart Application Pool" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Configuration Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Current configuration:" -ForegroundColor Yellow
Write-Host "  Site name: $siteName" -ForegroundColor White
Write-Host "  Physical path: $finalPath" -ForegroundColor White
Write-Host ""
Write-Host "Test URLs:" -ForegroundColor Yellow
Write-Host "  http://localsite.thibidi.com/" -ForegroundColor White
Write-Host "  http://localsite.thibidi.com/index.html" -ForegroundColor White
Write-Host ""
Write-Host "If you still see the default IIS page:" -ForegroundColor Yellow
Write-Host "  1. Clear browser cache (Ctrl+F5)" -ForegroundColor White
Write-Host "  2. Check bindings in IIS Manager" -ForegroundColor White
Write-Host "  3. Stop 'Default Web Site' if needed" -ForegroundColor White
Write-Host ""

