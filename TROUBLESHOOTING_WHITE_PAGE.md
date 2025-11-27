# Troubleshooting: Trang Trắng trên IIS

## Các Bước Kiểm Tra

### 1. Kiểm Tra Console Browser (Quan Trọng Nhất!)

1. Mở browser (F12 hoặc Ctrl+Shift+I)
2. Mở tab **Console**
3. Xem có lỗi gì không:
   - **404 errors**: Files không tìm thấy
   - **CORS errors**: API calls bị block
   - **JavaScript errors**: Lỗi code

**Các lỗi thường gặp:**
```
Failed to load resource: the server responded with a status of 404 (Not Found)
Access to XMLHttpRequest blocked by CORS policy
Uncaught Error: Cannot find module
```

### 2. Kiểm Tra Network Tab

1. Mở **Network** tab trong DevTools
2. Refresh trang (F5)
3. Kiểm tra:
   - File `index.html` có load được không? (Status 200)
   - Các file `.js` có load được không?
   - Các file `.css` có load được không?
   - File `assets/` có load được không?

**Nếu thấy 404:**
- Kiểm tra đường dẫn file có đúng không
- Kiểm tra base href trong index.html

### 3. Kiểm Tra File Structure trên Server

Kiểm tra thư mục IIS có đầy đủ files không:

```
C:\inetpub\wwwroot\quanlyfileFe\
├── index.html          ← Phải có
├── web.config          ← Phải có
├── main.*.js           ← Phải có
├── polyfills.*.js      ← Phải có
├── runtime.*.js        ← Phải có
├── styles.*.css        ← Phải có
└── assets/             ← Phải có
    └── icons/
        └── thibidiLogo.png
```

**Cách kiểm tra:**
1. Trong IIS Manager, click **Explore** trên website
2. Hoặc mở File Explorer: `C:\inetpub\wwwroot\quanlyfileFe\`

### 4. Kiểm Tra Base Href

Mở file `index.html` trên server và kiểm tra:

```html
<base href="/">
```

**Nếu deploy vào subfolder** (ví dụ: `/quanlyfileFe/`), cần sửa thành:
```html
<base href="/quanlyfileFe/">
```

**Hoặc build lại với base-href:**
```bash
npm run build:prod -- --base-href /quanlyfileFe/
```

### 5. Kiểm Tra Permissions

1. Click chuột phải vào thư mục `C:\inetpub\wwwroot\quanlyfileFe`
2. **Properties** → **Security**
3. Đảm bảo có:
   - **IIS_IUSRS**: Read & Execute, List folder contents, Read
   - **IUSR**: Read & Execute, List folder contents, Read

### 6. Kiểm Tra MIME Types

1. Trong IIS Manager, chọn website
2. Double-click **MIME Types**
3. Đảm bảo có:
   - `.js` → `application/javascript`
   - `.json` → `application/json`
   - `.woff` → `application/font-woff`
   - `.woff2` → `application/font-woff2`

### 7. Kiểm Tra Default Document

1. Trong IIS Manager, chọn website
2. Double-click **Default Document**
3. Đảm bảo `index.html` có trong danh sách và ở đầu

### 8. Kiểm Tra API URL

Mở file `environment.prod.ts` và kiểm tra `apiUrl`:

```typescript
apiUrl: 'http://172.20.115.40:8080/api'
```

**Kiểm tra:**
- API server có đang chạy không?
- URL có đúng không?
- CORS đã được cấu hình ở backend chưa?

### 9. Kiểm Tra IIS Logs

1. Mở IIS Logs: `C:\inetpub\logs\LogFiles\`
2. Tìm file log mới nhất
3. Xem có lỗi gì không

---

## Giải Pháp Theo Từng Trường Hợp

### Trường Hợp 1: Console báo 404 cho các file .js

**Nguyên nhân:** Files không được copy đầy đủ hoặc base href sai

**Giải pháp:**
1. Rebuild và copy lại files:
   ```bash
   npm run build:prod
   ```
2. Copy toàn bộ từ `dist/quanlyfile-fe/` lên server
3. Kiểm tra base href trong index.html

### Trường Hợp 2: Console báo CORS error

**Nguyên nhân:** Backend chưa cấu hình CORS

**Giải pháp:**
1. Cấu hình CORS ở backend
2. Hoặc uncomment CORS headers trong web.config (không khuyến nghị cho production)

### Trường Hợp 3: Console báo JavaScript errors

**Nguyên nhân:** Code có lỗi hoặc dependencies thiếu

**Giải pháp:**
1. Kiểm tra lỗi cụ thể trong Console
2. Rebuild lại với `npm run build:prod`
3. Kiểm tra environment.prod.ts có đúng không

### Trường Hợp 4: Trang trắng hoàn toàn, không có lỗi trong Console

**Nguyên nhân:** 
- index.html không load được
- JavaScript không execute
- Routing không hoạt động

**Giải pháp:**
1. Kiểm tra file index.html có trong thư mục không
2. Kiểm tra Default Document trong IIS
3. Kiểm tra web.config có đúng không
4. Thử truy cập trực tiếp: `http://localsite.thibidi.com/index.html`

