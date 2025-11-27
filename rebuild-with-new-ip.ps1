# Script rebuild ứng dụng với IP mới
# Sử dụng: .\rebuild-with-new-ip.ps1 [IP_MỚI] [PORT]
# Ví dụ: .\rebuild-with-new-ip.ps1 192.168.1.100 8080

param(
    [Parameter(Mandatory=$true)]
    [string]$NewIP,
    
    [Parameter(Mandatory=$false)]
    [string]$Port = "8080"
)

$ErrorActionPreference = "Stop"

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🔄 REBUILD ỨNG DỤNG VỚI IP MỚI" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

# 1. Kiểm tra file environment.prod.ts
$envProdFile = "src/environments/environment.prod.ts"
if (-not (Test-Path $envProdFile)) {
    Write-Host "❌ Không tìm thấy file: $envProdFile" -ForegroundColor Red
    exit 1
}

# 2. Đọc IP hiện tại
$content = Get-Content $envProdFile -Raw
if ($content -match "apiUrl:\s*['""]([^'""]+)['""]") {
    $oldApiUrl = $matches[1]
    Write-Host "📋 IP hiện tại: $oldApiUrl" -ForegroundColor Yellow
} else {
    Write-Host "⚠️  Không tìm thấy apiUrl trong file" -ForegroundColor Yellow
}

# 3. Tạo API URL mới
$newApiUrl = "http://${NewIP}:${Port}/api"
Write-Host "🆕 IP mới: $newApiUrl`n" -ForegroundColor Green

# 4. Xác nhận
$confirm = Read-Host "Bạn có muốn cập nhật IP và rebuild không? (y/n)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "❌ Đã hủy" -ForegroundColor Red
    exit 0
}

# 5. Cập nhật environment.prod.ts
Write-Host "`n📝 Đang cập nhật environment.prod.ts..." -ForegroundColor Yellow
$newContent = $content -replace "apiUrl:\s*['""][^'""]+['""]", "apiUrl: '$newApiUrl'"
Set-Content -Path $envProdFile -Value $newContent -NoNewline
Write-Host "✅ Đã cập nhật environment.prod.ts" -ForegroundColor Green

# 6. Xóa thư mục dist cũ
Write-Host "`n🗑️  Đang xóa thư mục dist cũ..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Path "dist" -Recurse -Force
    Write-Host "✅ Đã xóa thư mục dist" -ForegroundColor Green
}

# 7. Rebuild ứng dụng
Write-Host "`n🔨 Đang rebuild ứng dụng (production)..." -ForegroundColor Yellow
Write-Host "   (Quá trình này có thể mất vài phút...)`n" -ForegroundColor Gray

try {
    npm run build:prod
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Rebuild thành công!" -ForegroundColor Green
        
        # 8. Kiểm tra IP mới trong build
        Write-Host "`n🔍 Đang kiểm tra IP trong build..." -ForegroundColor Yellow
        $jsFiles = Get-ChildItem -Path "dist\quanlyfile-fe" -Filter "*.js" -Recurse | Select-Object -First 5
        
        $foundNewIP = $false
        foreach ($file in $jsFiles) {
            $fileContent = Get-Content $file.FullName -Raw
            if ($fileContent -match [regex]::Escape($NewIP)) {
                $foundNewIP = $true
                break
            }
        }
        
        if ($foundNewIP) {
            Write-Host "✅ Đã tìm thấy IP mới trong build" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Chưa tìm thấy IP mới trong build (có thể do minification)" -ForegroundColor Yellow
        }
        
        # 9. Tóm tắt
        Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host "📊 TÓM TẮT" -ForegroundColor Cyan
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan
        Write-Host "✅ Đã cập nhật IP: $oldApiUrl → $newApiUrl" -ForegroundColor Green
        Write-Host "✅ Đã rebuild ứng dụng" -ForegroundColor Green
        Write-Host "`n📦 Files build mới nằm trong: dist\quanlyfile-fe\" -ForegroundColor Cyan
        Write-Host "`n💡 BƯỚC TIẾP THEO:" -ForegroundColor Yellow
        Write-Host "   1. Copy files từ dist\quanlyfile-fe\ vào thư mục IIS" -ForegroundColor White
        Write-Host "   2. Restart IIS website (nếu cần)" -ForegroundColor White
        Write-Host "   3. Clear browser cache (Ctrl + Shift + Delete)" -ForegroundColor White
        Write-Host "   4. Hard refresh trang (Ctrl + F5)" -ForegroundColor White
        Write-Host "   5. Test đăng nhập lại" -ForegroundColor White
        
    } else {
        Write-Host "`n❌ Rebuild thất bại!" -ForegroundColor Red
        Write-Host "   Kiểm tra lỗi ở trên" -ForegroundColor Yellow
        exit 1
    }
    
} catch {
    Write-Host "`n❌ Lỗi khi rebuild: $_" -ForegroundColor Red
    exit 1
}

