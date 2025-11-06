# Fix Lỗi 401: "Object reference not set to an instance of an object"

## Vấn đề

Backend trả về lỗi:
```
Status: 401 Unauthorized
Response: "Invalid Firebase ID token: Object reference not set to an instance of an object."
```

Đây là **NullReferenceException** trong C# .NET backend, có nghĩa là có object bị null khi backend cố verify Firebase token.

## Nguyên nhân

### 1. Firebase Admin SDK chưa được khởi tạo

**Triệu chứng:**
- `FirebaseAuth.DefaultInstance` là `null`
- Khi gọi `FirebaseAuth.DefaultInstance.VerifyIdTokenAsync()` → NullReferenceException

**Giải pháp:**

Kiểm tra trong `Program.cs` hoặc `Startup.cs`:

```csharp
// ✅ ĐÚNG: Khởi tạo Firebase Admin SDK
using FirebaseAdmin;
using FirebaseAdmin.Auth;
using Google.Apis.Auth.OAuth2;

public class Program
{
    public static void Main(string[] args)
    {
        // Khởi tạo Firebase Admin SDK
        if (FirebaseApp.DefaultInstance == null)
        {
            var serviceAccountPath = Path.Combine(
                Directory.GetCurrentDirectory(), 
                "service-account-key.json"
            );
            
            FirebaseApp.Create(new AppOptions()
            {
                Credential = GoogleCredential.FromFile(serviceAccountPath)
            });
        }
        
        var builder = WebApplication.CreateBuilder(args);
        // ...
    }
}
```

**Hoặc sử dụng environment variable:**

```csharp
// Lấy từ environment variable
var firebaseJson = Environment.GetEnvironmentVariable("FIREBASE_SERVICE_ACCOUNT_JSON");
if (!string.IsNullOrEmpty(firebaseJson))
{
    FirebaseApp.Create(new AppOptions()
    {
        Credential = GoogleCredential.FromString(firebaseJson)
    });
}
```

### 2. Service Account Key không được load

**Kiểm tra:**
- File `service-account-key.json` có tồn tại trong backend project không?
- Path đến file có đúng không?
- File có format JSON hợp lệ không?

**Giải pháp:**

```csharp
// Kiểm tra file tồn tại
var serviceAccountPath = Path.Combine(
    Directory.GetCurrentDirectory(), 
    "service-account-key.json"
);

if (!File.Exists(serviceAccountPath))
{
    throw new FileNotFoundException(
        $"Service Account Key not found at: {serviceAccountPath}"
    );
}

// Load và verify
var credential = GoogleCredential.FromFile(serviceAccountPath);
FirebaseApp.Create(new AppOptions()
{
    Credential = credential
});
```

### 3. Firebase Admin SDK chưa được inject vào DI Container

**Giải pháp:**

```csharp
// Trong Program.cs hoặc Startup.cs
builder.Services.AddSingleton<FirebaseAuth>(provider =>
{
    if (FirebaseApp.DefaultInstance == null)
    {
        // Khởi tạo Firebase Admin
        var serviceAccountPath = Path.Combine(
            Directory.GetCurrentDirectory(), 
            "service-account-key.json"
        );
        
        FirebaseApp.Create(new AppOptions()
        {
            Credential = GoogleCredential.FromFile(serviceAccountPath)
        });
    }
    
    return FirebaseAuth.DefaultInstance;
});
```

Sau đó inject vào controller/service:

```csharp
public class AuthController : ControllerBase
{
    private readonly FirebaseAuth _firebaseAuth;
    
    public AuthController(FirebaseAuth firebaseAuth)
    {
        _firebaseAuth = firebaseAuth ?? throw new ArgumentNullException(nameof(firebaseAuth));
    }
    
    [HttpPost("login/firebase-token")]
    public async Task<IActionResult> LoginWithFirebaseToken([FromBody] LoginRequest request)
    {
        try
        {
            // Verify token với FirebaseAuth instance
            var decodedToken = await _firebaseAuth.VerifyIdTokenAsync(request.IdToken);
            // ...
        }
        catch (FirebaseAuthException ex)
        {
            return Unauthorized($"Invalid token: {ex.Message}");
        }
    }
}
```

### 4. Kiểm tra trong Endpoint Login

**Code mẫu đúng:**

