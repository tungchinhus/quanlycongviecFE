# Kiến trúc Firebase-First cho User và Phân quyền

## Tổng quan

Hệ thống sử dụng **Firebase Authentication** làm source of truth cho user và phân quyền, với **Custom Claims** để quản lý roles. Database local chỉ lưu thông tin bổ sung và đồng bộ với Firebase.

## Kiến trúc

```
┌─────────────────────────────────────────────────────────────┐
│                    FIREBASE (Source of Truth)              │
│                                                             │
│  ┌──────────────────────┐    ┌──────────────────────────┐ │
│  │  Authentication      │    │   Custom Claims          │ │
│  │  - Email/Password    │    │   - roles: []            │ │
│  │  - Firebase UID      │    │   - name: string         │ │
│  │  - Display Name      │    │   - (metadata)           │ │
│  └──────────────────────┘    └──────────────────────────┘ │
│                                                             │
│  ⬇ ID Token chứa Custom Claims                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          │
┌─────────────────────────┴──────────────────────────────────┐
│                    FRONTEND (Angular)                       │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  AuthService                                       │    │
│  │  - Đọc roles từ ID Token Custom Claims            │    │
│  │  - Sync với Local DB (optional)                   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Auth Interceptor                                  │    │
│  │  - Tự động thêm Firebase ID Token vào headers     │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTP Request với Bearer Token
                          │
┌─────────────────────────▼──────────────────────────────────┐
│                    BACKEND API                              │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Authentication Middleware                          │    │
│  │  - Verify Firebase ID Token                         │    │
│  │  - Extract Custom Claims (roles)                    │    │
│  │  - Authorize dựa trên roles                        │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ⬇ Request với verified user                               │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  API Endpoints                                      │    │
│  │  - Sử dụng roles từ token để authorize             │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Sync (optional)
                          │
┌─────────────────────────▼──────────────────────────────────┐
│                    LOCAL DATABASE                          │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Users Table                                       │    │
│  │  - firebaseUID (Primary Key)                       │    │
│  │  - name, email (sync từ Firebase)                   │    │
│  │  - roles (sync từ Custom Claims)                    │    │
│  │  - metadata (local only)                            │    │
│  │  - createdAt, updatedAt                             │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  Lưu ý: Local DB chỉ lưu thông tin bổ sung, không phải     │
│  source of truth cho authentication và roles               │
└─────────────────────────────────────────────────────────────┘
```

## Nguyên tắc thiết kế

### 1. Firebase là Source of Truth
- **Authentication**: Firebase Authentication quản lý user login/logout
- **Roles**: Firebase Custom Claims lưu roles trong ID token
- **User Identity**: Firebase UID là primary identifier

### 2. Local DB chỉ lưu thông tin bổ sung
- Sync thông tin từ Firebase (name, email, roles)
- Lưu metadata local (username, preferences, etc.)
- Không phải source of truth cho authentication

### 3. Backend xác thực qua Firebase Custom Claims
- Verify Firebase ID token từ request headers
- Extract roles từ Custom Claims
- Authorize dựa trên roles trong token

## Workflow

### 1. Tạo User mới

```
Frontend (Admin) 
  → POST /api/users/firebase
    ↓
Backend
  → 1. Tạo user trên Firebase Authentication
  → 2. Set Custom Claims với roles
  → 3. Sync thông tin vào Local DB
    ↓
Response: UserDto với firebaseUID
```

### 2. Đăng nhập

```
User
  → Login với email/password
    ↓
Firebase Authentication
  → Verify credentials
  → Return Firebase ID token (chứa Custom Claims)
    ↓
Frontend
  → Extract roles từ ID token Custom Claims
  → Sync thông tin vào Local DB (optional)
    ↓
User authenticated với roles
```

### 3. Gọi API

```
Frontend
  → HTTP Request với Firebase ID token trong Authorization header
    ↓
Backend Auth Middleware
  → Verify Firebase ID token
  → Extract Custom Claims (roles)
  → Attach user info vào request
    ↓
API Endpoint
  → Sử dụng roles từ token để authorize
  → Return response
```

### 4. Cập nhật Roles

```
Frontend (Admin)
  → PUT /api/users/{userId}/roles
    ↓
Backend
  → 1. Update roles trong Local DB
  → 2. Set Custom Claims mới trên Firebase
    ↓
User cần refresh token để lấy claims mới
```

## Backend Authentication Implementation

### Middleware xác thực Firebase ID Token

```javascript
// Backend (Node.js/Express)
const admin = require('firebase-admin');

async function verifyFirebaseToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Extract Custom Claims
    const roles = decodedToken.roles || [];
    const name = decodedToken.name || decodedToken.name;
    
    // Attach user info to request
    req.user = {
      firebaseUID: decodedToken.uid,
      email: decodedToken.email,
      roles: Array.isArray(roles) ? roles : [roles],
      name: name
    };
    
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Sử dụng middleware
app.use('/api', verifyFirebaseToken);

// Protected route với role check
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const userRoles = req.user.roles || [];
    const hasRole = allowedRoles.some(role => userRoles.includes(role));
    
    if (!hasRole) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}

// Example: Chỉ Administrator mới có thể xóa user
app.delete('/api/users/:id', requireRole('Administrator'), async (req, res) => {
  // Delete user logic
});
```

