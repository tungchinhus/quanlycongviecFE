# Fix: Root URL về Default IIS thay vì Website

## Vấn Đề
- `http://localsite.thibidi.com/` → Về trang Default IIS
- `http://localsite.thibidi.com/index.html` → Về trang login (OK)

## Nguyên Nhân
1. **Default Web Site đang bind port 80** và được ưu tiên hơn
2. **Website "quanlyfile" chưa có binding đúng** cho hostname
3. **Thứ tự website** trong IIS

## Giải Pháp

### Cách 1: Dùng Script (Khuyến nghị)

Chạy script PowerShell với quyền Administrator:

```powershell
.\fix-iis-binding.ps1
```

Script sẽ:
- Kiểm tra và thêm binding cho hostname
- Kiểm tra Default Web Site
- Cấu hình Default Document
- Restart website

### Cách 2: Sửa Thủ Công

#### Bước 1: Kiểm Tra Binding của Website "quanlyfile"

1. Mở **IIS Manager**
2. Chọn website **"quanlyfile"**
3. Click **Bindings...** ở Actions pane
4. Kiểm tra có binding:
   - **Type**: `http`
   - **IP address**: `All Unassigned` hoặc IP cụ thể
   - **Port**: `80`
   - **Host name**: `localsite.thibidi.com`

**Nếu không có:**
- Click **Add...**
- Điền:
  - **Type**: `http`
  - **IP address**: `All Unassigned`
  - **Port**: `80`
  - **Host name**: `localsite.thibidi.com`
- Click **OK**

#### Bước 2: Xử Lý Default Web Site

**Option A: Stop Default Web Site (Khuyến nghị)**

1. Trong IIS Manager, chọn **"Default Web Site"**
2. Click **Stop** ở Actions pane

**Option B: Đổi Port của Default Web Site**

1. Chọn **"Default Web Site"**
2. Click **Bindings...**
3. Chọn binding port 80
4. Click **Edit...**
5. Đổi **Port** thành `8080`
6. Click **OK**

**Option C: Thêm Host Header cho Default Web Site**

1. Chọn **"Default Web Site"**
2. Click **Bindings...**
3. Chọn binding port 80
4. Click **Edit...**
5. Thêm **Host name**: `localhost` hoặc tên khác
6. Click **OK**

#### Bước 3: Cấu Hình Default Document

1. Chọn website **"quanlyfile"**
2. Double-click **Default Document**
3. Đảm bảo `index.html` có và ở **đầu danh sách**
4. Nếu không có, click **Add...** và thêm `index.html`
5. Di chuyển `index.html` lên đầu (dùng **Move Up**)

#### Bước 4: Restart Website

1. Chọn website **"quanlyfile"**
2. Click **Restart** ở Actions pane

---

## Kiểm Tra Sau Khi Sửa

### Test 1: Root URL
```
http://localsite.thibidi.com/
```
**Kết quả mong đợi**: Phải về trang login (không phải Default IIS)

### Test 2: Direct URL
```
http://localsite.thibidi.com/index.html
```
**Kết quả mong đợi**: Phải về trang login

### Test 3: Routing
```
http://localsite.thibidi.com/login
http://localsite.thibidi.com/users
```
**Kết quả mong đợi**: Phải load được (không 404)

---

## Troubleshooting

### Vẫn về Default IIS sau khi sửa

1. **Kiểm tra thứ tự website:**
   - IIS Manager → Sites
   - Website nào ở trên sẽ được ưu tiên nếu cùng binding
   - Có thể cần di chuyển "quanlyfile" lên trên

2. **Kiểm tra binding trùng lặp:**
   ```powershell
   Get-WebBinding | Where-Object { $_.protocol -eq "http" -and $_.bindingInformation -like "*:80:*" }
   ```

3. **Clear browser cache:**
   - Nhấn **Ctrl + F5** để hard refresh
   - Hoặc clear cache hoàn toàn

4. **Kiểm tra hosts file:**
   - Mở `C:\Windows\System32\drivers\etc\hosts`
   - Đảm bảo có dòng:
     ```
     127.0.0.1    localsite.thibidi.com
     ```
   - Hoặc IP của server

### Lỗi "Binding already exists"

Nếu thêm binding bị lỗi "already exists":
- Kiểm tra binding đã có chưa
- Nếu có, chỉ cần đảm bảo Host name đúng
- Không cần thêm lại

---

## Quick Fix Commands

### Stop Default Web Site
```powershell
Stop-WebSite -Name "Default Web Site"
```

### Add Binding với Host Header
```powershell
New-WebBinding -Name "quanlyfile" -Protocol http -Port 80 -HostHeader "localsite.thibidi.com"
```

### Kiểm Tra Bindings
```powershell
Get-WebBinding -Name "quanlyfile"
Get-WebBinding -Name "Default Web Site"
```

### Restart Website
```powershell
Restart-WebAppPool -Name "quanlyfile"
Restart-WebSite -Name "quanlyfile"
```

---

## Checklist

- [ ] Website "quanlyfile" có binding cho `localsite.thibidi.com` trên port 80
- [ ] Default Web Site đã được stop hoặc đổi port
- [ ] Default Document có `index.html` ở đầu
- [ ] Website "quanlyfile" đang chạy (Started)
- [ ] Đã restart website
- [ ] Đã clear browser cache
- [ ] Test `http://localsite.thibidi.com/` → Phải về trang login

---

## Kết Luận

Sau khi hoàn thành các bước trên:
- ✅ `http://localsite.thibidi.com/` sẽ về trang login
- ✅ `http://localsite.thibidi.com/index.html` vẫn hoạt động
- ✅ Routing sẽ hoạt động đúng

Nếu vẫn không được, kiểm tra:
1. DNS/hosts file có đúng không
2. Firewall có block port 80 không
3. Có website khác đang bind cùng port 80 không

