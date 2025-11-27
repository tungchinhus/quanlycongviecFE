# Hướng Dẫn Build và Deploy Ứng Dụng Angular

## 📋 Tổng Quan

Hướng dẫn này sẽ giúp bạn build và deploy ứng dụng Angular lên server (IIS hoặc Firebase Hosting).

---

## 🚀 Bước 1: Build Ứng Dụng

### 1.1. Cài đặt Dependencies

```bash
npm install
```

### 1.2. Kiểm tra Environment Configuration

Đảm bảo file `src/environments/environment.prod.ts` có cấu hình đúng:

```typescript
export const environment = {
  production: true,
  firebase: {
    // Firebase config
  },
  apiUrl: 'http://172.20.115.40:8080/api' // URL backend API
};
```

### 1.3. Build Production

```bash
npm run build:prod
```

**Kết quả**: Thư mục `dist/quanlyfile-fe` sẽ chứa các file đã build.

### 1.4. Kiểm tra Build Output

Sau khi build, kiểm tra:
- ✅ File `index.html` có trong `dist/quanlyfile-fe/`
- ✅ Các file `.js`, `.css` đã được minify
- ✅ Thư mục `assets/` có đầy đủ files
- ✅ File `web.config` đã được copy vào `dist/quanlyfile-fe/`

---

## 🌐 Bước 2: Deploy lên IIS (Windows Server)

### 2.1. Yêu Cầu

- **IIS** đã được cài đặt
- **URL Rewrite Module 2.1** đã được cài đặt
  - Download: https://www.iis.net/downloads/microsoft/url-rewrite

### 2.2. Tạo Website trong IIS

1. Mở **IIS Manager**
2. Click chuột phải vào **Sites** → **Add Website**
3. Điền thông tin:
   - **Site name**: `quanlyfile-fe`
   - **Application pool**: Tạo mới hoặc chọn existing
   - **Physical path**: Chọn thư mục `dist/quanlyfile-fe` (hoặc copy vào `C:\inetpub\wwwroot\quanlyfile-fe`)
   - **Binding**: 
     - **Type**: `http` hoặc `https`
     - **IP address**: `All Unassigned`
     - **Port**: `80` (http) hoặc `443` (https)
     - **Host name**: (để trống hoặc nhập domain)

4. Click **OK**

### 2.3. Cấu Hình Application Pool

1. Trong IIS Manager, mở **Application Pools**
2. Chọn Application Pool của website vừa tạo
3. Click **Basic Settings**:
   - **.NET CLR Version**: `No Managed Code`
   - **Managed pipeline mode**: `Integrated`

### 2.4. Set Permissions

1. Click chuột phải vào thư mục `dist/quanlyfile-fe` → **Properties**
2. Tab **Security** → **Edit**
3. Thêm permissions cho:
   - **IIS_IUSRS**: `Read & Execute`, `List folder contents`, `Read`
   - **IUSR**: `Read & Execute`, `List folder contents`, `Read`

### 2.5. Kiểm tra web.config

Đảm bảo file `web.config` đã có trong thư mục `dist/quanlyfile-fe/`. File này đã được tự động copy khi build.

### 2.6. Test

Mở browser và truy cập: `http://localhost` (hoặc IP/domain của server)

---

## 🔥 Bước 3: Deploy lên Firebase Hosting (Optional)

### 3.1. Cài đặt Firebase CLI

```bash
npm install -g firebase-tools
```

### 3.2. Login Firebase

```bash
firebase login
```

### 3.3. Deploy

```bash
# Deploy lên hosting quanlyfiles
npm run deploy

# Hoặc deploy lên hosting quanlycongviec
npm run deploy:quanlycongviec
```

---

## 📝 Script Deploy Tự Động (PowerShell)

Tạo file `deploy-iis.ps1`:

