# Fix Lỗi 500: FileNotFoundException - Google.Apis.Auth

## Vấn đề

Backend trả về lỗi **HTTP 500 Internal Server Error** khi login:
```
System.IO.FileNotFoundException: 
Could not load file or assembly 'Google.Apis.Auth, Version=1.68.0.0, Culture=neutral, PublicKeyToken=4b01fa6e34db77ab'. 
The system cannot find the file specified.
```

**Stack Trace:**
```
at quanlyfilesBE.Services.FirebaseService.InitializeFirebase()
at quanlyfilesBE.Services.FirebaseService..ctor()
```

## Nguyên nhân

Backend thiếu package **Google.Apis.Auth** hoặc version không khớp. Đây là dependency bắt buộc của Firebase Admin SDK cho .NET.

## Giải pháp

### Bước 1: Cài đặt/Update NuGet Packages

Trong backend project (C# .NET), chạy các lệnh sau:

#### Option A: Sử dụng Package Manager Console

```powershell
# Trong Visual Studio: Tools → NuGet Package Manager → Package Manager Console

# Cài đặt Firebase Admin SDK
Install-Package FirebaseAdmin

# Cài đặt Google APIs Auth (dependency)
Install-Package Google.Apis.Auth

# Hoặc update nếu đã có
Update-Package Google.Apis.Auth
```

#### Option B: Sử dụng .NET CLI

```bash
# Trong thư mục backend project
cd quanlyfilesBE

# Cài đặt Firebase Admin SDK
dotnet add package FirebaseAdmin

# Cài đặt Google APIs Auth
dotnet add package Google.Apis.Auth

# Hoặc với version cụ thể (nếu cần)
dotnet add package Google.Apis.Auth --version 1.68.0
```

#### Option C: Sử dụng NuGet Package Manager UI

1. Right-click project → **Manage NuGet Packages**
2. Search: `Google.Apis.Auth`
3. Install hoặc Update package
4. Search: `FirebaseAdmin`
5. Install hoặc Update package

### Bước 2: Kiểm tra .csproj file

Đảm bảo file `.csproj` có các package references:

```xml
<ItemGroup>
  <PackageReference Include="FirebaseAdmin" Version="2.4.0" />
  <PackageReference Include="Google.Apis.Auth" Version="1.68.0" />
  <!-- Hoặc version mới hơn -->
</ItemGroup>
```

### Bước 3: Restore Packages

```bash
# Restore all packages
dotnet restore

# Rebuild project
dotnet build
```

### Bước 4: Kiểm tra Service Account Key

Đảm bảo file `service-account-key.json` tồn tại trong backend project:

```csharp
// Trong FirebaseService.cs hoặc Program.cs
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
```

### Bước 5: Kiểm tra FirebaseService Initialization

Đảm bảo code khởi tạo Firebase đúng:

```csharp
using FirebaseAdmin;
using FirebaseAdmin.Auth;
using Google.Apis.Auth.OAuth2;

public class FirebaseService
{
    public FirebaseService()
    {
        InitializeFirebase();
    }
    
    private void InitializeFirebase()
    {
        // Kiểm tra đã khởi tạo chưa
        if (FirebaseApp.DefaultInstance != null)
        {
            return; // Đã khởi tạo rồi
        }
        
        try
        {
            var serviceAccountPath = Path.Combine(
                Directory.GetCurrentDirectory(), 
                "service-account-key.json"
            );
            
            if (!File.Exists(serviceAccountPath))
            {
                throw new FileNotFoundException(
                    $"Service Account Key not found: {serviceAccountPath}"
                );
            }
            
            // Khởi tạo Firebase Admin SDK
            FirebaseApp.Create(new AppOptions()
            {
                Credential = GoogleCredential.FromFile(serviceAccountPath)
            });
            
            Console.WriteLine("✅ Firebase Admin SDK initialized successfully");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error initializing Firebase: {ex.Message}");
            throw;
        }
    }
}
```

## Kiểm tra Dependencies

### Xem tất cả NuGet packages:

```bash
dotnet list package
```

### Kiểm tra package cụ thể:

```bash
dotnet list package | grep -i "google\|firebase"
```

### Expected output:

```
> dotnet list package

Project 'quanlyfilesBE' has the following package references
   [net8.0]: 
   FirebaseAdmin 2.4.0
   Google.Apis.Auth 1.68.0
   Google.Apis.Core 1.68.0
   ...
```

## Troubleshooting

### Lỗi: Package version conflict

Nếu có conflict giữa các versions:

```bash
# Update tất cả packages
dotnet restore --force
dotnet build --no-restore
```

### Lỗi: Assembly not found after install

1. Clean solution:
   ```bash
   dotnet clean
   ```

2. Delete `bin` và `obj` folders:
   ```bash
   rm -rf bin obj
   ```

3. Restore và build lại:
   ```bash
   dotnet restore
   dotnet build
   ```

### Lỗi: Still getting FileNotFoundException

Kiểm tra:
1. ✅ Package đã được install đúng?
2. ✅ Version có khớp không?
3. ✅ Service Account Key file có tồn tại?
4. ✅ File path có đúng không?
5. ✅ Có copy file vào output directory không?

**Kiểm tra file có được copy vào output:**

Trong `.csproj`, thêm:
```xml
<ItemGroup>
  <None Update="service-account-key.json">
    <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
  </None>
</ItemGroup>
```

## Quick Fix Checklist

- [ ] Install package `Google.Apis.Auth` (version 1.68.0 hoặc mới hơn)
- [ ] Install package `FirebaseAdmin` (version mới nhất)
- [ ] Run `dotnet restore`
- [ ] Run `dotnet build`
- [ ] Kiểm tra `service-account-key.json` có tồn tại
- [ ] Kiểm tra file path trong code có đúng
- [ ] Test lại login endpoint

## Test sau khi fix

Sau khi fix, test lại:

```bash
# Test với script
node scripts/test-backend-login.js "YOUR_FIREBASE_TOKEN"
```

Hoặc test trực tiếp trong browser:
- Đăng nhập với email/username
- Kiểm tra không còn lỗi 500
- Kiểm tra response có JWT token và user info

## Lưu ý

- **Version compatibility**: Đảm bảo version của `Google.Apis.Auth` tương thích với `FirebaseAdmin`
- **Service Account Key**: File phải được copy vào output directory khi build
- **Path**: Sử dụng `Directory.GetCurrentDirectory()` hoặc `AppDomain.CurrentDomain.BaseDirectory` để lấy path đúng

## Next Steps

1. ✅ Fix backend: Install missing packages
2. ✅ Verify: Test login endpoint
3. ✅ Deploy: Nếu fix thành công, deploy backend

---

## Fix Lỗi: "The default FirebaseApp already exists"

### Vấn đề

Backend trả về lỗi:
```
System.ArgumentException: The default FirebaseApp already exists.
at FirebaseAdmin.FirebaseApp.Create(AppOptions options, String name)
```

### Nguyên nhân

Firebase App đã được khởi tạo rồi (có thể trong `Program.cs` hoặc nơi khác), nhưng code trong `FirebaseService` cố khởi tạo lại.

### Giải pháp

**Trong `FirebaseService.cs`, thêm kiểm tra trước khi tạo:**

```csharp
public class FirebaseService
{
    public FirebaseService(ILogger<FirebaseService> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
        InitializeFirebase();
    }
    
    private void InitializeFirebase()
    {
        // ✅ QUAN TRỌNG: Kiểm tra đã khởi tạo chưa
        if (FirebaseApp.DefaultInstance != null)
        {
            _logger.LogInformation("FirebaseApp already initialized");
            return; // Đã khởi tạo rồi, không cần tạo lại
        }
        
        try
        {
            var serviceAccountPath = Path.Combine(
                Directory.GetCurrentDirectory(), 
                "service-account-key.json"
            );
            
            if (!File.Exists(serviceAccountPath))
            {
                throw new FileNotFoundException(
                    $"Service Account Key not found: {serviceAccountPath}"
                );
            }
            
            // Chỉ tạo nếu chưa có
            FirebaseApp.Create(new AppOptions()
            {
                Credential = GoogleCredential.FromFile(serviceAccountPath)
            });
            
            _logger.LogInformation("✅ Firebase Admin SDK initialized successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error initializing Firebase: {Message}", ex.Message);
            throw;
        }
    }
}
```

### Hoặc trong Program.cs

Nếu khởi tạo Firebase trong `Program.cs`, đảm bảo chỉ khởi tạo một lần:

```csharp
public class Program
{
    public static void Main(string[] args)
    {
        // Khởi tạo Firebase một lần duy nhất ở đây
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
        
        // Đăng ký services
        builder.Services.AddSingleton<FirebaseAuth>(provider =>
        {
            // Không cần tạo lại, chỉ return instance đã có
            return FirebaseAuth.DefaultInstance;
        });
        
        // ...
    }
}
```

### Best Practice

**Option 1: Khởi tạo trong Program.cs (Recommended)**

```csharp
// Program.cs
if (FirebaseApp.DefaultInstance == null)
{
    FirebaseApp.Create(...);
}

// FirebaseService.cs - chỉ sử dụng, không tạo
public class FirebaseService
{
    public FirebaseService()
    {
        if (FirebaseApp.DefaultInstance == null)
        {
            throw new InvalidOperationException("FirebaseApp must be initialized in Program.cs");
        }
        // Chỉ sử dụng FirebaseAuth.DefaultInstance
    }
}
```

**Option 2: Khởi tạo trong Service với Singleton**

```csharp
// Program.cs
builder.Services.AddSingleton<FirebaseService>(provider =>
{
    var service = new FirebaseService(...);
    // Firebase đã được khởi tạo trong constructor
    return service;
});

// FirebaseService.cs
public class FirebaseService
{
    private static readonly object _lock = new object();
    
    public FirebaseService()
    {
        InitializeFirebase();
    }
    
    private void InitializeFirebase()
    {
        // Thread-safe initialization
        if (FirebaseApp.DefaultInstance != null)
        {
            return;
        }
        
        lock (_lock)
        {
            // Double-check
            if (FirebaseApp.DefaultInstance != null)
            {
                return;
            }
            
            FirebaseApp.Create(...);
        }
    }
}
```

### Quick Fix

Sửa code trong `FirebaseService.cs` line 39:

**Trước:**
```csharp
FirebaseApp.Create(new AppOptions() { ... });
```

**Sau:**
```csharp
if (FirebaseApp.DefaultInstance == null)
{
    FirebaseApp.Create(new AppOptions() { ... });
}
```

### Checklist

- [ ] Thêm kiểm tra `FirebaseApp.DefaultInstance != null` trước khi tạo
- [ ] Đảm bảo Firebase chỉ được khởi tạo một lần
- [ ] Nếu khởi tạo trong Program.cs, không khởi tạo lại trong Service
- [ ] Test lại login endpoint

