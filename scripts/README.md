# Scripts - Hướng dẫn sử dụng

## Script: create-admin.js

Script tạo user Administrator cho hệ thống.

### Yêu cầu

1. Node.js đã được cài đặt
2. Dependencies:
   ```bash
   npm install firebase-admin axios
   ```

### Cách sử dụng

#### Bước 1: Lấy Service Account Key

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Chọn project `quanlyfiles-9891e`
3. Vào **Project Settings** → **Service Accounts**
4. Click **Generate new private key**
5. Lưu file JSON vào thư mục project với tên `service-account-key.json`
6. ⚠️ **Lưu ý**: Không commit file này lên Git!

#### Bước 2: Cập nhật cấu hình

Mở file `scripts/create-admin.js` và cập nhật các thông tin trong phần `CONFIG`:

```javascript
const CONFIG = {
  serviceAccountPath: './service-account-key.json',
  admin: {
    email: 'admin@quanlyfiles.com',
    password: 'Admin@123456', // Đổi mật khẩu này!
    name: 'System Administrator',
    roles: ['Administrator']
  },
  apiUrl: 'http://localhost:5000/api',
  createInLocalDB: true
};
```

#### Bước 3: Chạy script

```bash
node scripts/create-admin.js
```

### Kết quả

Script sẽ:
- ✅ Tạo user trên Firebase Authentication
- ✅ Set custom claims với role Administrator
- ✅ Tạo user trong local DB (nếu có API)
- ✅ Hiển thị thông tin đăng nhập

### Lưu ý

1. **Bảo mật**: Không commit `service-account-key.json` lên Git
2. **Đổi mật khẩu**: Luôn đổi mật khẩu sau lần đầu tạo
3. **Token refresh**: User cần đăng nhập lại để nhận custom claims mới

### Troubleshooting

**Lỗi: Cannot find module 'firebase-admin'**
```bash
npm install firebase-admin axios
```

**Lỗi: Service account key not found**
- Kiểm tra đường dẫn trong `serviceAccountPath`
- Đảm bảo file JSON tồn tại

**Lỗi: Email already exists**
- Script sẽ tự động cập nhật custom claims cho user hiện có
- Hoặc xóa user cũ và tạo lại

**Lỗi: Cannot connect to API**
- Kiểm tra `apiUrl` có đúng không
- Đảm bảo backend đang chạy
- Nếu không có API, set `createInLocalDB: false`

---

## Script: check-firebase-user.js

Script kiểm tra user trong Firebase Authentication và Backend DB.

### Yêu cầu

1. Node.js đã được cài đặt
2. Dependencies (đã có sẵn từ script trước):
   ```bash
   npm install firebase-admin axios
   ```

### Cách sử dụng

```bash
node scripts/check-firebase-user.js <email>
```

**Example:**
```bash
node scripts/check-firebase-user.js chinhdvt@gmail.com
```

### Chức năng

Script sẽ kiểm tra:

1. ✅ **User có tồn tại trong Firebase không?**
   - UID, Email, Display Name
   - Email Verified status
   - Custom Claims (roles)
   - Disabled status
   - Last sign in time

2. ✅ **User có trong Backend DB không?**
   - So sánh thông tin giữa Firebase và Backend
   - Kiểm tra roles có khớp không

3. ✅ **Đưa ra khuyến nghị**
   - Các vấn đề cần khắc phục
   - Các bước cần thực hiện

### Kết quả mẫu

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 THÔNG TIN FIREBASE USER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ User tồn tại trong Firebase

📧 Email: user@example.com
🆔 UID: abc123...
👤 Display Name: User Name
✅ Email Verified: Yes
🎭 Custom Claims:
   Roles: Administrator, Manager
```

### Sử dụng khi nào?

- ✅ Khi gặp lỗi `INVALID_LOGIN_CREDENTIALS`
- ✅ Kiểm tra user có tồn tại trước khi đăng nhập
- ✅ Kiểm tra roles/custom claims có đúng không
- ✅ So sánh thông tin giữa Firebase và Backend
- ✅ Debug các vấn đề về authentication

### Troubleshooting

**Lỗi: User không tồn tại**
- Tạo user mới: `node scripts/manage-firebase-users.js create <email> <password> <name> <roles>`

**Lỗi: User không có roles**
- Set roles: `node scripts/manage-firebase-users.js set-roles <email> "Administrator"`

**Lỗi: Cannot connect to Backend**
- Kiểm tra backend có đang chạy không
- Kiểm tra `apiUrl` trong script

---

## Script: reset-password.js

Script reset mật khẩu cho user trong Firebase Authentication.

### Yêu cầu

1. Node.js đã được cài đặt
2. Dependencies (đã có sẵn):
   ```bash
   npm install firebase-admin
   ```

### Cách sử dụng

#### Reset với mật khẩu random (tự động tạo)

```bash
node scripts/reset-password.js <email>
```

**Example:**
```bash
node scripts/reset-password.js chinhdvt@gmail.com
```

Script sẽ tự động tạo mật khẩu random mạnh (12 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt).

#### Reset với mật khẩu tự định nghĩa

```bash
node scripts/reset-password.js <email> <newPassword>
```

**Example:**
```bash
node scripts/reset-password.js chinhdvt@gmail.com "NewPass123!"
```

#### Gửi email reset password link

```bash
node scripts/reset-password.js <email> --send-email
```

**Example:**
```bash
node scripts/reset-password.js chinhdvt@gmail.com --send-email
```

Script sẽ tạo link reset password và hiển thị link đó. Bạn có thể gửi link này cho user để họ tự reset mật khẩu.

### Chức năng

- ✅ Reset mật khẩu trực tiếp trong Firebase
- ✅ Tạo mật khẩu random mạnh (tự động)
- ✅ Validate mật khẩu (độ dài, độ mạnh)
- ✅ Gửi email reset link (optional)
- ✅ Hiển thị thông tin đăng nhập mới
- ✅ Kiểm tra user có tồn tại không

### Kết quả mẫu

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 RESET MẬT KHẨU THÀNH CÔNG!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Thông tin đăng nhập mới:
   Email: user@example.com
   Password: Xy9#mK2$pQwR
   UID: abc123...
   Name: User Name
   Roles: Administrator

⚠️  QUAN TRỌNG:
   1. Lưu lại mật khẩu mới ở nơi an toàn
   2. Thông báo cho user về mật khẩu mới
   3. Khuyến nghị user đổi mật khẩu sau lần đăng nhập đầu tiên
   4. Xóa mật khẩu này khỏi console/log sau khi đã thông báo
```

