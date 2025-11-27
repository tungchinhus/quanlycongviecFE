# Script rebuild nhanh - xóa dist và rebuild
Write-Host "🔄 Đang rebuild ứng dụng..." -ForegroundColor Cyan

# 1. Xóa dist cũ
Write-Host "`n🗑️  Xóa thư mục dist cũ..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Path "dist" -Recurse -Force
    Write-Host "✅ Đã xóa dist" -ForegroundColor Green
} else {
    Write-Host "⚠️  Không có thư mục dist" -ForegroundColor Yellow
}

# 2. Rebuild
Write-Host "`n🔨 Đang build production..." -ForegroundColor Yellow
Write-Host "   (Có thể mất vài phút...)`n" -ForegroundColor Gray

npm run build:prod

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Rebuild thành công!" -ForegroundColor Green
    Write-Host "`n📦 Files mới nằm trong: dist\quanlyfile-fe\" -ForegroundColor Cyan
    Write-Host "`n💡 BƯỚC TIẾP THEO:" -ForegroundColor Yellow
    Write-Host "   1. Copy files từ dist\quanlyfile-fe\ vào IIS" -ForegroundColor White
    Write-Host "   2. Clear browser cache (Ctrl + Shift + Delete)" -ForegroundColor White
    Write-Host "   3. Hard refresh (Ctrl + F5)" -ForegroundColor White
} else {
    Write-Host "`n❌ Build thất bại! Kiểm tra lỗi ở trên." -ForegroundColor Red
    exit 1
}

