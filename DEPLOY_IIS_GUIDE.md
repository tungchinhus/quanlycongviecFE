# Hướng Dẫn Build và Deploy Angular App lên IIS

## Tổng Quan

Hướng dẫn này sẽ giúp bạn build ứng dụng Angular và deploy lên IIS (Internet Information Services) trên Windows Server.

---

## Bước 1: Chuẩn Bị Môi Trường

### 1.1. Yêu Cầu Hệ Thống

- **Node.js**: Version 18.x hoặc 20.x (LTS)
- **npm**: Đi kèm với Node.js
- **IIS**: Đã được cài đặt và cấu hình trên Windows Server
- **URL Rewrite Module**: Cần thiết cho Angular routing

### 1.2. Cài Đặt URL Rewrite Module cho IIS

1. Tải **URL Rewrite Module 2.1** từ: https://www.iis.net/downloads/microsoft/url-rewrite
2. Cài đặt file `.msi` đã tải về
3. Khởi động lại IIS (nếu cần)

---

## Bước 2: Build Ứng Dụng Angular

### 2.1. Cài Đặt Dependencies

Mở terminal/PowerShell tại thư mục project và chạy:

```bash
npm install
```

### 2.2. Kiểm Tra Environment Files

Đảm bảo file `src/environments/environment.prod.ts` có cấu hình đúng:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-api-domain.com/api' // URL của backend API
};
```

### 2.3. Build Production

Chạy lệnh build production:

```bash
npm run build
```

Hoặc nếu có script build riêng:

```bash
npm run build -- --configuration production
```

**Kết quả**: Thư mục `dist/quanlyfile-fe` (hoặc `dist/[project-name]`) sẽ chứa các file đã build.

### 2.4. Kiểm Tra Build Output

Sau khi build xong, kiểm tra thư mục `dist/`:
- Có file `index.html`
- Có các file `.js`, `.css` đã được minify
- Có thư mục `assets/` nếu có

---

## Bước 3: Cấu Hình IIS

### 3.1. Tạo Website Mới trong IIS

1. Mở **IIS Manager**
2. Click chuột phải vào **Sites** → **Add Website**
3. Điền thông tin:
   - **Site name**: `quanlyfile-fe` (hoặc tên bạn muốn)
   - **Application pool**: Chọn hoặc tạo mới (khuyến nghị: `.NET CLR Version: No Managed Code`)
   - **Physical path**: Chọn thư mục `dist/quanlyfile-fe` (thư mục đã build)
   - **Binding**: 
     - **Type**: `http` hoặc `https`
     - **IP address**: `All Unassigned` hoặc IP cụ thể
     - **Port**: `80` (http) hoặc `443` (https)
     - **Host name**: `your-domain.com` (nếu có)

4. Click **OK**

### 3.2. Tạo File web.config

Tạo file `web.config` trong thư mục `dist/quanlyfile-fe` với nội dung sau:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <!-- Redirect HTTP to HTTPS (tùy chọn, nếu dùng HTTPS) -->
        <rule name="HTTP to HTTPS redirect" stopProcessing="true">
          <match url="(.*)" />
          <conditions>
            <add input="{HTTPS}" pattern="off" ignoreCase="true" />
          </conditions>
          <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
        </rule>
        
        <!-- Angular routing: redirect tất cả requests về index.html -->
        <rule name="Angular Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <add input="{REQUEST_URI}" pattern="^/(api)" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
    
    <!-- CORS Headers (nếu cần) -->
    <httpProtocol>
      <customHeaders>
        <add name="Access-Control-Allow-Origin" value="*" />
        <add name="Access-Control-Allow-Methods" value="GET, POST, PUT, DELETE, OPTIONS" />
        <add name="Access-Control-Allow-Headers" value="Content-Type, Authorization" />
      </customHeaders>
    </httpProtocol>
    
    <!-- Static file caching -->
    <staticContent>
      <clientCache cacheControlMode="UseMaxAge" cacheControlMaxAge="365.00:00:00" />
      <!-- Remove default content type for .js files -->
      <remove fileExtension=".js" />
      <mimeMap fileExtension=".js" mimeType="application/javascript" />
      <remove fileExtension=".json" />
      <mimeMap fileExtension=".json" mimeType="application/json" />
    </staticContent>
    
    <!-- Compression -->
    <urlCompression doStaticCompression="true" doDynamicCompression="true" />
    
    <!-- Security headers -->
    <httpProtocol>
      <customHeaders>
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="X-Frame-Options" value="DENY" />
        <add name="X-XSS-Protection" value="1; mode=block" />
      </customHeaders>
    </httpProtocol>
  </system.webServer>
</configuration>
```

