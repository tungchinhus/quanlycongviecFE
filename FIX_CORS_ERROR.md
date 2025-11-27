# Fix CORS Error - Backend API Requests

## Vấn Đề
- Request `firebase-token` bị CORS error
- Request `snqkhl6JsDOJfuSy11t6wVgCYla2` (user ID) bị CORS error
- Preflight (OPTIONS) request thành công (204)
- Nhưng actual request (POST/GET) bị block

## Nguyên Nhân
Backend API chưa cấu hình CORS đúng cách để cho phép requests từ frontend domain.

## Giải Pháp

### Giải Pháp 1: Cấu Hình CORS ở Backend (Khuyến Nghị)

Backend cần cấu hình CORS để cho phép:
- Origin: `http://localsite.thibidi.com`
- Methods: `GET, POST, PUT, DELETE, OPTIONS`
- Headers: `Content-Type, Authorization`
- Credentials: `true` (nếu dùng cookies/tokens)

#### Nếu Backend là Node.js/Express:

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localsite.thibidi.com',
    'http://localhost:4200', // Development
    'http://localhost:3000'  // Development
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization']
}));
```

#### Nếu Backend là ASP.NET:

```csharp
// Startup.cs hoặc Program.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localsite.thibidi.com")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

app.UseCors("AllowFrontend");
```

### Giải Pháp 2: Tạm Thời Uncomment CORS Headers trong web.config (Không Khuyến Nghị)

**Lưu ý:** Cách này chỉ nên dùng để test, không nên dùng cho production vì:
- CORS nên được xử lý ở backend
- CORS headers trong web.config chỉ áp dụng cho static files, không áp dụng cho API calls

Nếu vẫn muốn thử:

1. Mở file `web.config`
2. Uncomment phần CORS headers:

```xml
<httpProtocol>
  <customHeaders>
    <!-- CORS Headers -->
    <add name="Access-Control-Allow-Origin" value="*" />
    <add name="Access-Control-Allow-Methods" value="GET, POST, PUT, DELETE, OPTIONS" />
    <add name="Access-Control-Allow-Headers" value="Content-Type, Authorization" />
    
    <!-- Security headers -->
    <add name="X-Content-Type-Options" value="nosniff" />
    <add name="X-Frame-Options" value="DENY" />
    <add name="X-XSS-Protection" value="1; mode=block" />
    <add name="Referrer-Policy" value="strict-origin-when-cross-origin" />
  </customHeaders>
</httpProtocol>
```

3. Restart website trong IIS

**Nhưng lưu ý:** Cách này sẽ không fix được vì CORS error xảy ra ở backend API, không phải ở IIS serving static files.

### Giải Pháp 3: Kiểm Tra API URL

Đảm bảo `environment.prod.ts` có API URL đúng:

```typescript
export const environment = {
  production: true,
  apiUrl: 'http://172.20.115.40:8080/api' // Kiểm tra URL này có đúng không
};
```

**Kiểm tra:**
- API server có đang chạy không?
- URL có đúng không?
- Có thể truy cập API từ browser không?

### Giải Pháp 4: Sử Dụng Proxy (Nếu Backend và Frontend Cùng Domain)

Nếu backend và frontend cùng domain, có thể dùng proxy trong Angular:

1. Tạo file `proxy.conf.json`:

```json
{
  "/api": {
    "target": "http://172.20.115.40:8080",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  }
}
```

2. Update `angular.json`:

```json
"serve": {
  "options": {
    "proxyConfig": "proxy.conf.json"
  }
}
```

**Lưu ý:** Cách này chỉ hoạt động khi development với `ng serve`, không áp dụng cho production build.

---

## Kiểm Tra Backend CORS

### Test CORS với curl:

```bash
# Test preflight request
curl -X OPTIONS http://172.20.115.40:8080/api/auth/login/firebase-token \
  -H "Origin: http://localsite.thibidi.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v

# Kiểm tra response headers:
# - Access-Control-Allow-Origin
# - Access-Control-Allow-Methods
# - Access-Control-Allow-Headers
```

### Test với Browser:

1. Mở browser DevTools
2. Tab **Network**
3. Xem request bị CORS error
4. Click vào request → Tab **Headers**
5. Xem **Response Headers**:
   - Có `Access-Control-Allow-Origin` không?
   - Giá trị có đúng không?

---

## Checklist

- [ ] Backend đã cấu hình CORS đúng cách
- [ ] CORS cho phép origin: `http://localsite.thibidi.com`
- [ ] CORS cho phép methods: `GET, POST, PUT, DELETE, OPTIONS`
- [ ] CORS cho phép headers: `Content-Type, Authorization`
- [ ] API server đang chạy
- [ ] API URL trong environment.prod.ts đúng
- [ ] Test CORS với curl thành công
- [ ] Restart backend server sau khi cấu hình CORS

---

## Hướng Dẫn Backend

Nếu backend chưa cấu hình CORS, cần:

1. **Xác định loại backend:**
   - Node.js/Express
   - ASP.NET
   - Java/Spring Boot
   - Python/Flask/Django
   - Khác

2. **Cấu hình CORS theo loại backend**

3. **Test lại**

---

## Kết Luận

**Vấn đề CORS phải được fix ở Backend**, không phải ở Frontend hoặc IIS.

Frontend chỉ cần đảm bảo:
- ✅ API URL đúng trong `environment.prod.ts`
- ✅ Requests được gửi đúng format
- ✅ Headers được set đúng (Authorization, Content-Type)

Backend cần:
- ✅ Cấu hình CORS để cho phép requests từ frontend domain
- ✅ Trả về đúng CORS headers trong response
- ✅ Xử lý OPTIONS preflight requests

