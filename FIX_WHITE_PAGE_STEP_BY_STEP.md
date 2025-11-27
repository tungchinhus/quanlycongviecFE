# Fix Trang Trắng - Tất Cả Files Đã OK

## Tình Trạng Hiện Tại
✅ Tất cả files đã có đầy đủ
✅ Permissions đúng
✅ web.config đúng
✅ Base href đúng (/)
❌ Trang vẫn trắng

## Nguyên Nhân Có Thể

### 1. Default Document chưa được cấu hình đúng
IIS không biết serve file `index.html` khi truy cập root URL.

### 2. Files không load được do MIME types
IIS không nhận diện được các file .js, .css

### 3. Cache issue
Browser đang cache version cũ

### 4. JavaScript runtime errors
Code có lỗi khi chạy (không hiện trong console ban đầu)

---

## Giải Pháp Từng Bước

### Bước 1: Kiểm Tra và Cấu Hình Default Document

1. Mở **IIS Manager**
2. Chọn website **"quanlyfile"**
3. Double-click **Default Document**
4. Kiểm tra:
   - `index.html` có trong danh sách không?
   - `index.html` có ở **đầu danh sách** không?

**Nếu không có `index.html`:**
- Click **Add...** ở Actions pane
- Nhập: `index.html`
- Click **OK**
- Di chuyển `index.html` lên đầu (dùng Move Up)

**Nếu có nhưng không ở đầu:**
- Chọn `index.html`
- Click **Move Up** cho đến khi lên đầu

5. Click **Apply** (nếu có)

### Bước 2: Kiểm Tra MIME Types

1. Trong IIS Manager, chọn website
2. Double-click **MIME Types**
3. Kiểm tra có các MIME types sau:
   - `.js` → `application/javascript`
   - `.json` → `application/json`
   - `.woff` → `application/font-woff`
   - `.woff2` → `application/font-woff2`

**Nếu thiếu:**
- Click **Add...**
- Extension: `.js`
- MIME type: `application/javascript`
- Click **OK**
- Lặp lại cho các extension khác

### Bước 3: Thử Truy Cập Trực Tiếp index.html

Mở browser và truy cập:
```
http://localsite.thibidi.com/index.html
```

**Nếu mở được:**
→ Vấn đề là Default Document hoặc routing

**Nếu không mở được:**
→ Vấn đề là permissions hoặc file không tồn tại

### Bước 4: Kiểm Tra Network Tab Chi Tiết

1. Mở browser DevTools (F12)
2. Tab **Network**
3. **Clear** network log (icon xóa)
4. Refresh trang (F5)
5. Xem từng request:

**Kiểm tra:**
- `index.html` - Status? Size? Time?
- `main.*.js` - Status? Size? Time?
- `polyfills.*.js` - Status?
- `runtime.*.js` - Status?
- `styles.*.css` - Status?

**Nếu thấy:**
- **Status 200**: File load được ✓
- **Status 404**: File không tìm thấy ✗
- **Status 403**: Permission denied ✗
- **Status 500**: Server error ✗
- **Pending/Timeout**: Server không respond ✗

### Bước 5: Clear Cache và Hard Refresh

1. Trong browser, nhấn **Ctrl + Shift + Delete**
2. Chọn **Cached images and files**
3. Click **Clear data**
4. Hoặc nhấn **Ctrl + F5** để hard refresh

### Bước 6: Kiểm Tra Console Sau Khi Load

1. Mở Console tab
2. Refresh trang
3. Xem có lỗi mới xuất hiện không:
   - JavaScript errors
   - CORS errors
   - Module not found errors

### Bước 7: Kiểm Tra Application Pool

1. Trong IIS Manager, mở **Application Pools**
2. Tìm Application Pool của website "quanlyfile"
3. Kiểm tra **Status** phải là **Started**
4. Nếu **Stopped**, click **Start**

### Bước 8: Restart Website và Application Pool

1. Trong IIS Manager, chọn website
2. Click **Restart** trong Actions pane
3. Hoặc dùng PowerShell:
   ```powershell
   Restart-WebAppPool -Name "quanlyfile"
   Restart-WebSite -Name "quanlyfile"
   ```

