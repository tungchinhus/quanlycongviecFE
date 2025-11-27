# Hướng Dẫn Backend: Fix CORS Error

## Tổng Quan

Frontend đang gặp CORS errors khi gọi API:
- Request `firebase-token` → `/api/auth/login/firebase-token`
- Request user data → `/api/users/{userId}`
- Preflight (OPTIONS) thành công nhưng actual request bị block

**Frontend Domain:** `http://localsite.thibidi.com`  
**Backend API:** `http://172.20.115.40:8080/api`

---

## Giải Pháp Theo Từng Loại Backend

### 1. Node.js / Express

#### Cách 1: Sử dụng cors package (Khuyến nghị)

**Bước 1: Cài đặt package**
```bash
npm install cors
```

**Bước 2: Cấu hình trong server file (app.js hoặc server.js)**

```javascript
const express = require('express');
const cors = require('cors');
const app = express();

// Cấu hình CORS
app.use(cors({
  origin: [
    'http://localsite.thibidi.com',  // Production
    'http://localhost:4200',          // Angular dev server
    'http://localhost:3000'           // Nếu có frontend dev khác
  ],
  credentials: true,  // Cho phép gửi cookies/credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['Authorization'],  // Headers frontend có thể đọc
  maxAge: 86400  // Cache preflight requests trong 24 giờ
}));

// Hoặc cho phép tất cả origins (chỉ dùng cho development)
// app.use(cors());

// Các routes khác
app.use('/api', routes);

app.listen(8080, () => {
  console.log('Server running on port 8080');
});
```

#### Cách 2: Manual CORS headers (nếu không dùng package)

```javascript
const express = require('express');
const app = express();

// Middleware để xử lý CORS
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localsite.thibidi.com',
    'http://localhost:4200',
    'http://localhost:3000'
  ];
  
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Expose-Headers', 'Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Xử lý preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  
  next();
});

// Các routes khác
app.use('/api', routes);
```

---

### 2. ASP.NET Core

#### Cách 1: Cấu hình trong Program.cs (.NET 6+)

```csharp
var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers();

// Cấu hình CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localsite.thibidi.com",  // Production
                "http://localhost:4200"           // Development
            )
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials()
            .WithExposedHeaders("Authorization");
    });
});

var app = builder.Build();

// Sử dụng CORS (phải đặt trước UseRouting và UseEndpoints)
app.UseCors("AllowFrontend");

app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
```

#### Cách 2: Cấu hình trong Startup.cs (.NET 5 hoặc cũ hơn)

```csharp
public class Startup
{
    public void ConfigureServices(IServiceCollection services)
    {
        services.AddControllers();
        
        // Cấu hình CORS
        services.AddCors(options =>
        {
            options.AddPolicy("AllowFrontend", policy =>
            {
                policy.WithOrigins(
                        "http://localsite.thibidi.com",
                        "http://localhost:4200"
                    )
                    .AllowAnyMethod()
                    .AllowAnyHeader()
                    .AllowCredentials()
                    .WithExposedHeaders("Authorization");
            });
        });
    }

    public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
    {
        // Sử dụng CORS (phải đặt trước UseRouting)
        app.UseCors("AllowFrontend");
        
        app.UseRouting();
        app.UseAuthentication();
        app.UseAuthorization();
        
        app.UseEndpoints(endpoints =>
        {
            endpoints.MapControllers();
        });
    }
}
```

---

### 3. Java / Spring Boot

#### Cách 1: Sử dụng @CrossOrigin annotation

```java
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {
    "http://localsite.thibidi.com",
    "http://localhost:4200"
}, allowCredentials = "true")
public class ApiController {
    // Controllers
}
```

#### Cách 2: Global CORS Configuration (Khuyến nghị)

**Tạo file CorsConfig.java:**

