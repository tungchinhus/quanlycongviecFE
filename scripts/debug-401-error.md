# Hướng dẫn Debug Lỗi 401 Unauthorized

## Vấn đề

Sau khi reset mật khẩu và đăng nhập lại, backend trả về lỗi **401 Unauthorized** khi gọi endpoint `/auth/login/firebase-token`.

## Nguyên nhân có thể

### 1. Backend không verify được Firebase token

**Kiểm tra:**
- Backend có đang sử dụng đúng Firebase project không?
- Service Account Key trong backend có đúng không?
- Firebase Project ID có khớp giữa frontend và backend không?

**Cách kiểm tra:**
```bash
# Kiểm tra Firebase config trong frontend
cat src/environments/environment.ts

# Kiểm tra trong backend (nếu có file config)
# Project ID phải khớp giữa frontend và backend
```

### 2. Token format không đúng

Backend có thể yêu cầu:
- Token trong **Authorization header** (Bearer token) thay vì trong body
- Hoặc format request body khác

**Kiểm tra backend code:**
- Xem endpoint `/auth/login/firebase-token` trong backend
- Xem nó expect token ở đâu (header hay body)
- Xem format request body như thế nào

### 3. Token đã hết hạn hoặc không hợp lệ

**Kiểm tra:**
- Token có được force refresh không? (đã fix: `getIdToken(true)`)
- Token có bị cache không?

### 4. User chưa được sync trong backend

**Đã kiểm tra:** ✅ User có trong backend DB

## Các bước Debug

### Bước 1: Lấy Firebase ID Token

1. Mở browser và đăng nhập vào ứng dụng
2. Mở DevTools (F12) → Console
3. Chạy lệnh:
   ```javascript
   firebase.auth().currentUser?.getIdToken(true).then(token => {
     console.log('Firebase ID Token:', token);
     // Copy token này
   }).catch(err => console.error('Error:', err));
   ```

### Bước 2: Test Backend với Token

```bash
# Sử dụng script test
node scripts/test-backend-login.js "YOUR_FIREBASE_TOKEN_HERE"
```

### Bước 3: Kiểm tra Backend Logs

Xem backend logs để biết:
- Token có được nhận không?
- Lỗi gì khi verify token?
- Backend có throw exception gì không?

### Bước 4: Kiểm tra Backend Code

Kiểm tra endpoint `/auth/login/firebase-token` trong backend:

```csharp
// C# .NET example
[HttpPost("login/firebase-token")]
public async Task<IActionResult> LoginWithFirebaseToken([FromBody] LoginRequest request)
{
    // Kiểm tra request format
    if (string.IsNullOrEmpty(request.IdToken))
    {
        return BadRequest("IdToken is required");
    }
    
    try
    {
        // Verify Firebase token
        var decodedToken = await FirebaseAuth.DefaultInstance
            .VerifyIdTokenAsync(request.IdToken);
        
        // Lấy user từ DB
        var user = await _userService.GetByFirebaseUid(decodedToken.Uid);
        
        if (user == null)
        {
            return Unauthorized("User not found in database");
        }
        
        // Generate JWT token
        var jwtToken = GenerateJwtToken(user);
        
        return Ok(new { token = jwtToken, user = user });
    }
    catch (FirebaseAuthException ex)
    {
        // Log error details
        _logger.LogError(ex, "Firebase token verification failed");
        return Unauthorized($"Token verification failed: {ex.Message}");
    }
}
```

## Giải pháp

### Giải pháp 1: Kiểm tra Backend Endpoint Format

Backend có thể yêu cầu format khác:

**Option A: Token trong Body (hiện tại)**
```typescript
POST /api/auth/login/firebase-token
Body: { idToken: "..." }
```

**Option B: Token trong Header**
```typescript
POST /api/auth/login/firebase-token
Headers: { Authorization: "Bearer <firebase-token>" }
```

### Giải pháp 2: Kiểm tra Backend Firebase Config

Đảm bảo backend có:
1. ✅ Service Account Key đúng
2. ✅ Firebase Project ID khớp với frontend
3. ✅ Firebase Admin SDK được khởi tạo đúng

### Giải pháp 3: Thêm Logging

Thêm logging trong backend để xem:
- Token có được nhận không?
- Lỗi gì khi verify?
- Exception details

```csharp
_logger.LogInformation("Received login request with token length: {Length}", 
    request.IdToken?.Length ?? 0);

try 
{
    var decodedToken = await FirebaseAuth.DefaultInstance
        .VerifyIdTokenAsync(request.IdToken);
    _logger.LogInformation("Token verified successfully for UID: {Uid}", 
        decodedToken.Uid);
    // ...
}
catch (Exception ex)
{
    _logger.LogError(ex, "Token verification failed: {Message}", ex.Message);
    // ...
}
```

## Test với Postman

1. Lấy Firebase ID token từ browser console
2. Tạo request trong Postman:
   ```
   POST http://localhost:5000/api/auth/login/firebase-token
   Headers:
     Content-Type: application/json
   Body (raw JSON):
     {
       "idToken": "YOUR_FIREBASE_TOKEN_HERE"
     }
   ```
3. Xem response và status code

## Test với cURL

```bash
# Lấy token từ browser console
TOKEN="eyJhbGciOiJSUzI1NiIsImtpZCI6..."

# Test endpoint
curl -X POST http://localhost:5000/api/auth/login/firebase-token \
  -H "Content-Type: application/json" \
  -d "{\"idToken\": \"$TOKEN\"}" \
  -v
```

## Checklist

- [ ] Firebase token được lấy đúng (force refresh)
- [ ] Token được gửi trong request body với key `idToken`
- [ ] Backend nhận được request (check logs)
- [ ] Backend có thể verify Firebase token (check Service Account Key)
- [ ] Firebase Project ID khớp giữa frontend và backend
- [ ] User có trong backend DB
- [ ] Backend endpoint format đúng

## Next Steps

1. Sử dụng script `test-backend-login.js` để test backend
2. Kiểm tra backend logs để xem lỗi chi tiết
3. Kiểm tra backend code để xem format request expected
4. So sánh Firebase config giữa frontend và backend

