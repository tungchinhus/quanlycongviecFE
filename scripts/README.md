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