```csharp
[HttpPost("login/firebase-token")]
public async Task<IActionResult> LoginWithFirebaseToken([FromBody] LoginRequest request)
{
    // 1. Validate input
    if (request == null || string.IsNullOrEmpty(request.IdToken))
    {
        return BadRequest("IdToken is required");
    }
    
    // 2. Kiểm tra FirebaseAuth instance
    if (FirebaseAuth.DefaultInstance == null)
    {
        _logger.LogError("FirebaseAuth.DefaultInstance is null. Firebase Admin SDK chưa được khởi tạo.");
        return StatusCode(500, "Firebase authentication service is not initialized");
    }
    
    try
    {
        // 3. Verify Firebase token
        var decodedToken = await FirebaseAuth.DefaultInstance
            .VerifyIdTokenAsync(request.IdToken);
        
        _logger.LogInformation("Token verified for UID: {Uid}", decodedToken.Uid);
        
        // 4. Lấy user từ database
        var user = await _userService.GetByFirebaseUid(decodedToken.Uid);
        
        if (user == null)
        {
            _logger.LogWarning("User not found in database for UID: {Uid}", decodedToken.Uid);
            return Unauthorized("User not found in database");
        }
        
        // 5. Generate JWT token
        var jwtToken = GenerateJwtToken(user);
        
        return Ok(new { 
            token = jwtToken, 
            user = new {
                userId = user.Id,
                userName = user.UserName,
                fullName = user.FullName,
                email = user.Email,
                firebaseUID = user.FirebaseUID,
                roles = user.Roles,
                emailVerified = decodedToken.Claims.ContainsKey("email_verified") 
                    && bool.Parse(decodedToken.Claims["email_verified"].ToString())
            }
        });
    }
    catch (FirebaseAuthException ex)
    {
        _logger.LogError(ex, "Firebase token verification failed: {Message}", ex.Message);
        return Unauthorized($"Invalid Firebase ID token: {ex.Message}");
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Unexpected error during login: {Message}", ex.Message);
        return StatusCode(500, $"Internal server error: {ex.Message}");
    }
}
```

## Debugging Steps

### Bước 1: Kiểm tra Firebase Admin SDK đã được khởi tạo chưa

Thêm logging trong `Program.cs`:

```csharp
// Sau khi khởi tạo Firebase
if (FirebaseApp.DefaultInstance != null)
{
    Console.WriteLine("✅ Firebase Admin SDK initialized successfully");
    Console.WriteLine($"Project ID: {FirebaseApp.DefaultInstance.ProjectId}");
}
else
{
    Console.WriteLine("❌ Firebase Admin SDK initialization failed!");
}
```

### Bước 2: Kiểm tra Service Account Key

```csharp
var serviceAccountPath = Path.Combine(
    Directory.GetCurrentDirectory(), 
    "service-account-key.json"
);

Console.WriteLine($"Service Account Path: {serviceAccountPath}");
Console.WriteLine($"File exists: {File.Exists(serviceAccountPath)}");

if (File.Exists(serviceAccountPath))
{
    var content = File.ReadAllText(serviceAccountPath);
    var json = JsonSerializer.Deserialize<JsonElement>(content);
    Console.WriteLine($"Project ID: {json.GetProperty("project_id").GetString()}");
}
```

### Bước 3: Test Firebase Admin SDK

Tạo endpoint test:

```csharp
[HttpGet("test/firebase")]
public IActionResult TestFirebase()
{
    try
    {
        if (FirebaseApp.DefaultInstance == null)
        {
            return BadRequest(new { 
                error = "Firebase Admin SDK not initialized",
                firebaseApp = "null"
            });
        }
        
        return Ok(new { 
            status = "OK",
            projectId = FirebaseApp.DefaultInstance.ProjectId,
            firebaseAuth = FirebaseAuth.DefaultInstance != null ? "Initialized" : "Null"
        });
    }
    catch (Exception ex)
    {
        return StatusCode(500, new { error = ex.Message });
    }
}
```

## Checklist

- [ ] Firebase Admin SDK được khởi tạo trong `Program.cs` hoặc `Startup.cs`
- [ ] Service Account Key file tồn tại và có path đúng
- [ ] Service Account Key có format JSON hợp lệ
- [ ] Firebase Project ID khớp giữa frontend và backend
- [ ] `FirebaseAuth.DefaultInstance` không null trước khi verify token
- [ ] Có error handling và logging đầy đủ
- [ ] Test endpoint `/test/firebase` trả về OK

## Quick Fix

Thêm kiểm tra null trong login endpoint:

```csharp
[HttpPost("login/firebase-token")]
public async Task<IActionResult> LoginWithFirebaseToken([FromBody] LoginRequest request)
{
    // Kiểm tra FirebaseAuth instance
    if (FirebaseAuth.DefaultInstance == null)
    {
        _logger.LogError("FirebaseAuth.DefaultInstance is null");
        return StatusCode(500, "Firebase authentication service is not initialized");
    }
    
    // ... rest of code
}
```

## Next Steps

1. ✅ Kiểm tra Firebase Admin SDK initialization trong backend
2. ✅ Kiểm tra Service Account Key file
3. ✅ Thêm null check trong login endpoint
4. ✅ Test lại với script `test-backend-login.js`