---

## Quick Fix - Thử Ngay

### Option 1: Cấu Hình Default Document

```powershell
# PowerShell (chạy với quyền Administrator)
Import-Module WebAdministration

# Thêm index.html vào đầu danh sách Default Documents
$siteName = "quanlyfile"
$defaultDocs = Get-WebConfigurationProperty -PSPath "IIS:\Sites\$siteName" -Filter "system.webServer/defaultDocument/files" -Name "collection"

# Kiểm tra xem index.html đã có chưa
$indexExists = $defaultDocs | Where-Object { $_.value -eq "index.html" }

if (-not $indexExists) {
    # Thêm index.html
    Add-WebConfigurationProperty -PSPath "IIS:\Sites\$siteName" -Filter "system.webServer/defaultDocument/files" -Name "." -Value @{value="index.html"}
    Write-Host "Added index.html to Default Documents" -ForegroundColor Green
} else {
    Write-Host "index.html already exists in Default Documents" -ForegroundColor Yellow
}

# Di chuyển index.html lên đầu
$indexDoc = $defaultDocs | Where-Object { $_.value -eq "index.html" }
if ($indexDoc) {
    $indexDocIndex = $defaultDocs.IndexOf($indexDoc)
    if ($indexDocIndex -gt 0) {
        # Move to top (cần xóa và thêm lại ở đầu)
        Remove-WebConfigurationProperty -PSPath "IIS:\Sites\$siteName" -Filter "system.webServer/defaultDocument/files" -Name "." -AtElement @{value="index.html"}
        Add-WebConfigurationProperty -PSPath "IIS:\Sites\$siteName" -Filter "system.webServer/defaultDocument/files" -Name "." -Value @{value="index.html"} -AtElement 0
        Write-Host "Moved index.html to top of Default Documents" -ForegroundColor Green
    }
}
```

### Option 2: Kiểm Tra và Sửa MIME Types

```powershell
# Kiểm tra MIME types
Import-Module WebAdministration
$siteName = "quanlyfile"

# Thêm MIME types nếu chưa có
$mimeTypes = @(
    @{Extension=".js"; MimeType="application/javascript"},
    @{Extension=".json"; MimeType="application/json"},
    @{Extension=".woff"; MimeType="application/font-woff"},
    @{Extension=".woff2"; MimeType="application/font-woff2"}
)

foreach ($mime in $mimeTypes) {
    $exists = Get-WebConfigurationProperty -PSPath "IIS:\Sites\$siteName" -Filter "system.webServer/staticContent" -Name "collection" | Where-Object { $_.fileExtension -eq $mime.Extension }
    
    if (-not $exists) {
        Add-WebConfigurationProperty -PSPath "IIS:\Sites\$siteName" -Filter "system.webServer/staticContent" -Name "." -Value $mime
        Write-Host "Added MIME type: $($mime.Extension) -> $($mime.MimeType)" -ForegroundColor Green
    } else {
        Write-Host "MIME type already exists: $($mime.Extension)" -ForegroundColor Yellow
    }
}
```

---

## Checklist Cuối Cùng

- [ ] Default Document có `index.html` và ở đầu danh sách
- [ ] MIME types đã được cấu hình đúng
- [ ] Application Pool đang chạy (Started)
- [ ] Đã thử truy cập trực tiếp `index.html`
- [ ] Đã clear cache và hard refresh (Ctrl+F5)
- [ ] Đã kiểm tra Network tab - files có load được không?
- [ ] Đã kiểm tra Console - có lỗi mới không?
- [ ] Đã restart website và application pool

---

## Nếu Vẫn Không Được

Cung cấp thông tin sau:

1. **Screenshot Default Document** trong IIS Manager
2. **Screenshot Network tab** - tất cả requests và status codes
3. **Screenshot Console** - tất cả messages (errors, warnings, info)
4. **Kết quả khi truy cập trực tiếp** `index.html`
5. **IIS Logs** - nếu có errors