```powershell
# Build ứng dụng
Write-Host "Building Angular application..." -ForegroundColor Green
npm run build:prod

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Copy web.config vào dist
Write-Host "Copying web.config..." -ForegroundColor Green
Copy-Item -Path "web.config" -Destination "dist\quanlyfile-fe\web.config" -Force

# Đường dẫn IIS (thay đổi theo cấu hình của bạn)
$iisPath = "C:\inetpub\wwwroot\quanlyfile-fe"

# Backup thư mục cũ
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

**Chạy script:**
```powershell
# Chạy với quyền Administrator
.\deploy-iis.ps1
```

---

## ✅ Checklist Deploy

- [ ] Node.js và npm đã cài đặt
- [ ] Dependencies đã được install (`npm install`)
- [ ] Environment files đã được cấu hình đúng (`environment.prod.ts`)
- [ ] Build production thành công (`npm run build:prod`)
- [ ] File `web.config` đã có trong `dist/quanlyfile-fe/`
- [ ] URL Rewrite Module đã được cài đặt (nếu deploy IIS)
- [ ] Website đã được tạo trong IIS (nếu deploy IIS)
- [ ] Permissions đã được set đúng
- [ ] Application Pool đã được cấu hình
- [ ] Test thành công trên browser

---

## 🔧 Troubleshooting

### Lỗi: "404 - File Not Found" khi refresh trang

**Nguyên nhân**: Thiếu URL Rewrite Module hoặc web.config không đúng

**Giải pháp**: 
- Kiểm tra URL Rewrite Module đã cài chưa
- Kiểm tra file `web.config` có trong `dist/quanlyfile-fe/` không
- Kiểm tra rule Angular Routes trong web.config

### Lỗi: "500.19 - Internal Server Error"

**Nguyên nhân**: web.config có lỗi syntax hoặc thiếu module

**Giải pháp**: 
- Kiểm tra syntax của web.config
- Đảm bảo URL Rewrite Module đã được cài

### Lỗi: "403 - Forbidden"

**Nguyên nhân**: Permissions không đúng

**Giải pháp**: 
- Kiểm tra permissions của thư mục
- Đảm bảo IIS_IUSRS có quyền đọc

### Lỗi: API calls bị CORS error

**Nguyên nhân**: Backend chưa cấu hình CORS

**Giải pháp**: 
- Cấu hình CORS ở backend
- Hoặc uncomment CORS headers trong web.config (không khuyến nghị cho production)

### Lỗi: Build failed

**Nguyên nhân**: Có lỗi trong code hoặc dependencies

**Giải pháp**: 
- Kiểm tra lỗi trong terminal
- Chạy `npm install` lại
- Kiểm tra TypeScript errors

---

## 📊 Build Output

Sau khi build thành công, bạn sẽ thấy:

```
Initial chunk files: ~1.11 MB (262.11 kB gzipped)
Lazy chunk files: ~1.5 MB (tổng)
```

**Lưu ý**: Có warning về bundle size vượt quá 1MB, nhưng không ảnh hưởng đến việc deploy.

---

## 🎯 Quick Commands

```bash
# Build production
npm run build:prod

# Build và deploy Firebase
npm run deploy

# Deploy IIS (sau khi build)
# Copy thư mục dist/quanlyfile-fe vào C:\inetpub\wwwroot\quanlyfile-fe
```

---

## 📚 Tài Liệu Tham Khảo

- [DEPLOY_IIS_GUIDE.md](./DEPLOY_IIS_GUIDE.md) - Hướng dẫn chi tiết deploy IIS
- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)
- [Angular Deployment Guide](https://angular.io/guide/deployment)

---

## 💡 Tips

1. **Backup trước khi deploy**: Luôn backup thư mục cũ trước khi copy files mới
2. **Test local trước**: Test trên localhost trước khi deploy lên server
3. **Kiểm tra logs**: Xem IIS logs nếu có lỗi: `C:\inetpub\logs\LogFiles\`
4. **Clear cache**: Clear browser cache sau khi deploy để test
5. **Environment variables**: Đảm bảo `environment.prod.ts` có đúng API URL

---

**Chúc bạn deploy thành công! 🎉**


