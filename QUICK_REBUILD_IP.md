# Hướng Dẫn Nhanh: Rebuild Khi Thay Đổi IP

## Vấn Đề
Sau khi thay đổi IP trong `environment.prod.ts`, ứng dụng vẫn dùng IP cũ.

## Nguyên Nhân
**Files đã build trong `dist/` vẫn chứa IP cũ.** Cần rebuild để tạo files mới với IP mới.

---

## Giải Pháp Nhanh

### Cách 1: Sử Dụng Script Tự Động (Khuyến Nghị)

```powershell
# Chạy script với IP mới
.\rebuild-with-new-ip.ps1 192.168.1.100 8080

# Ví dụ:
.\rebuild-with-new-ip.ps1 192.168.1.100 8080
```

Script sẽ tự động:
1. ✅ Cập nhật IP trong `environment.prod.ts`
2. ✅ Xóa thư mục `dist/` cũ
3. ✅ Rebuild ứng dụng
4. ✅ Kiểm tra IP mới trong build

---

### Cách 2: Thủ Công

#### Bước 1: Cập nhật IP trong environment.prod.ts

Mở file `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  // ...
  apiUrl: 'http://[IP_MỚI]:[PORT]/api' // Thay IP mới ở đây
};
```

#### Bước 2: Xóa thư mục dist cũ

```powershell
# Xóa thư mục dist
Remove-Item -Path "dist" -Recurse -Force
```

#### Bước 3: Rebuild ứng dụng

```powershell
# Build production
npm run build:prod

# Hoặc
ng build --configuration production
```

#### Bước 4: Copy files mới vào IIS

Copy tất cả files từ `dist/quanlyfile-fe/` vào thư mục IIS của bạn.

#### Bước 5: Clear cache

1. **Browser cache:**
   - Ctrl + Shift + Delete
   - Chọn "Cached images and files"
   - Clear

2. **Hard refresh:**
   - Ctrl + F5

3. **Restart IIS (nếu cần):**
   ```powershell
   iisreset
   ```

---

## Kiểm Tra IP Đã Được Cập Nhật

### Cách 1: Kiểm tra trong build

```powershell
# Tìm IP trong các file JS đã build
Select-String -Path "dist\quanlyfile-fe\*.js" -Pattern "172.20.115.40" | Select-Object -First 5

# Nếu không tìm thấy IP cũ → đã rebuild đúng
# Nếu vẫn thấy IP cũ → chưa rebuild hoặc rebuild sai
```

### Cách 2: Kiểm tra từ browser

1. Mở browser DevTools (F12)
2. Tab **Network**
3. Thử đăng nhập
4. Xem request URL → phải là IP mới

### Cách 3: Kiểm tra console

Mở browser console (F12) và xem các request API → URL phải là IP mới.

---

## Troubleshooting

### Vấn đề 1: Vẫn thấy IP cũ sau khi rebuild

**Nguyên nhân:**
- Browser cache
- IIS cache
- Chưa copy files mới vào IIS

**Giải pháp:**
1. Clear browser cache (Ctrl + Shift + Delete)
2. Hard refresh (Ctrl + F5)
3. Kiểm tra files trong IIS có phải files mới không
4. Restart IIS: `iisreset`

---

### Vấn đề 2: Build bị lỗi

**Kiểm tra:**
1. Node modules có đầy đủ không: `npm install`
2. Angular CLI version: `ng version`
3. Xem lỗi chi tiết trong console

---

### Vấn đề 3: IP không được cập nhật trong build

**Kiểm tra:**
1. File `environment.prod.ts` có IP mới chưa?
2. Build có dùng `--configuration production` không?
3. Có xóa thư mục `dist/` cũ trước khi build không?

---

## Checklist

- [ ] Đã cập nhật IP trong `environment.prod.ts`
- [ ] Đã xóa thư mục `dist/` cũ
- [ ] Đã rebuild với `npm run build:prod`
- [ ] Đã copy files mới vào IIS
- [ ] Đã clear browser cache
- [ ] Đã hard refresh (Ctrl + F5)
- [ ] Đã test đăng nhập và kiểm tra IP mới

---

## Lệnh Nhanh

```powershell
# 1. Cập nhật IP và rebuild tự động
.\rebuild-with-new-ip.ps1 192.168.1.100 8080

# 2. Hoặc thủ công
Remove-Item -Path "dist" -Recurse -Force
npm run build:prod

# 3. Clear cache browser
# Ctrl + Shift + Delete → Clear cache

# 4. Hard refresh
# Ctrl + F5
```

---

## Lưu Ý Quan Trọng

⚠️ **Mỗi lần thay đổi IP, PHẢI:**
1. ✅ Cập nhật `environment.prod.ts`
2. ✅ **Rebuild** ứng dụng
3. ✅ **Copy files mới** vào IIS
4. ✅ **Clear cache** browser

❌ **KHÔNG** chỉ cập nhật `environment.prod.ts` mà không rebuild!

