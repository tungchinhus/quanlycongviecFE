# Script kiểm tra deployment trên IIS
# Chạy với quyền Administrator

param(
    [string]$IISPath = "C:\inetpub\wwwroot\quanlyfileFe"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deployment Check Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kiểm tra thư mục tồn tại
Write-Host "1. Checking directory..." -ForegroundColor Yellow
if (-not (Test-Path $IISPath)) {
    Write-Host "   ERROR: Directory not found: $IISPath" -ForegroundColor Red
    Write-Host "   Please check the IIS path!" -ForegroundColor Red
    exit 1
} else {
    Write-Host "   OK: Directory exists" -ForegroundColor Green
}

# Kiểm tra index.html
Write-Host ""
Write-Host "2. Checking index.html..." -ForegroundColor Yellow
$indexPath = "$IISPath\index.html"
if (-not (Test-Path $indexPath)) {
    Write-Host "   ERROR: index.html not found!" -ForegroundColor Red
    Write-Host "   This is critical - the page cannot load without index.html" -ForegroundColor Red
} else {
    Write-Host "   OK: index.html found" -ForegroundColor Green
    
    # Kiểm tra base href
    $indexContent = Get-Content $indexPath -Raw
    if ($indexContent -match '<base href="([^"]+)">') {
        $baseHref = $matches[1]
        Write-Host "   Base href: $baseHref" -ForegroundColor Cyan
        if ($baseHref -ne "/" -and $baseHref -notmatch "^/quanlyfile") {
            Write-Host "   WARNING: Base href might be incorrect!" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   WARNING: Base href not found in index.html!" -ForegroundColor Yellow
    }
}

# Kiểm tra web.config
Write-Host ""
Write-Host "3. Checking web.config..." -ForegroundColor Yellow
$webConfigPath = "$IISPath\web.config"
if (-not (Test-Path $webConfigPath)) {
    Write-Host "   WARNING: web.config not found!" -ForegroundColor Yellow
    Write-Host "   Angular routing might not work!" -ForegroundColor Yellow
} else {
    Write-Host "   OK: web.config found" -ForegroundColor Green
    
    # Kiểm tra có httpProtocol trùng lặp không
    $webConfigContent = Get-Content $webConfigPath -Raw
    $httpProtocolCount = ([regex]::Matches($webConfigContent, '<httpProtocol>')).Count
    if ($httpProtocolCount -gt 1) {
        Write-Host "   ERROR: Multiple httpProtocol sections found ($httpProtocolCount)!" -ForegroundColor Red
        Write-Host "   This will cause 500.19 error!" -ForegroundColor Red
    } else {
        Write-Host "   OK: Only one httpProtocol section" -ForegroundColor Green
    }
}

# Kiểm tra JS files
Write-Host ""
Write-Host "4. Checking JavaScript files..." -ForegroundColor Yellow
$jsFiles = Get-ChildItem -Path $IISPath -Filter "*.js" -File -ErrorAction SilentlyContinue
if ($jsFiles.Count -eq 0) {
    Write-Host "   ERROR: No JS files found!" -ForegroundColor Red
    Write-Host "   Application cannot run without JS files!" -ForegroundColor Red
} else {
    Write-Host "   OK: Found $($jsFiles.Count) JS files" -ForegroundColor Green
    
    # Kiểm tra các file quan trọng
    $requiredFiles = @("main.", "polyfills.", "runtime.", "styles.")
    $foundRequired = @()
    foreach ($file in $jsFiles) {
        foreach ($required in $requiredFiles) {
            if ($file.Name -like "$required*") {
                $foundRequired += $required
                break
            }
        }
    }
    
    if ($foundRequired.Count -lt 3) {
        Write-Host "   WARNING: Some required files might be missing!" -ForegroundColor Yellow
        Write-Host "   Found: $($foundRequired -join ', ')" -ForegroundColor Yellow
    } else {
        Write-Host "   OK: Required files found" -ForegroundColor Green
    }
}

# Kiểm tra CSS files
Write-Host ""
Write-Host "5. Checking CSS files..." -ForegroundColor Yellow
$cssFiles = Get-ChildItem -Path $IISPath -Filter "*.css" -File -ErrorAction SilentlyContinue
if ($cssFiles.Count -eq 0) {
    Write-Host "   WARNING: No CSS files found!" -ForegroundColor Yellow
    Write-Host "   Page might not have styles!" -ForegroundColor Yellow
} else {
    Write-Host "   OK: Found $($cssFiles.Count) CSS files" -ForegroundColor Green
}

# Kiểm tra assets
Write-Host ""
Write-Host "6. Checking assets folder..." -ForegroundColor Yellow
$assetsPath = "$IISPath\assets"
if (-not (Test-Path $assetsPath)) {
    Write-Host "   WARNING: assets folder not found!" -ForegroundColor Yellow
} else {
    Write-Host "   OK: assets folder found" -ForegroundColor Green
    $assetFiles = Get-ChildItem -Path $assetsPath -Recurse -File -ErrorAction SilentlyContinue
    Write-Host "   Found $($assetFiles.Count) asset files" -ForegroundColor Cyan
}

# Kiểm tra permissions
Write-Host ""
Write-Host "7. Checking permissions..." -ForegroundColor Yellow
try {
    $acl = Get-Acl $IISPath
    $hasIISUsers = $false
    $hasIUSR = $false
    
    foreach ($access in $acl.Access) {
        if ($access.IdentityReference -like "*IIS_IUSRS*") {
            $hasIISUsers = $true
        }
        if ($access.IdentityReference -like "*IUSR*") {
            $hasIUSR = $true
        }
    }
    
    if (-not $hasIISUsers -and -not $hasIUSR) {
        Write-Host "   WARNING: IIS_IUSRS or IUSR permissions might be missing!" -ForegroundColor Yellow
        Write-Host "   This might cause access denied errors!" -ForegroundColor Yellow
    } else {
        Write-Host "   OK: IIS permissions found" -ForegroundColor Green
    }
} catch {
    Write-Host "   WARNING: Could not check permissions: $_" -ForegroundColor Yellow
}

# Tổng kết
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps if page is still blank:" -ForegroundColor Yellow
Write-Host "1. Open browser DevTools (F12)" -ForegroundColor White
Write-Host "2. Check Console tab for errors" -ForegroundColor White
Write-Host "3. Check Network tab - are files loading?" -ForegroundColor White
Write-Host "4. Try accessing: http://localsite.thibidi.com/index.html directly" -ForegroundColor White
Write-Host "5. Check IIS logs: C:\inetpub\logs\LogFiles\" -ForegroundColor White
Write-Host ""

