# Fix: IIS Root Path Không Đúng

## Vấn Đề
- Truy cập `http://localsite.thibidi.com/` → Hiển thị trang Default IIS Welcome Page
- Nguyên nhân: Physical Path (Root) của website đang trỏ sai thư mục

## Giải Pháp

### Cách 1: Sửa Thủ Công trong IIS Manager (Khuyến nghị)

#### Bước 1: Mở IIS Manager
1. Mở **IIS Manager** (inetmgr)
2. Mở rộng server name → **Sites**
3. Chọn website **"quanlyfile"**

#### Bước 2: Kiểm Tra Physical Path Hiện Tại
1. Click vào website **"quanlyfile"**
2. Ở Actions pane bên phải, click **Basic Settings...**
3. Xem **Physical path** hiện tại

**Nếu path là:**
- `C:\inetpub\wwwroot\` → **SAI** (đây là thư mục mặc định của IIS)
- `C:\inetpub\wwwroot\quanlyfile-fe\` → **ĐÚNG** (nếu đã copy files vào đây)
- Hoặc path khác chứa thư mục `dist\quanlyfile-fe` → **ĐÚNG**

#### Bước 3: Xác Định Đường Dẫn Đúng

**Option A: Nếu đã copy files vào IIS**
- Path đúng: `C:\inetpub\wwwroot\quanlyfile-fe`
- Kiểm tra: Thư mục này phải có file `index.html`

**Option B: Nếu muốn trỏ trực tiếp vào thư mục dist**
- Tìm thư mục project trên server
- Path đúng: `D:\Project\thibidi\quanlyfiles\quanlyfileFE\dist\quanlyfile-fe`
- Hoặc path tương ứng trên server của bạn

#### Bước 4: Cập Nhật Physical Path
1. Trong **Basic Settings**, click **...** (Browse button)
2. Duyệt đến thư mục đúng (có chứa `index.html`)
3. Click **OK**
4. Click **OK** để lưu

#### Bước 5: Kiểm Tra
1. Đảm bảo thư mục có:
   - ✅ File `index.html`
   - ✅ File `web.config`
   - ✅ Các file `.js`, `.css` đã build
2. Restart website:
   - Click chuột phải vào website → **Manage Website** → **Restart**

#### Bước 6: Test
- Mở browser: `http://localsite.thibidi.com/`
- Nếu vẫn thấy Default IIS page:
  - Clear browser cache (Ctrl+F5)
  - Kiểm tra bindings (xem phần dưới)

---

### Cách 2: Dùng PowerShell Script (Chạy trên Server)

**Lưu ý:** Script này phải chạy trên **Windows Server có IIS**, không phải máy dev.

1. Copy file `fix-iis-root.ps1` lên server
2. Mở PowerShell với quyền **Administrator**
3. Chạy:
   ```powershell
   .\fix-iis-root.ps1
   ```

Script sẽ:
- Tự động tìm thư mục dist đúng
- Cập nhật physical path
- Verify configuration

---

### Cách 3: Dùng PowerShell Commands Trực Tiếp

**Chạy trên Server với quyền Administrator:**

```powershell
Import-Module WebAdministration

# Kiểm tra path hiện tại
$siteName = "quanlyfile"
$currentPath = (Get-WebFilePath -PSPath "IIS:\Sites\$siteName").FullName
Write-Host "Current path: $currentPath"

# Cập nhật path (thay đổi đường dẫn cho đúng)
$newPath = "C:\inetpub\wwwroot\quanlyfile-fe"  # Hoặc path khác
Set-ItemProperty -Path "IIS:\Sites\$siteName" -Name physicalPath -Value $newPath

# Verify
$updatedPath = (Get-WebFilePath -PSPath "IIS:\Sites\$siteName").FullName
Write-Host "Updated path: $updatedPath"

# Restart website
Stop-WebSite -Name $siteName
Start-WebSite -Name $siteName
```

---

## Kiểm Tra Bổ Sung

### 1. Kiểm Tra Bindings
Đảm bảo website có binding đúng:
- **Type**: `http`
- **Port**: `80`
- **Host name**: `localsite.thibidi.com`

Nếu chưa có, xem hướng dẫn trong `FIX_BINDING_ISSUE.md`

### 2. Kiểm Tra Default Web Site
Nếu "Default Web Site" đang chạy và bind port 80, nó có thể ưu tiên hơn:
- Stop "Default Web Site" trong IIS Manager
- Hoặc đổi port của "Default Web Site" thành 8080

### 3. Kiểm Tra Files
Đảm bảo thư mục physical path có:
```
C:\inetpub\wwwroot\quanlyfile-fe\
├── index.html          ← Phải có
├── web.config          ← Phải có (cho Angular routing)
├── main.*.js
├── polyfills.*.js
├── runtime.*.js
├── styles.*.css
└── assets\
```

---

## Troubleshooting

### Vẫn thấy Default IIS Page sau khi sửa
1. **Clear browser cache**: Ctrl+F5 hoặc Ctrl+Shift+R
2. **Kiểm tra bindings**: Đảm bảo hostname đúng
3. **Stop Default Web Site**: Có thể đang conflict
4. **Restart IIS**: 
   ```powershell
   iisreset
   ```

### Lỗi 403 Forbidden
- Kiểm tra permissions của thư mục
- Đảm bảo IIS_IUSRS có quyền đọc

### Lỗi 404 khi refresh trang
- Kiểm tra file `web.config` có trong thư mục không
- Kiểm tra URL Rewrite Module đã cài chưa

---

## Quick Checklist

- [ ] Physical path trỏ đến thư mục có `index.html`
- [ ] Thư mục có file `web.config`
- [ ] Website có binding đúng cho `localsite.thibidi.com`
- [ ] Default Web Site đã được stop hoặc đổi port
- [ ] Đã restart website sau khi sửa
- [ ] Đã clear browser cache
- [ ] Test lại: `http://localsite.thibidi.com/`

---

## Liên Kết

- [Fix Binding Issue](./FIX_BINDING_ISSUE.md)
- [Fix Default Document](./QUICK_FIX_WHITE_PAGE.md)
- [Deploy Guide](./DEPLOY_IIS_GUIDE.md)