### Trường Hợp 5: Trang load nhưng không có nội dung

**Nguyên nhân:** 
- API không hoạt động
- Firebase config sai
- Component không render

**Giải pháp:**
1. Kiểm tra Network tab xem API calls có thành công không
2. Kiểm tra Firebase config trong environment.prod.ts
3. Kiểm tra Console có lỗi gì không

---

## Quick Fix Checklist

- [ ] Mở Console (F12) và kiểm tra lỗi
- [ ] Mở Network tab và kiểm tra files có load được không
- [ ] Kiểm tra file index.html có trong thư mục IIS không
- [ ] Kiểm tra base href trong index.html
- [ ] Kiểm tra permissions của thư mục
- [ ] Kiểm tra Default Document trong IIS
- [ ] Kiểm tra MIME types
- [ ] Rebuild và copy lại files
- [ ] Restart website trong IIS
- [ ] Kiểm tra IIS logs

---

## Script Kiểm Tra Nhanh

Tạo file `check-deployment.ps1`:

```powershell
# Kiểm tra deployment
$iisPath = "C:\inetpub\wwwroot\quanlyfileFe"

Write-Host "Checking deployment..." -ForegroundColor Yellow

# Kiểm tra thư mục tồn tại
if (-not (Test-Path $iisPath)) {
    Write-Host "ERROR: Directory not found: $iisPath" -ForegroundColor Red
    exit 1
}

# Kiểm tra index.html
if (-not (Test-Path "$iisPath\index.html")) {
    Write-Host "ERROR: index.html not found!" -ForegroundColor Red
} else {
    Write-Host "OK: index.html found" -ForegroundColor Green
}

# Kiểm tra web.config
if (-not (Test-Path "$iisPath\web.config")) {
    Write-Host "WARNING: web.config not found!" -ForegroundColor Yellow
} else {
    Write-Host "OK: web.config found" -ForegroundColor Green
}

# Kiểm tra JS files
$jsFiles = Get-ChildItem -Path $iisPath -Filter "*.js" -Recurse
if ($jsFiles.Count -eq 0) {
    Write-Host "ERROR: No JS files found!" -ForegroundColor Red
} else {
    Write-Host "OK: Found $($jsFiles.Count) JS files" -ForegroundColor Green
}

# Kiểm tra CSS files
$cssFiles = Get-ChildItem -Path $iisPath -Filter "*.css" -Recurse
if ($cssFiles.Count -eq 0) {
    Write-Host "WARNING: No CSS files found!" -ForegroundColor Yellow
} else {
    Write-Host "OK: Found $($cssFiles.Count) CSS files" -ForegroundColor Green
}

# Kiểm tra assets
if (-not (Test-Path "$iisPath\assets")) {
    Write-Host "WARNING: assets folder not found!" -ForegroundColor Yellow
} else {
    Write-Host "OK: assets folder found" -ForegroundColor Green
}

Write-Host ""
Write-Host "Check completed!" -ForegroundColor Cyan
```

---

## Các Lệnh Hữu Ích

### Kiểm Tra Website Status
```powershell
Get-WebSite -Name "quanlyfile"
```

### Restart Website
```powershell
Restart-WebAppPool -Name "quanlyfile"
```

### Kiểm Tra Application Pool
```powershell
Get-WebAppPoolState -Name "quanlyfile"
```

### Xem IIS Logs
```powershell
Get-Content "C:\inetpub\logs\LogFiles\W3SVC*\*.log" -Tail 50
```

---

## Liên Hệ và Hỗ Trợ

Nếu vẫn không giải quyết được, cung cấp:
1. Screenshot Console errors
2. Screenshot Network tab
3. Nội dung file index.html trên server
4. IIS logs (nếu có)