### 3.3. Cấu Hình Application Pool

1. Trong IIS Manager, mở **Application Pools**
2. Chọn Application Pool của website vừa tạo
3. Click **Basic Settings**:
   - **.NET CLR Version**: `No Managed Code` (vì Angular là static files)
   - **Managed pipeline mode**: `Integrated`
4. Click **Advanced Settings**:
   - **Start Mode**: `AlwaysRunning` (nếu muốn auto-start)
   - **Idle Time-out**: `0` (nếu muốn không timeout)

---

## Bước 4: Cấu Hình Permissions

### 4.1. Set Permissions cho Thư Mục

1. Click chuột phải vào thư mục `dist/quanlyfile-fe` → **Properties**
2. Tab **Security** → **Edit**
3. Thêm các permissions:
   - **IIS_IUSRS**: `Read & Execute`, `List folder contents`, `Read`
   - **IUSR**: `Read & Execute`, `List folder contents`, `Read`
   - **NETWORK SERVICE**: `Read & Execute`, `List folder contents`, `Read`

### 4.2. Set Permissions trong IIS

1. Trong IIS Manager, chọn website
2. Click **Edit Permissions** → Tab **Security**
3. Đảm bảo **IIS_IUSRS** và **IUSR** có quyền đọc

---

## Bước 5: Test và Kiểm Tra

### 5.1. Test Local

1. Mở browser và truy cập: `http://localhost` (hoặc port bạn đã cấu hình)
2. Kiểm tra:
   - Trang chủ load được không
   - Routing hoạt động (thử navigate giữa các trang)
   - API calls hoạt động (kiểm tra Network tab trong DevTools)

### 5.2. Kiểm Tra Logs

- **IIS Logs**: `C:\inetpub\logs\LogFiles\`
- **Event Viewer**: Windows Logs → Application

### 5.3. Common Issues

#### Issue 1: 404 khi refresh trang
**Nguyên nhân**: Thiếu URL Rewrite Module hoặc web.config không đúng
**Giải pháp**: 
- Kiểm tra URL Rewrite Module đã cài chưa
- Kiểm tra file web.config có đúng không

#### Issue 2: API calls bị CORS error
**Nguyên nhân**: Backend chưa cấu hình CORS
**Giải pháp**: Cấu hình CORS ở backend hoặc dùng reverse proxy

#### Issue 3: Static files không load
**Nguyên nhân**: Permissions hoặc MIME types
**Giải pháp**:
- Kiểm tra permissions của thư mục
- Kiểm tra MIME types trong IIS

---

## Bước 6: Deploy Tự Động (Optional)

### 6.1. Tạo Script Deploy

Tạo file `deploy.ps1`:

```powershell
# deploy.ps1
# Script để build và copy files lên IIS

Write-Host "Building Angular application..." -ForegroundColor Green
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Build successful!" -ForegroundColor Green

# Đường dẫn đến thư mục IIS
$iisPath = "C:\inetpub\wwwroot\quanlyfile-fe"

# Xóa thư mục cũ (backup trước nếu cần)
if (Test-Path $iisPath) {
    Write-Host "Backing up old files..." -ForegroundColor Yellow
    $backupPath = "$iisPath-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item -Path $iisPath -Destination $backupPath -Recurse
    Write-Host "Backup created at: $backupPath" -ForegroundColor Yellow
}

# Copy files mới
Write-Host "Copying new files to IIS..." -ForegroundColor Green
$distPath = ".\dist\quanlyfile-fe"
Copy-Item -Path "$distPath\*" -Destination $iisPath -Recurse -Force

