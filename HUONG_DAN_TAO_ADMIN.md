# Hướng dẫn tạo User Administrator cho hệ thống

## Tổng quan

Có 3 cách để tạo user administrator:
1. **Qua Firebase Console** (khuyến nghị cho lần đầu setup)
2. **Qua Backend API** (sử dụng script hoặc API)
3. **Qua Frontend UI** (nếu đã có admin khác)

---

## Phương pháp 1: Tạo qua Firebase Console (Khuyến nghị)

### Bước 1: Tạo user trên Firebase Authentication

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Chọn project `quanlyfiles-9891e`
3. Vào **Authentication** → **Users**
4. Click **Add user**
5. Nhập thông tin:
   - **Email**: `admin@quanlyfiles.com` (hoặc email bạn muốn)
   - **Password**: Tạo mật khẩu mạnh (tối thiểu 6 ký tự)
6. Click **Add user**

### Bước 2: Set Custom Claims cho user (quan trọng)

1. Vào **Authentication** → **Users**
2. Tìm và click vào user vừa tạo
3. Copy **User UID** (ví dụ: `abc123xyz...`)

4. Sử dụng Firebase Admin SDK để set custom claims:

**Option A: Sử dụng Firebase CLI (nếu đã cài đặt Admin SDK)**

```bash
# Tạo file script set-claims.js
```

```javascript
// set-claims.js
const admin = require('firebase-admin');
const serviceAccount = require('./path-to-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const uid = 'USER_UID_Ở_ĐÂY'; // Thay bằng UID của user vừa tạo

admin.auth().setCustomUserClaims(uid, {
  roles: ['Administrator'],
  name: 'System Administrator'
}).then(() => {
  console.log('Custom claims set successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('Error setting custom claims:', error);
  process.exit(1);
});
```

```bash
node set-claims.js
```

**Option B: Sử dụng Backend API (nếu đã có backend)**

```bash
# Gọi API set custom claims
curl -X POST http://localhost:5000/api/users/USER_UID/set-custom-claims \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "roles": ["Administrator"],
    "name": "System Administrator"
  }'
```

**Option C: Sử dụng Firebase Functions (nếu có)**

```javascript
// functions/setAdmin.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.setAdmin = functions.https.onCall(async (data, context) => {
  // Verify admin token
  if (!context.auth || !context.auth.token.roles?.includes('Administrator')) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can set admin');
  }

  const { uid, roles } = data;
  await admin.auth().setCustomUserClaims(uid, { roles });
  return { success: true };
});
```

### Bước 3: Tạo user trong Local DB

Nếu backend chưa tự động tạo, cần tạo user trong database:

```bash
# Gọi API tạo user trong DB
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "firebaseUid": "USER_UID_Ở_ĐÂY",
    "name": "System Administrator",
    "email": "admin@quanlyfiles.com",
    "roles": ["Administrator"]
  }'
```

### Bước 4: Đăng nhập và kiểm tra

1. Mở ứng dụng: https://quanlyfiles.web.app
2. Đăng nhập với email và password vừa tạo
3. Kiểm tra xem có quyền Administrator không:
   - Vào trang **Quản lý người dùng** (sẽ hiển thị nếu có quyền)
   - Kiểm tra trong console: `localStorage.getItem('user_session')` sẽ có `roles: ["Administrator"]`

---

## Phương pháp 2: Tạo qua Backend API (Script)

### Bước 1: Tạo file script

Tạo file `create-admin.js`:

```javascript
const admin = require('firebase-admin');
const axios = require('axios');
const serviceAccount = require('./path-to-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const adminData = {
  email: 'admin@quanlyfiles.com',
  password: 'Admin@123456', // Thay đổi password này
  name: 'System Administrator',
  roles: ['Administrator']
};

async function createAdmin() {
  try {
    // 1. Tạo user trên Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: adminData.email,
      password: adminData.password,
      displayName: adminData.name,
      emailVerified: true // Có thể set true nếu muốn
    });

    console.log('✅ User created on Firebase:', userRecord.uid);

    // 2. Set custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      roles: adminData.roles,
      name: adminData.name
    });

    console.log('✅ Custom claims set successfully');

    // 3. Tạo user trong local DB (nếu có API)
    try {
      const response = await axios.post('http://localhost:5000/api/users', {
        firebaseUid: userRecord.uid,
        name: adminData.name,
        email: adminData.email,
        roles: adminData.roles
      });
      console.log('✅ User created in local DB:', response.data);
    } catch (error) {
      console.warn('⚠️ Could not create user in local DB:', error.message);
      console.log('   You can create it manually via API later');
    }

    console.log('\n🎉 Admin user created successfully!');
    console.log('Email:', adminData.email);
    console.log('Password:', adminData.password);
    console.log('UID:', userRecord.uid);
    console.log('\n⚠️  Please change the password after first login!');

  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();
```

### Bước 2: Cài đặt dependencies

```bash
npm install firebase-admin axios
```

### Bước 3: Lấy Service Account Key

