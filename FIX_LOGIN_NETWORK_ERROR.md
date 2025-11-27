# Fix Lỗi Login Network Error

## Vấn Đề
Request login bị lỗi `(failed) net...` sau ~2 giây.

## Nguyên Nhân Đã Phát Hiện

### 1. ❌ CORS Chưa Được Cấu Hình
Backend không trả về CORS headers → Browser chặn request.

### 2. ⚠️ Endpoint Login Trả Về 500
Backend có lỗi khi xử lý login request.

---

## Giải Pháp

### Bước 1: Cấu Hình CORS ở Backend (QUAN TRỌNG)

Backend **PHẢI** cấu hình CORS để cho phép requests từ frontend.

#### Nếu Backend là ASP.NET Core:

**File: `Program.cs` hoặc `Startup.cs`**

```csharp
// Thêm CORS service
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localsite.thibidi.com",  // Frontend domain
                "http://localhost:4200"           // Development
            )
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

// Sử dụng CORS (phải đặt TRƯỚC UseRouting)
app.UseCors("AllowFrontend");
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
```

**Lưu ý:** Sau khi cấu hình, **PHẢI restart backend server**.

---

#### Nếu Backend là Node.js/Express:

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localsite.thibidi.com',
    'http://localhost:4200'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

### Bước 2: Kiểm Tra Lỗi 500 ở Backend

Endpoint `/api/auth/login/firebase-token` trả về 500.

**Kiểm tra:**
1. Xem logs của backend server
2. Kiểm tra:
   - Firebase Admin SDK đã được khởi tạo chưa?
   - Service account key có đúng không?
   - Database connection có OK không?

**Test endpoint:**
```bash
# Test với curl
curl -X POST http://172.20.115.40:8080/api/auth/login/firebase-token \
  -H "Content-Type: application/json" \
  -d '{"idToken":"test-token"}'
```

---

### Bước 3: Rebuild Frontend (Nếu Đã Đổi IP)

Nếu bạn đã thay đổi IP trong `environment.prod.ts`:

```powershell
# Xóa dist cũ
Remove-Item -Path "dist" -Recurse -Force

# Rebuild
npm run build:prod

# Copy files mới vào IIS
# Clear browser cache (Ctrl + Shift + Delete)
# Hard refresh (Ctrl + F5)
```

---

## Kiểm Tra Sau Khi Fix

### 1. Test CORS Headers:

```bash
# Test OPTIONS request (preflight)
curl -X OPTIONS http://172.20.115.40:8080/api/auth/login/firebase-token \
  -H "Origin: http://localsite.thibidi.com" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Phải thấy headers:
# Access-Control-Allow-Origin: http://localsite.thibidi.com
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
# Access-Control-Allow-Headers: Content-Type, Authorization
```

### 2. Test từ Browser:

1. Mở DevTools (F12)
2. Tab **Network**
3. Thử đăng nhập
4. Xem request login:
   - **Status:** Phải là 200 (không phải failed)
   - **Response Headers:** Phải có `Access-Control-Allow-Origin`

---

## Checklist

- [ ] Backend đã cấu hình CORS
- [ ] Backend đã restart sau khi cấu hình CORS
- [ ] CORS headers xuất hiện trong response (test với curl)
- [ ] Endpoint login không còn trả về 500
- [ ] Frontend đã rebuild (nếu đổi IP)
- [ ] Browser cache đã được clear
- [ ] Test đăng nhập thành công từ browser

---

## Troubleshooting

### Vấn đề 1: Vẫn bị CORS error sau khi cấu hình

**Kiểm tra:**
1. Backend có restart chưa?
2. CORS middleware có đặt **TRƯỚC** UseRouting không?
3. Origin trong CORS config có đúng không? (phải khớp với domain frontend)

---

### Vấn đề 2: Endpoint login vẫn trả về 500

**Kiểm tra:**
1. Backend logs có lỗi gì?
2. Firebase Admin SDK có được khởi tạo đúng không?
3. Service account key có hợp lệ không?
4. Database connection có OK không?

---

### Vấn đề 3: Request vẫn bị "failed net..."

**Kiểm tra:**
1. Backend có đang chạy không?
2. IP/Port có đúng không?
3. Firewall có chặn không?
4. Network có kết nối không?

---

## Lệnh Kiểm Tra Nhanh

```bash
# 1. Kiểm tra backend có chạy
node scripts/check-api-connection.js http://172.20.115.40:8080/api

# 2. Test CORS
curl -X OPTIONS http://172.20.115.40:8080/api/auth/login/firebase-token \
  -H "Origin: http://localsite.thibidi.com" \
  -v

# 3. Test login endpoint
curl -X POST http://172.20.115.40:8080/api/auth/login/firebase-token \
  -H "Content-Type: application/json" \
  -d '{"idToken":"test"}' \
  -v
```

---

## Kết Luận

**Vấn đề chính:** CORS chưa được cấu hình ở backend.

**Giải pháp:**
1. ✅ Cấu hình CORS ở backend
2. ✅ Restart backend server
3. ✅ Fix lỗi 500 ở endpoint login (nếu có)
4. ✅ Rebuild frontend (nếu đổi IP)
5. ✅ Clear browser cache và test lại

Sau khi fix CORS, request login sẽ không còn bị lỗi network nữa.

