# Script để fix Default Document và Routing
# Chạy với quyền Administrator

Import-Module WebAdministration

$siteName = "quanlyfile"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Fix Default Document & Routing" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Bước 1: Kiểm tra và cấu hình Default Document
Write-Host "1. Configuring Default Document..." -ForegroundColor Yellow

# Lấy danh sách Default Documents hiện tại
$defaultDocs = Get-WebConfigurationProperty -PSPath "IIS:\Sites\$siteName" -Filter "system.webServer/defaultDocument/files" -Name "collection"

# Kiểm tra xem index.html đã có chưa
$indexExists = $defaultDocs | Where-Object { $_.value -eq "index.html" }

if ($indexExists) {
    Write-Host "   index.html already exists" -ForegroundColor Yellow
    
    # Kiểm tra vị trí
    $indexIndex = 0
    foreach ($doc in $defaultDocs) {
        if ($doc.value -eq "index.html") {
            break
        }
        $indexIndex++
    }
    
    if ($indexIndex -gt 0) {
        Write-Host "   Moving index.html to top..." -ForegroundColor Yellow
        # Xóa index.html khỏi vị trí hiện tại
        Remove-WebConfigurationProperty -PSPath "IIS:\Sites\$siteName" -Filter "system.webServer/defaultDocument/files" -Name "." -AtElement @{value="index.html"}
        # Thêm lại ở đầu
        Add-WebConfigurationProperty -PSPath "IIS:\Sites\$siteName" -Filter "system.webServer/defaultDocument/files" -Name "." -Value @{value="index.html"} -AtElement 0
        Write-Host "   OK: index.html moved to top" -ForegroundColor Green
    } else {
        Write-Host "   OK: index.html is already at top" -ForegroundColor Green
    }
} else {
    Write-Host "   Adding index.html..." -ForegroundColor Yellow
    # Thêm index.html vào đầu danh sách
    Add-WebConfigurationProperty -PSPath "IIS:\Sites\$siteName" -Filter "system.webServer/defaultDocument/files" -Name "." -Value @{value="index.html"} -AtElement 0
    Write-Host "   OK: index.html added to Default Documents" -ForegroundColor Green
}

# Bước 2: Kiểm tra URL Rewrite Module
Write-Host ""
Write-Host "2. Checking URL Rewrite Module..." -ForegroundColor Yellow

try {
    $rewriteModule = Get-WebGlobalModule | Where-Object { $_.Name -eq "RewriteModule" }
    if ($rewriteModule) {
        Write-Host "   OK: URL Rewrite Module is installed" -ForegroundColor Green
    } else {
        Write-Host "   WARNING: URL Rewrite Module might not be installed" -ForegroundColor Yellow
        Write-Host "   Download from: https://www.iis.net/downloads/microsoft/url-rewrite" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   Could not check URL Rewrite Module" -ForegroundColor Yellow
}

# Bước 3: Kiểm tra web.config
Write-Host ""
Write-Host "3. Checking web.config..." -ForegroundColor Yellow

$webConfigPath = "C:\inetpub\wwwroot\quanlyfileFe\web.config"
if (Test-Path $webConfigPath) {
    $webConfigContent = Get-Content $webConfigPath -Raw
    
    # Kiểm tra có rewrite rules không
    if ($webConfigContent -match '<rule name="Angular Routes"') {
        Write-Host "   OK: Angular routing rule found in web.config" -ForegroundColor Green
    } else {
        Write-Host "   WARNING: Angular routing rule not found in web.config" -ForegroundColor Yellow
    }
    
    # Kiểm tra có httpProtocol trùng lặp không
    $httpProtocolCount = ([regex]::Matches($webConfigContent, '<httpProtocol>')).Count
    if ($httpProtocolCount -gt 1) {
        Write-Host "   ERROR: Multiple httpProtocol sections found!" -ForegroundColor Red
        Write-Host "   This will cause errors. Please fix web.config" -ForegroundColor Red
    } else {
        Write-Host "   OK: Only one httpProtocol section" -ForegroundColor Green
    }
} else {
    Write-Host "   WARNING: web.config not found!" -ForegroundColor Yellow
    Write-Host "   Angular routing will not work without web.config" -ForegroundColor Yellow
}

# Bước 4: Enable Default Document
Write-Host ""
Write-Host "4. Enabling Default Document feature..." -ForegroundColor Yellow

try {
    Set-WebConfigurationProperty -PSPath "IIS:\Sites\$siteName" -Filter "system.webServer/defaultDocument" -Name "enabled" -Value $true
    Write-Host "   OK: Default Document is enabled" -ForegroundColor Green
} catch {
    Write-Host "   Could not enable Default Document" -ForegroundColor Yellow
}

# Bước 5: Restart Application Pool
Write-Host ""
Write-Host "5. Restarting Application Pool..." -ForegroundColor Yellow

try {
    $appPoolName = (Get-Website -Name $siteName).applicationPool
    Restart-WebAppPool -Name $appPoolName
    Write-Host "   OK: Application Pool '$appPoolName' restarted" -ForegroundColor Green
} catch {
    Write-Host "   WARNING: Could not restart Application Pool" -ForegroundColor Yellow
    Write-Host "   Please restart manually in IIS Manager" -ForegroundColor Yellow
}

# Bước 6: Restart Website
Write-Host ""
Write-Host "6. Restarting Website..." -ForegroundColor Yellow

try {
    Stop-WebSite -Name $siteName
    Start-Sleep -Seconds 2
    Start-WebSite -Name $siteName
    Write-Host "   OK: Website '$siteName' restarted" -ForegroundColor Green
} catch {
    Write-Host "   WARNING: Could not restart website" -ForegroundColor Yellow
    Write-Host "   Please restart manually in IIS Manager" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Configuration Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test: http://localsite.thibidi.com/" -ForegroundColor White
Write-Host "2. Test: http://localsite.thibidi.com/index.html" -ForegroundColor White
Write-Host "3. If still blank, check:" -ForegroundColor White
Write-Host "   - URL Rewrite Module is installed" -ForegroundColor Gray
Write-Host "   - web.config is correct" -ForegroundColor Gray
Write-Host "   - Browser cache (Ctrl+F5)" -ForegroundColor Gray
Write-Host ""