```java
package com.yourpackage.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {
    
    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        
        // Cho phép credentials
        config.setAllowCredentials(true);
        
        // Cho phép các origins
        config.setAllowedOrigins(Arrays.asList(
            "http://localsite.thibidi.com",
            "http://localhost:4200"
        ));
        
        // Cho phép tất cả methods
        config.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"
        ));
        
        // Cho phép tất cả headers
        config.setAllowedHeaders(Arrays.asList(
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "Accept",
            "Origin"
        ));
        
        // Expose headers cho frontend
        config.setExposedHeaders(Arrays.asList("Authorization"));
        
        // Cache preflight trong 24 giờ
        config.setMaxAge(86400L);
        
        source.registerCorsConfiguration("/api/**", config);
        return new CorsFilter(source);
    }
}
```

**Hoặc sử dụng WebMvcConfigurer:**

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {
    
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(
                    "http://localsite.thibidi.com",
                    "http://localhost:4200"
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
                .allowedHeaders("*")
                .allowCredentials(true)
                .exposedHeaders("Authorization")
                .maxAge(86400);
    }
}
```

---

### 4. Python / Flask

```python
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)

# Cấu hình CORS
CORS(app, 
     origins=[
         "http://localsite.thibidi.com",
         "http://localhost:4200"
     ],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization'],
     supports_credentials=True,
     expose_headers=['Authorization'],
     max_age=86400)

# Hoặc chỉ cho một route cụ thể
# CORS(app, resources={r"/api/*": {"origins": "http://localsite.thibidi.com"}})

@app.route('/api/health')
def health():
    return {'status': 'ok'}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

**Cài đặt package:**
```bash
pip install flask-cors
```

---

### 5. Python / Django

**Cài đặt package:**
```bash
pip install django-cors-headers
```

**Cấu hình trong settings.py:**

```python
INSTALLED_APPS = [
    # ...
    'corsheaders',
    # ...
]

MIDDLEWARE = [
    # ...
    'corsheaders.middleware.CorsMiddleware',  # Phải đặt ở đầu
    'django.middleware.common.CommonMiddleware',
    # ...
]

# Cấu hình CORS
CORS_ALLOWED_ORIGINS = [
    "http://localsite.thibidi.com",
    "http://localhost:4200",
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

CORS_EXPOSE_HEADERS = ['Authorization']
CORS_PREFLIGHT_MAX_AGE = 86400
```

---

## Kiểm Tra CORS Đã Hoạt Động

### Test với curl:

```bash
# Test preflight request (OPTIONS)
curl -X OPTIONS http://172.20.115.40:8080/api/auth/login/firebase-token \
  -H "Origin: http://localsite.thibidi.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v

# Kiểm tra response headers phải có:
# Access-Control-Allow-Origin: http://localsite.thibidi.com
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
# Access-Control-Allow-Headers: Content-Type, Authorization
# Access-Control-Allow-Credentials: true
```

### Test actual request:

```bash
# Test POST request
curl -X POST http://172.20.115.40:8080/api/auth/login/firebase-token \
  -H "Origin: http://localsite.thibidi.com" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token" \
  -d '{"idToken":"test"}' \
  -v
```

### Test với Browser:

1. Mở browser DevTools (F12)
2. Tab **Network**
3. Thực hiện action gây ra CORS error
4. Click vào request bị lỗi
5. Tab **Headers** → Xem **Response Headers**:
   - Phải có `Access-Control-Allow-Origin`
   - Giá trị phải là `http://localsite.thibidi.com` hoặc `*`

---

## Troubleshooting

### Vấn đề 1: Preflight thành công nhưng actual request vẫn bị block

**Nguyên nhân:** Headers không khớp

**Giải pháp:**
- Đảm bảo `Access-Control-Allow-Headers` bao gồm tất cả headers frontend gửi
- Đảm bảo `Access-Control-Allow-Methods` bao gồm method đang dùng (POST, GET, etc.)

### Vấn đề 2: Credentials không được gửi

**Nguyên nhân:** `Access-Control-Allow-Credentials` chưa được set