### Sử dụng khi nào?

- ✅ User quên mật khẩu
- ✅ Cần reset mật khẩu sau khi phát hiện lỗi `INVALID_LOGIN_CREDENTIALS`
- ✅ Reset mật khẩu cho user mới
- ✅ Reset mật khẩu sau khi user bị khóa tài khoản

### Troubleshooting

**Lỗi: User không tồn tại**
- Kiểm tra lại email
- Tạo user mới: `node scripts/manage-firebase-users.js create <email> <password> <name> <roles>`

**Lỗi: Mật khẩu quá yếu**
- Mật khẩu phải có ít nhất 6 ký tự
- Khuyến nghị: có chữ hoa, chữ thường, số và ký tự đặc biệt

**Lỗi: Cannot initialize Firebase**
- Kiểm tra file `service-account-key.json` có tồn tại không
- Kiểm tra file JSON có hợp lệ không

---

## Script: set-user-role.js

Script set role cho user cụ thể trong Firebase Authentication.

### Yêu cầu

1. Node.js đã được cài đặt
2. Dependencies (đã có sẵn):
   ```bash
   npm install firebase-admin
   ```

### Cách sử dụng

#### Set một role

```bash
node scripts/set-user-role.js <email> <role>
```

**Example:**
```bash
node scripts/set-user-role.js chinhdvt@gmail.com Administrator
```

#### Set nhiều roles

```bash
node scripts/set-user-role.js <email> "role1,role2"
```

**Example:**
```bash
node scripts/set-user-role.js chinhdvt@gmail.com "Administrator,Manager"
```

### Available Roles

- `Administrator` (hoặc `Admin` - sẽ tự động chuyển thành `Administrator`)
- `Manager`
- `User`
- `Guest`

### Chức năng

- ✅ Set roles cho user bằng email
- ✅ Set custom claims trên Firebase
- ✅ Validate roles (chỉ chấp nhận roles hợp lệ)
- ✅ Normalize roles (Admin → Administrator)
- ✅ Hiển thị thông tin user và roles trước/sau
- ✅ Kiểm tra user có tồn tại không

### Kết quả mẫu

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 SET ROLES THÀNH CÔNG!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Thông tin User:
   Email: user@example.com
   UID: abc123...
   Name: User Name
   Roles: Administrator, Manager
   Email Verified: Yes

⚠️  QUAN TRỌNG:
   1. User cần đăng xuất và đăng nhập lại để nhận roles mới
   2. Hoặc user cần refresh token để nhận custom claims mới
   3. Roles sẽ có hiệu lực ngay sau khi user refresh token
```

### Sử dụng khi nào?

- ✅ Cần thay đổi roles cho user
- ✅ Thêm/bớt roles cho user
- ✅ Set roles mặc định cho user mới
- ✅ Fix roles khi roles bị lỗi

### Examples

```bash
# Set role Administrator
node scripts/set-user-role.js user@example.com Administrator

# Set role Manager
node scripts/set-user-role.js user@example.com Manager

# Set nhiều roles
node scripts/set-user-role.js user@example.com "Administrator,Manager"

# Set role User (mặc định)
node scripts/set-user-role.js user@example.com User

# Set role Admin (sẽ tự động chuyển thành Administrator)
node scripts/set-user-role.js user@example.com Admin
```

### Troubleshooting

**Lỗi: User không tồn tại**
- Kiểm tra lại email
- Tạo user mới: `node scripts/manage-firebase-users.js create <email> <password> <name> <roles>`

**Lỗi: Invalid roles**
- Chỉ chấp nhận các roles: Administrator, Manager, User, Guest
- Kiểm tra lại roles đã nhập

**Lỗi: Cannot initialize Firebase**
- Kiểm tra file `service-account-key.json` có tồn tại không
- Kiểm tra file JSON có hợp lệ không

**User không thấy roles mới sau khi set**
- User cần đăng xuất và đăng nhập lại
- Hoặc user cần refresh token trong frontend:
  ```typescript
  await authService.refreshUserClaims();
  ```

