# Script để fix IIS Binding và Default Document
# Chạy với quyền Administrator

Import-Module WebAdministration

$siteName = "quanlyfile"
$hostName = "localsite.thibidi.com"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Fix IIS Binding & Default Document" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Bước 1: Kiểm tra website tồn tại
Write-Host "1. Checking website..." -ForegroundColor Yellow
$website = Get-Website -Name $siteName -ErrorAction SilentlyContinue

if (-not $website) {
    Write-Host "   ERROR: Website '$siteName' not found!" -ForegroundColor Red
    Write-Host "   Please create the website first in IIS Manager" -ForegroundColor Red
    exit 1
} else {
    Write-Host "   OK: Website '$siteName' found" -ForegroundColor Green
    Write-Host "   State: $($website.State)" -ForegroundColor Cyan
}

# Bước 2: Kiểm tra bindings
Write-Host ""
Write-Host "2. Checking bindings..." -ForegroundColor Yellow

$bindings = Get-WebBinding -Name $siteName
$hasCorrectBinding = $false

foreach ($binding in $bindings) {
    Write-Host "   Binding: $($binding.protocol)://$($binding.bindingInformation)" -ForegroundColor Gray
    
    if ($binding.protocol -eq "http" -and $binding.bindingInformation -like "*$hostName*") {
        $hasCorrectBinding = $true
        Write-Host "   OK: Found correct binding for $hostName" -ForegroundColor Green
    }
}

if (-not $hasCorrectBinding) {
    Write-Host "   WARNING: No binding found for $hostName" -ForegroundColor Yellow
    Write-Host "   Adding binding..." -ForegroundColor Yellow
    
    try {
        New-WebBinding -Name $siteName -Protocol http -Port 80 -HostHeader $hostName
        Write-Host "   OK: Binding added for $hostName on port 80" -ForegroundColor Green
    } catch {
        Write-Host "   ERROR: Could not add binding: $_" -ForegroundColor Red
    }
}

# Bước 3: Kiểm tra Default Web Site
Write-Host ""
Write-Host "3. Checking Default Web Site..." -ForegroundColor Yellow

$defaultSite = Get-Website -Name "Default Web Site" -ErrorAction SilentlyContinue
if ($defaultSite) {
    $defaultBindings = Get-WebBinding -Name "Default Web Site"
    $defaultSiteHasPort80 = $false
    
    foreach ($binding in $defaultBindings) {
        if ($binding.protocol -eq "http" -and $binding.bindingInformation -like "*:80:*") {
            $defaultSiteHasPort80 = $true
            break
        }
    }
    
    if ($defaultSiteHasPort80) {
        Write-Host "   WARNING: Default Web Site is also using port 80" -ForegroundColor Yellow
        Write-Host "   This might cause conflicts" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   Options:" -ForegroundColor Yellow
        Write-Host "   1. Stop Default Web Site (recommended)" -ForegroundColor White
        Write-Host "   2. Change Default Web Site to different port" -ForegroundColor White
        Write-Host "   3. Add specific host header to Default Web Site" -ForegroundColor White
        Write-Host ""
        
        $response = Read-Host "   Stop Default Web Site? (Y/N)"
        if ($response -eq "Y" -or $response -eq "y") {
            Stop-WebSite -Name "Default Web Site"
            Write-Host "   OK: Default Web Site stopped" -ForegroundColor Green
        }
    } else {
        Write-Host "   OK: Default Web Site not using port 80" -ForegroundColor Green
    }
}

# Bước 4: Cấu hình Default Document
Write-Host ""
Write-Host "4. Configuring Default Document..." -ForegroundColor Yellow

# Enable Default Document
try {
    Set-WebConfigurationProperty -PSPath "IIS:\Sites\$siteName" -Filter "system.webServer/defaultDocument" -Name "enabled" -Value $true
    Write-Host "   OK: Default Document enabled" -ForegroundColor Green
} catch {
    Write-Host "   WARNING: Could not enable Default Document" -ForegroundColor Yellow
}

# Lấy danh sách Default Documents
$defaultDocs = Get-WebConfigurationProperty -PSPath "IIS:\Sites\$siteName" -Filter "system.webServer/defaultDocument/files" -Name "collection"

# Kiểm tra index.html
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
        # Xóa và thêm lại ở đầu
        Remove-WebConfigurationProperty -PSPath "IIS:\Sites\$siteName" -Filter "system.webServer/defaultDocument/files" -Name "." -AtElement @{value="index.html"}
        Add-WebConfigurationProperty -PSPath "IIS:\Sites\$siteName" -Filter "system.webServer/defaultDocument/files" -Name "." -Value @{value="index.html"} -AtElement 0
        Write-Host "   OK: index.html moved to top" -ForegroundColor Green
    } else {
        Write-Host "   OK: index.html is already at top" -ForegroundColor Green
    }
} else {
    Write-Host "   Adding index.html..." -ForegroundColor Yellow
    Add-WebConfigurationProperty -PSPath "IIS:\Sites\$siteName" -Filter "system.webServer/defaultDocument/files" -Name "." -Value @{value="index.html"} -AtElement 0
    Write-Host "   OK: index.html added to Default Documents" -ForegroundColor Green
}

# Bước 5: Đảm bảo website đang chạy
Write-Host ""
Write-Host "5. Ensuring website is running..." -ForegroundColor Yellow

if ($website.State -ne "Started") {
    Write-Host "   Starting website..." -ForegroundColor Yellow
    Start-WebSite -Name $siteName
    Write-Host "   OK: Website started" -ForegroundColor Green
} else {
    Write-Host "   OK: Website is already running" -ForegroundColor Green
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

# Bước 7: Hiển thị thông tin binding
Write-Host ""
Write-Host "7. Current bindings for '$siteName':" -ForegroundColor Yellow
$finalBindings = Get-WebBinding -Name $siteName
foreach ($binding in $finalBindings) {
    Write-Host "   $($binding.protocol)://$($binding.bindingInformation)" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Configuration Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test URLs:" -ForegroundColor Yellow
Write-Host "  http://$hostName/" -ForegroundColor White
Write-Host "  http://$hostName/index.html" -ForegroundColor White
Write-Host ""
Write-Host "If http://$hostName/ still shows Default IIS page:" -ForegroundColor Yellow
Write-Host "  1. Stop 'Default Web Site' in IIS Manager" -ForegroundColor White
Write-Host "  2. Or change 'Default Web Site' to port 8080" -ForegroundColor White
Write-Host "  3. Clear browser cache (Ctrl+F5)" -ForegroundColor White
Write-Host ""