Write-Host "Deployment completed!" -ForegroundColor Green
Write-Host "Files deployed to: $iisPath" -ForegroundColor Green
```

### 6.2. Chạy Script Deploy

```powershell
# Chạy với quyền Administrator
.\deploy.ps1
```

---

## Bước 7: Cấu Hình HTTPS (Optional nhưng Khuyến Nghị)

### 7.1. Tạo SSL Certificate

1. Sử dụng **Let's Encrypt** (miễn phí) hoặc mua certificate
2. Hoặc tạo Self-Signed Certificate cho testing:
   - Mở IIS Manager
   - Click vào server name → **Server Certificates**
   - **Create Self-Signed Certificate**

### 7.2. Bind HTTPS

1. Trong IIS Manager, chọn website
2. Click **Bindings** → **Add**
3. Chọn:
   - **Type**: `https`
   - **Port**: `443`
   - **SSL certificate**: Chọn certificate đã tạo
4. Click **OK**

### 7.3. Redirect HTTP to HTTPS

File `web.config` đã có rule redirect HTTP → HTTPS (xem Bước 3.2)

---

## Bước 8: Tối Ưu Performance

### 8.1. Enable Compression

Đã có trong `web.config`:
```xml
<urlCompression doStaticCompression="true" doDynamicCompression="true" />
```

### 8.2. Enable Caching

Đã có trong `web.config`:
```xml
<clientCache cacheControlMaxAge="365.00:00:00" />
```

### 8.3. CDN (Optional)

Có thể host static files (JS, CSS, images) trên CDN để tăng tốc độ.

---

## Bước 9: Monitoring và Maintenance

### 9.1. Enable Logging

1. Trong IIS Manager, chọn website
2. Double-click **Logging**
3. Cấu hình:
   - **Format**: `W3C`
   - **Directory**: Mặc định hoặc custom
   - **Log file rollover**: `Daily`

### 9.2. Health Check

Tạo endpoint health check (nếu cần):
- File `health.html` trong thư mục root
- Hoặc sử dụng monitoring tools

### 9.3. Backup Strategy

- Backup thư mục `dist/` trước khi deploy
- Backup `web.config`
- Backup database (nếu có)

---

## Checklist Deploy

- [ ] Node.js và npm đã cài đặt
- [ ] Dependencies đã được install (`npm install`)
- [ ] Environment files đã được cấu hình đúng
- [ ] Build production thành công (`npm run build`)
- [ ] URL Rewrite Module đã được cài đặt
- [ ] Website đã được tạo trong IIS
- [ ] File `web.config` đã được tạo và cấu hình đúng
- [ ] Permissions đã được set đúng
- [ ] Application Pool đã được cấu hình
- [ ] Test local thành công
- [ ] HTTPS đã được cấu hình (nếu cần)
- [ ] Logging đã được enable
- [ ] Backup strategy đã được thiết lập

---

## Troubleshooting

### Lỗi: "500.19 - Internal Server Error"
**Nguyên nhân**: web.config có lỗi syntax hoặc thiếu module
**Giải pháp**: 
- Kiểm tra syntax của web.config
- Đảm bảo URL Rewrite Module đã được cài

### Lỗi: "404 - File Not Found" khi refresh
**Nguyên nhân**: URL Rewrite rule không hoạt động
**Giải pháp**: 
- Kiểm tra URL Rewrite Module
- Kiểm tra rule trong web.config

### Lỗi: "403 - Forbidden"
**Nguyên nhân**: Permissions không đúng
**Giải pháp**: 
- Kiểm tra permissions của thư mục
- Đảm bảo IIS_IUSRS có quyền đọc

### Lỗi: API calls bị block
**Nguyên nhân**: CORS hoặc firewall
**Giải pháp**: 
- Cấu hình CORS ở backend
- Kiểm tra firewall rules

---

## Quick Reference

### Build Commands

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Build với custom configuration
npm run build -- --configuration production

# Build với base href custom
npm run build -- --base-href /quanlyfile-fe/
```

### IIS Commands (PowerShell)

```powershell
# Start website
Start-WebSite -Name "quanlyfile-fe"

# Stop website
Stop-WebSite -Name "quanlyfile-fe"

# Restart website
Restart-WebAppPool -Name "quanlyfile-fe"

# Check website status
Get-WebSite -Name "quanlyfile-fe"
```

### File Locations

- **Build output**: `dist/quanlyfile-fe/`
- **IIS default path**: `C:\inetpub\wwwroot\`
- **IIS logs**: `C:\inetpub\logs\LogFiles\`
- **web.config**: `dist/quanlyfile-fe/web.config`

---

## Kết Luận

Sau khi hoàn thành các bước trên, ứng dụng Angular của bạn sẽ được deploy và chạy trên IIS. Đảm bảo:

1. ✅ Build thành công
2. ✅ Cấu hình IIS đúng
3. ✅ File web.config đã được tạo
4. ✅ Permissions đã được set
5. ✅ Test thành công

Nếu gặp vấn đề, kiểm tra logs và tham khảo phần Troubleshooting.