**Giải pháp:**
- Set `allowCredentials: true` (Node.js)
- Set `AllowCredentials()` (ASP.NET)
- Set `allowCredentials: true` (Spring Boot)

**Lưu ý:** Khi dùng credentials, không thể dùng `Access-Control-Allow-Origin: *`, phải chỉ định origin cụ thể.

### Vấn đề 3: Authorization header không được đọc

**Nguyên nhân:** Header chưa được expose

**Giải pháp:**
- Thêm `exposedHeaders: ['Authorization']` (Node.js)
- Thêm `WithExposedHeaders("Authorization")` (ASP.NET)
- Thêm `exposedHeaders(Arrays.asList("Authorization"))` (Spring Boot)

### Vấn đề 4: CORS chỉ hoạt động với một số routes

**Nguyên nhân:** CORS middleware chưa được áp dụng cho tất cả routes

**Giải pháp:**
- Đảm bảo CORS middleware được đặt trước các middleware khác
- Đảm bảo CORS được apply cho tất cả routes (`/api/**`)

---

## Best Practices

1. **Không dùng `*` cho production:**
   ```javascript
   // ❌ Không nên
   origin: '*'
   
   // ✅ Nên
   origin: ['http://localsite.thibidi.com']
   ```

2. **Luôn chỉ định methods cụ thể:**
   ```javascript
   // ✅ Nên
   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
   ```

3. **Xử lý OPTIONS requests:**
   - Đảm bảo OPTIONS requests trả về 204 (No Content)
   - Không cần xử lý logic trong OPTIONS handler

4. **Cache preflight requests:**
   - Set `maxAge` để giảm số lượng preflight requests
   - Khuyến nghị: 86400 (24 giờ)

5. **Logging để debug:**
   ```javascript
   // Node.js example
   app.use((req, res, next) => {
     console.log('Request Origin:', req.headers.origin);
     console.log('Request Method:', req.method);
     next();
   });
   ```

---

## Checklist

- [ ] CORS đã được cấu hình trong backend
- [ ] Origin `http://localsite.thibidi.com` đã được thêm vào allowed origins
- [ ] Methods `GET, POST, PUT, DELETE, OPTIONS` đã được cho phép
- [ ] Headers `Content-Type, Authorization` đã được cho phép
- [ ] `allowCredentials` đã được set thành `true`
- [ ] `Authorization` header đã được expose
- [ ] OPTIONS requests trả về 204
- [ ] Đã test với curl thành công
- [ ] Đã test với browser và không còn CORS errors
- [ ] Backend server đã được restart sau khi cấu hình

---

## Code Mẫu Hoàn Chỉnh

### Node.js/Express - Complete Example

```javascript
const express = require('express');
const cors = require('cors');
const app = express();

// Cấu hình CORS
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localsite.thibidi.com',
      'http://localhost:4200'
    ];
    
    // Cho phép requests không có origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['Authorization'],
  maxAge: 86400
};

app.use(cors(corsOptions));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', require('./routes'));

// Error handling
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({ error: 'CORS: Origin not allowed' });
  } else {
    res.status(500).json({ error: err.message });
  }
});

app.listen(8080, '0.0.0.0', () => {
  console.log('Server running on http://172.20.115.40:8080');
});
```

---

## Kết Luận

Sau khi cấu hình CORS đúng cách:

1. ✅ Preflight requests (OPTIONS) sẽ trả về 204
2. ✅ Actual requests sẽ không bị block
3. ✅ Frontend có thể gọi API thành công
4. ✅ Authorization headers sẽ được gửi và nhận đúng

**Lưu ý:** Sau khi cấu hình, phải **restart backend server** để áp dụng thay đổi.

Nếu vẫn gặp vấn đề, kiểm tra:
- Backend server có đang chạy không?
- Port 8080 có bị firewall block không?
- CORS configuration có đúng syntax không?
- Logs của backend có lỗi gì không?

