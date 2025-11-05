# 🚀 Hướng dẫn nhanh tạo Admin User

## Bước 1: Lấy Service Account Key

1. **Truy cập Firebase Console**: https://console.firebase.google.com/
2. **Chọn project**: `quanlyfiles-9891e`
3. **Vào Project Settings**: Click biểu tượng ⚙️ (Settings) → **Project settings**
4. **Tab Service Accounts**: Click vào tab **Service Accounts**
5. **Generate Key**: Click nút **"Generate new private key"**
6. **Lưu file**: 
   - File sẽ tự động download (JSON format)
   - Đổi tên file thành: `service-account-key.json`
   - Copy file vào thư mục project: `d:\Project\thibidi\quanlyfiles\quanlyfileFE\`

⚠️ **QUAN TRỌNG**: Không commit file này lên Git!

## Bước 2: Chạy script

Sau khi có file `service-account-key.json` trong thư mục project, chạy:

```bash
node scripts/check-and-run-admin.js
```

Hoặc trực tiếp:

```bash
node scripts/create-admin.js
```

## Thông tin Admin sẽ được tạo

- **Email**: chinhdvt@gmail.com
- **Password**: Ab!123456
- **Name**: System Administrator
- **Roles**: Administrator

## Sau khi tạo thành công

1. ✅ Đăng nhập tại: https://quanlyfiles.web.app
2. ✅ Kiểm tra menu "Quản lý người dùng" (chỉ hiện khi có quyền Admin)
3. ⚠️ **Đổi mật khẩu ngay** sau lần đăng nhập đầu tiên!

## Troubleshooting

### Lỗi: Cannot find module 'firebase-admin'
```bash
npm install firebase-admin axios --save-dev
```

### Lỗi: Service account key not found
- Kiểm tra file `service-account-key.json` có trong thư mục project không
- Đảm bảo tên file đúng: `service-account-key.json`

### Lỗi: Permission denied
- Kiểm tra Service Account có đủ quyền trong Firebase Console
- Đảm bảo project ID đúng: `quanlyfiles-9891e`

### User đã tồn tại
- Script sẽ tự động cập nhật custom claims cho user hiện có
- Hoặc xóa user cũ trong Firebase Console và tạo lại