### C# .NET Implementation

```csharp
// Backend (.NET)
using FirebaseAdmin.Auth;

public class FirebaseAuthMiddleware
{
    private readonly RequestDelegate _next;

    public FirebaseAuthMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
        
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsync("No token provided");
            return;
        }

        var token = authHeader.Substring("Bearer ".Length);
        
        try
        {
            // Verify Firebase ID token
            var decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(token);
            
            // Extract Custom Claims
            var roles = decodedToken.Claims.TryGetValue("roles", out var rolesValue) 
                ? rolesValue?.ToString().Split(',') ?? Array.Empty<string>()
                : Array.Empty<string>();
            
            var name = decodedToken.Claims.TryGetValue("name", out var nameValue) 
                ? nameValue?.ToString() 
                : null;

            // Attach user info to context
            context.Items["User"] = new
            {
                FirebaseUID = decodedToken.Uid,
                Email = decodedToken.Claims["email"]?.ToString(),
                Roles = roles,
                Name = name
            };
        }
        catch (Exception ex)
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsync("Invalid token");
            return;
        }

        await _next(context);
    }
}

// Usage
app.UseMiddleware<FirebaseAuthMiddleware>();

// Role-based authorization attribute
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public class RequireRoleAttribute : Attribute
{
    public string[] Roles { get; }

    public RequireRoleAttribute(params string[] roles)
    {
        Roles = roles;
    }
}
```

## Local Database Schema

```sql
-- Users table (sync với Firebase)
CREATE TABLE Users (
    userId INT PRIMARY KEY IDENTITY(1,1),
    firebaseUID NVARCHAR(255) UNIQUE NOT NULL, -- Firebase UID là unique identifier
    userName NVARCHAR(100), -- Local username (optional)
    fullName NVARCHAR(255), -- Sync từ Firebase
    email NVARCHAR(255), -- Sync từ Firebase
    roles NVARCHAR(MAX), -- JSON array: ["Administrator", "User"] - Sync từ Custom Claims
    isActive BIT DEFAULT 1,
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE(),
    
    -- Metadata local (không sync với Firebase)
    phoneNumber NVARCHAR(20),
    department NVARCHAR(100),
    notes NVARCHAR(MAX)
);

-- Index trên firebaseUID để query nhanh
CREATE INDEX IX_Users_FirebaseUID ON Users(firebaseUID);
```

## Quản lý Users trên Firebase

### 1. Tạo User và Set Custom Claims

Sử dụng script `scripts/manage-firebase-users.js` (xem bên dưới)

### 2. Quản lý qua Firebase Console

1. Vào Firebase Console → Authentication → Users
2. Tạo/sửa/xóa users
3. Custom Claims phải set qua Admin SDK (không thể set qua Console)

### 3. Quản lý qua Backend API

- `POST /api/users/firebase` - Tạo user mới
- `PUT /api/users/{userId}/roles` - Cập nhật roles
- `POST /api/users/{firebaseUid}/set-custom-claims` - Set custom claims

## Lưu ý quan trọng

### 1. Custom Claims không tự động refresh
- Khi set custom claims mới, user cần refresh ID token
- Frontend tự động refresh khi cần: `getIdToken(true)`

### 2. Token Expiry
- Firebase ID token có thời hạn (1 giờ)
- Interceptor tự động refresh khi cần

### 3. Backend phải verify token mỗi request
- Không cache user info từ token
- Luôn verify token để đảm bảo roles là mới nhất

### 4. Local DB chỉ là cache/sync
- Nếu Local DB không có user, tạo mới từ Firebase
- Nếu roles trong Local DB khác với Firebase, ưu tiên Firebase

## Migration từ Local-First sang Firebase-First

### Bước 1: Migrate existing users
```javascript
// Script migrate users từ Local DB lên Firebase
// Xem scripts/migrate-users-to-firebase.js
```

### Bước 2: Update Backend
- Implement Firebase token verification middleware
- Update all endpoints để sử dụng roles từ token

### Bước 3: Update Frontend
- Đã được implement trong AuthService
- Sử dụng Custom Claims từ ID token

### Bước 4: Test
- Test authentication flow
- Test role-based authorization
- Test token refresh

## Security Best Practices

1. **Luôn verify token trên backend** - Không trust client
2. **Sử dụng HTTPS** - Đảm bảo token không bị intercept
3. **Set proper CORS** - Chỉ cho phép từ domain được phép
4. **Rate limiting** - Giới hạn số lần gọi API
5. **Token expiry** - Tokens có thời hạn, tự động refresh

## Troubleshooting

### Lỗi 401 Unauthorized
- Kiểm tra token có được gửi trong header không
- Kiểm tra token có hợp lệ không (chưa hết hạn)
- Kiểm tra backend có verify token đúng không

### Roles không cập nhật
- User cần refresh token: `getIdToken(true)`
- Hoặc đăng xuất và đăng nhập lại

### Custom Claims không hiển thị
- Kiểm tra claims đã được set trên Firebase chưa
- Verify token để xem claims: `getIdTokenResult()`

