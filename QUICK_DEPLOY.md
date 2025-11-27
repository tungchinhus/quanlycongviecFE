# 🚀 Hướng Dẫn Deploy Nhanh

## Build và Deploy lên IIS

### Cách 1: Sử dụng Script Tự Động (Khuyến nghị)

```powershell
# Chạy với quyền Administrator
.\deploy-iis.ps1
```

Script sẽ tự động:
1. ✅ Build ứng dụng (`npm run build:prod`)
2. ✅ Copy `web.config` vào dist
3. ✅ Backup thư mục cũ (nếu có)
4. ✅ Copy files vào IIS

### Cách 2: Deploy Thủ Công

#### Bước 1: Build
```bash
npm run build:prod
```

#### Bước 2: Copy Files
Copy toàn bộ nội dung thư mục `dist/quanlyfile-fe` vào thư mục IIS (ví dụ: `C:\inetpub\wwwroot\quanlyfile-fe`)

#### Bước 3: Kiểm tra
- ✅ File `web.config` đã có trong thư mục IIS
- ✅ File `index.html` đã có
- ✅ Tất cả file `.js`, `.css` đã có

---

## Deploy lên Firebase Hosting

```bash
# Build và deploy
npm run deploy

# Hoặc deploy hosting khác
npm run deploy:quanlycongviec
```

---

## ⚠️ Lưu Ý Quan Trọng

1. **Environment Configuration**: Đảm bảo `src/environments/environment.prod.ts` có đúng API URL
2. **IIS Requirements**: Cần cài đặt **URL Rewrite Module 2.1**
3. **Permissions**: Đảm bảo IIS_IUSRS có quyền đọc thư mục
4. **Backup**: Luôn backup trước khi deploy

---

## 📋 Checklist Nhanh

- [ ] `npm install` đã chạy
- [ ] `environment.prod.ts` đã cấu hình đúng
- [ ] `npm run build:prod` thành công
- [ ] File `web.config` có trong `dist/quanlyfile-fe/`
- [ ] IIS website đã được tạo
- [ ] URL Rewrite Module đã cài
- [ ] Permissions đã set
- [ ] Test thành công

---

## 🔧 Troubleshooting Nhanh

| Lỗi | Giải pháp |
|-----|-----------|
| 404 khi refresh | Kiểm tra URL Rewrite Module và web.config |
| 500.19 | Kiểm tra syntax web.config |
| 403 Forbidden | Kiểm tra permissions |
| CORS error | Cấu hình CORS ở backend |

---

Xem chi tiết tại: [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md)



