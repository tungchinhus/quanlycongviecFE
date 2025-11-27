# Quick Fix: Trang Trắng - Không Có Lỗi Trong Console

## Tình Trạng
- Console chỉ có: "HTML1300: Navigation occurred"
- Không có errors (0 errors)
- Trang trắng hoàn toàn

## Nguyên Nhân Có Thể
1. **Files chưa được copy đầy đủ** - Các file .js, .css không có trong thư mục IIS
2. **index.html không load được** - File không tồn tại hoặc không được serve
3. **Base href sai** - Đường dẫn files không đúng
4. **Default Document chưa được cấu hình** - IIS không biết serve file nào

## Các Bước Kiểm Tra và Sửa

### Bước 1: Kiểm Tra Network Tab (QUAN TRỌNG)

1. Trong DevTools, click tab **Network**
2. Refresh trang (F5 hoặc Ctrl+R)
3. Xem các requests:
   - `index.html` - Status phải là 200 (OK)
   - `main.*.js` - Status phải là 200
   - `polyfills.*.js` - Status phải là 200
   - `runtime.*.js` - Status phải là 200
   - `styles.*.css` - Status phải là 200

**Nếu thấy 404 (Not Found):**
→ Files chưa được copy hoặc đường dẫn sai

**Nếu không thấy requests nào:**
→ index.html không load được

### Bước 2: Kiểm Tra Files Trên Server

1. Mở File Explorer
2. Đi đến: `C:\inetpub\wwwroot\quanlyfileFe\`
3. Kiểm tra có các file sau không:
   ```
   ✅ index.html
   ✅ main.*.js (ví dụ: main.8f09e34f7cfa14b8.js)
   ✅ polyfills.*.js
   ✅ runtime.*.js
   ✅ styles.*.css
   ✅ web.config
   ✅ assets/ (folder)
   ```

**Nếu thiếu files:**
→ Cần rebuild và copy lại

### Bước 3: Rebuild và Copy Lại Files

```bash
# 1. Build lại
npm run build:prod

# 2. Kiểm tra output
# Mở thư mục: dist/quanlyfile-fe
# Đảm bảo có đầy đủ files

# 3. Copy lên IIS
# Copy toàn bộ từ dist/quanlyfile-fe/ 
# vào C:\inetpub\wwwroot\quanlyfileFe\
```

**Hoặc dùng script:**
```powershell
.\deploy-iis.ps1
```

### Bước 4: Kiểm Tra Default Document trong IIS

1. Mở IIS Manager
2. Chọn website "quanlyfile"
3. Double-click **Default Document**
4. Đảm bảo `index.html` có trong danh sách
5. Nếu không có, click **Add** và thêm `index.html`
6. Di chuyển `index.html` lên đầu danh sách (nếu cần)

### Bước 5: Kiểm Tra Base Href

1. Mở file `C:\inetpub\wwwroot\quanlyfileFe\index.html`
2. Tìm dòng: `<base href="/">`
3. Nếu deploy vào subfolder, cần sửa thành:
   ```html
   <base href="/quanlyfileFe/">
   ```

**Hoặc build lại với base-href:**
```bash
npm run build:prod -- --base-href /quanlyfileFe/
```

### Bước 6: Thử Truy Cập Trực Tiếp

Thử mở trực tiếp file index.html:
```
http://localsite.thibidi.com/index.html
```

**Nếu mở được:**
→ Vấn đề là routing hoặc default document

**Nếu không mở được:**
→ Vấn đề là permissions hoặc file không tồn tại

### Bước 7: Kiểm Tra Permissions

1. Click chuột phải vào `C:\inetpub\wwwroot\quanlyfileFe`
2. **Properties** → **Security**
3. Click **Edit**
4. Thêm (nếu chưa có):
   - **IIS_IUSRS**: Read & Execute, List folder contents, Read
   - **IUSR**: Read & Execute, List folder contents, Read
5. Click **OK**

### Bước 8: Restart Website

1. Trong IIS Manager, chọn website
2. Click **Restart** trong Actions pane
3. Hoặc dùng PowerShell:
   ```powershell
   Restart-WebAppPool -Name "quanlyfile"
   ```

---

## Checklist Nhanh

- [ ] Mở Network tab và kiểm tra files có load được không
- [ ] Kiểm tra thư mục IIS có đầy đủ files không
- [ ] Rebuild và copy lại files nếu thiếu
- [ ] Kiểm tra Default Document có index.html không
- [ ] Kiểm tra base href trong index.html
- [ ] Thử truy cập trực tiếp index.html
- [ ] Kiểm tra permissions
- [ ] Restart website

---

## Giải Pháp Nhanh Nhất

Nếu muốn fix nhanh, làm theo thứ tự:

1. **Rebuild:**
   ```bash
   npm run build:prod
   ```

2. **Copy files:**
   - Copy toàn bộ từ `dist/quanlyfile-fe/`
   - Vào `C:\inetpub\wwwroot\quanlyfileFe\`
   - Overwrite tất cả

3. **Kiểm tra Default Document:**
   - IIS Manager → Website → Default Document
   - Đảm bảo có `index.html`

4. **Restart:**
   - IIS Manager → Website → Restart

5. **Test lại:**
   - Mở browser và refresh (Ctrl+F5 để clear cache)

---

## Nếu Vẫn Không Được

Cung cấp thông tin sau:

1. **Screenshot Network tab** - Xem files nào load được, files nào 404
2. **Danh sách files** trong thư mục IIS (screenshot hoặc `dir` command)
3. **Nội dung index.html** trên server (copy vài dòng đầu)
4. **IIS Logs** (nếu có lỗi)