1. Vào Firebase Console → Project Settings → Service Accounts
2. Click **Generate new private key**
3. Lưu file JSON vào project (ví dụ: `service-account-key.json`)
4. ⚠️ **Lưu ý**: Không commit file này lên Git!

### Bước 4: Chạy script

```bash
node create-admin.js
```

### Bước 5: Đăng nhập và đổi mật khẩu

1. Đăng nhập với email và password từ script
2. Đổi mật khẩu ngay lập tức

---

## Phương pháp 3: Tạo qua Frontend UI (nếu đã có admin)

### Bước 1: Đăng nhập với tài khoản admin hiện có

1. Truy cập: https://quanlyfiles.web.app
2. Đăng nhập với tài khoản admin

### Bước 2: Vào trang Quản lý người dùng

1. Click vào menu **Quản lý người dùng** (chỉ hiện khi có quyền Administrator)
2. Hoặc truy cập trực tiếp: https://quanlyfiles.web.app/users

### Bước 3: Tạo user mới

1. Điền thông tin:
   - **Họ tên**: Tên của administrator
   - **Email**: Email của administrator
   - **Mật khẩu**: Mật khẩu mạnh (tối thiểu 6 ký tự)
   - **Quyền mặc định**: Chọn **Administrator**

2. Click **Thêm người dùng**

3. Sau khi tạo thành công:
   - Backend sẽ tự động tạo user trên Firebase
   - Backend sẽ set custom claims với role Administrator
   - User sẽ xuất hiện trong danh sách

### Bước 4: Kiểm tra

1. Đăng xuất
2. Đăng nhập với tài khoản admin mới tạo
3. Kiểm tra xem có thể truy cập trang Quản lý người dùng không

---

## Kiểm tra User có quyền Administrator

### Cách 1: Kiểm tra trong Browser Console

1. Mở Developer Tools (F12)
2. Vào tab **Application** → **Local Storage**
3. Tìm key `user_session`
4. Xem giá trị JSON, kiểm tra `roles` có chứa `"Administrator"` không

### Cách 2: Kiểm tra trong Firebase Console

1. Vào Firebase Console → Authentication → Users
2. Click vào user
3. Xem **Custom claims** (nếu có) hoặc kiểm tra qua Admin SDK

### Cách 3: Kiểm tra trong ứng dụng

1. Đăng nhập
2. Nếu thấy menu **Quản lý người dùng** → Có quyền Administrator
3. Nếu không thấy → Chưa có quyền

---

## Troubleshooting

### Vấn đề: Đăng nhập nhưng không có quyền Administrator

**Nguyên nhân**: Custom claims chưa được set hoặc token chưa được refresh

**Giải pháp**:
1. Đăng xuất và đăng nhập lại
2. Hoặc refresh token:
   ```javascript
   // Trong browser console
   firebase.auth().currentUser.getIdToken(true);
   ```
3. Kiểm tra lại custom claims trong Firebase Console

### Vấn đề: Không thể set custom claims

**Nguyên nhân**: Không có quyền Admin SDK hoặc Service Account không đúng

**Giải pháp**:
1. Kiểm tra Service Account Key có đúng không
2. Kiểm tra quyền của Service Account trong Firebase Console
3. Thử set qua Backend API thay vì trực tiếp

### Vấn đề: User không tồn tại trong Local DB

**Nguyên nhân**: Backend chưa tự động tạo user trong DB

**Giải pháp**:
1. Tạo user trong DB thủ công qua API
2. Hoặc user sẽ được tự động tạo khi đăng nhập lần đầu (nếu backend có logic này)

---

## Lưu ý quan trọng

1. ⚠️ **Bảo mật Service Account Key**: Không commit file `service-account-key.json` lên Git
2. ⚠️ **Đổi mật khẩu mặc định**: Luôn đổi mật khẩu sau lần đầu tạo
3. ⚠️ **Token caching**: Sau khi set custom claims, user cần refresh token hoặc đăng nhập lại
4. ✅ **Best practice**: Tạo ít nhất 2 admin accounts để tránh lock out
5. ✅ **Backup**: Lưu lại UID và email của admin accounts

---

## Quick Reference

### Firebase CLI Commands (nếu có)

```bash
# Set custom claims qua Firebase CLI
firebase functions:shell
# Sau đó trong shell:
admin.auth().setCustomUserClaims('USER_UID', { roles: ['Administrator'] })
```

### API Endpoints

```bash
# Tạo user
POST /api/users
Body: { name, email, password, roles }

# Set custom claims
POST /api/users/:firebaseUid/set-custom-claims
Body: { roles: ['Administrator'] }

# Cập nhật roles
PUT /api/users/:userId/roles
Body: { roles: ['Administrator'] }
```

---

## Next Steps

Sau khi tạo admin thành công:
1. ✅ Đăng nhập và kiểm tra quyền
2. ✅ Tạo thêm các user khác nếu cần
3. ✅ Cấu hình các quyền chi tiết hơn (nếu có)
4. ✅ Thiết lập backup và recovery procedures

