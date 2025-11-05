# Backend Authentication với Firebase Custom Claims

## Tổng quan

Backend xác thực requests bằng cách verify Firebase ID token và extract Custom Claims (roles) để authorize.

## Flow Authentication

```
1. Client → HTTP Request với Header:
   Authorization: Bearer <Firebase ID Token>

2. Backend Middleware:
   - Verify Firebase ID Token
   - Extract Custom Claims (roles)
   - Attach user info vào request

3. API Endpoint:
   - Sử dụng roles từ token để authorize
   - Return response
```

## Implementation

### Node.js/Express

```javascript
const admin = require('firebase-admin');
const express = require('express');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Middleware verify Firebase token
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
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    
    // Attach user info to request
    req.user = {
      firebaseUID: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.email?.split('@')[0],
      roles: rolesArray
    };
    
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Role-based authorization middleware
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const userRoles = req.user?.roles || [];
    const hasRole = allowedRoles.some(role => userRoles.includes(role));
    
    if (!hasRole) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: userRoles
      });
    }
    
    next();
  };
}

// Apply middleware
const app = express();
app.use('/api', verifyFirebaseToken);

// Protected routes
app.get('/api/users', requireRole('Administrator', 'Manager'), async (req, res) => {
  // Get users list
});

app.delete('/api/users/:id', requireRole('Administrator'), async (req, res) => {
  // Delete user - chỉ Administrator
});
```

### C# .NET

```csharp
using FirebaseAdmin;
using FirebaseAdmin.Auth;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using System.Security.Claims;

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
            await context.Response.WriteAsJsonAsync(new { error = "No token provided" });
            return;
        }

        var token = authHeader.Substring("Bearer ".Length);
        
        try
        {
            // Verify Firebase ID token
            var decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(token);
            
            // Extract Custom Claims
            var roles = decodedToken.Claims.TryGetValue("roles", out var rolesValue) 
                ? rolesValue?.ToString()?.Split(',') ?? Array.Empty<string>()
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
            await context.Response.WriteAsJsonAsync(new { error = "Invalid token" });
            return;
        }

        await _next(context);
    }
}

// Extension method
public static class FirebaseAuthMiddlewareExtensions
{
    public static IApplicationBuilder UseFirebaseAuth(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<FirebaseAuthMiddleware>();
    }
}

// Usage in Program.cs
app.UseFirebaseAuth();

// Role-based authorization attribute
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public class RequireRoleAttribute : Attribute, IAuthorizationFilter
{
    private readonly string[] _roles;

    public RequireRoleAttribute(params string[] roles)
    {
        _roles = roles;
    }

    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.Items["User"] as dynamic;
        var userRoles = user?.Roles as string[] ?? Array.Empty<string>();
        
        var hasRole = _roles.Any(role => userRoles.Contains(role));
        
        if (!hasRole)
        {
            context.Result = new JsonResult(new { error = "Insufficient permissions" })
            {
                StatusCode = 403
            };
        }
    }
}

// Usage
[HttpGet("users")]
[RequireRole("Administrator", "Manager")]
public IActionResult GetUsers()
{
    // Get users
}
```

## API Endpoints với Authorization

### 1. GET /api/users
```javascript
// Chỉ Administrator và Manager có thể xem danh sách users
app.get('/api/users', requireRole('Administrator', 'Manager'), async (req, res) => {
  // Get users from local DB
  const users = await db.users.findAll();
  res.json(users);
});
```

### 2. POST /api/users/firebase
```javascript
// Chỉ Administrator có thể tạo user mới
app.post('/api/users/firebase', requireRole('Administrator'), async (req, res) => {
  const { name, email, password, roles } = req.body;
  
  // 1. Tạo user trên Firebase
  const userRecord = await admin.auth().createUser({
    email,
    password,
    displayName: name
  });
  
  // 2. Set Custom Claims
  await admin.auth().setCustomUserClaims(userRecord.uid, {
    roles,
    name
  });
  
  // 3. Tạo trong Local DB
  const localUser = await db.users.create({
    firebaseUID: userRecord.uid,
    name,
    email,
    roles
  });
  
  res.status(201).json(localUser);
});
```

### 3. PUT /api/users/:userId/roles
```javascript
// Chỉ Administrator có thể cập nhật roles
app.put('/api/users/:userId/roles', requireRole('Administrator'), async (req, res) => {
  const { roles } = req.body;
  const userId = req.params.userId;
  
  // 1. Lấy user từ DB
  const user = await db.users.findById(userId);
  
  // 2. Update roles trong DB
  await db.users.update(userId, { roles });
  
  // 3. Set Custom Claims trên Firebase
  await admin.auth().setCustomUserClaims(user.firebaseUID, {
    roles,
    name: user.name
  });
  
  const updatedUser = await db.users.findById(userId);
  res.json(updatedUser);
});
```

### 4. DELETE /api/users/:userId
```javascript
// Chỉ Administrator có thể xóa user
app.delete('/api/users/:userId', requireRole('Administrator'), async (req, res) => {
  const userId = req.params.userId;
  
  // 1. Lấy user từ DB
  const user = await db.users.findById(userId);
  
  // 2. Xóa trên Firebase
  await admin.auth().deleteUser(user.firebaseUID);
  
  // 3. Xóa trong Local DB
  await db.users.delete(userId);
  
  res.status(204).send();
});
```

## Error Handling

```javascript
// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'FirebaseAuthError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  res.status(500).json({ error: 'Internal server error' });
});
```

## Testing

### Test với Postman

1. Lấy Firebase ID token:
   - Login qua frontend
   - Copy token từ localStorage hoặc Network tab

2. Gọi API:
   ```
   GET http://localhost:5000/api/users
   Headers:
     Authorization: Bearer <Firebase ID Token>
   ```

### Test với cURL

```bash
# Lấy token (từ frontend console)
TOKEN="eyJhbGciOiJSUzI1NiIsImtpZCI6..."

# Gọi API
curl -X GET http://localhost:5000/api/users \
  -H "Authorization: Bearer $TOKEN"
```

## Security Best Practices

1. **Luôn verify token** - Không trust client
2. **HTTPS only** - Đảm bảo token không bị intercept
3. **Token expiry** - Tokens có thời hạn, tự động refresh
4. **Rate limiting** - Giới hạn số lần gọi API
5. **CORS** - Chỉ cho phép từ domain được phép
6. **Input validation** - Validate tất cả input từ client

## Troubleshooting

### Lỗi 401 Unauthorized
- Token không được gửi trong header
- Token đã hết hạn
- Token không hợp lệ

### Lỗi 403 Forbidden
- User không có đủ quyền (roles)
- Roles không match với required roles

### Custom Claims không hiển thị
- Claims chưa được set trên Firebase
- User chưa refresh token sau khi set claims

