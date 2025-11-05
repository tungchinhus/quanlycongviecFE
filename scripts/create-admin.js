/**
 * Script tạo user Administrator cho hệ thống
 * 
 * Cách sử dụng:
 * 1. Cài đặt dependencies: npm install firebase-admin axios
 * 2. Lấy Service Account Key từ Firebase Console
 * 3. Cập nhật thông tin trong script
 * 4. Chạy: node scripts/create-admin.js
 */

const admin = require('firebase-admin');
const axios = require('axios');
const path = require('path');

// ============================================
// CẤU HÌNH - Cập nhật các thông tin sau:
// ============================================

const CONFIG = {
  // Đường dẫn đến Service Account Key JSON
  // Lấy từ: Firebase Console → Project Settings → Service Accounts → Generate new private key
  serviceAccountPath: './service-account-key.json',
  
  // Thông tin admin user
  admin: {
    email: 'chinhdvt@gmail.com',
    password: 'Ab!123456', // ⚠️ Đổi mật khẩu này sau khi tạo!
    name: 'System Administrator',
    roles: ['Administrator']
  },
  
  // API Backend URL (nếu có)
  apiUrl: 'http://localhost:5000/api',
  
  // Có tạo user trong local DB không?
  createInLocalDB: true
};

// ============================================
// KHÔNG CẦN SỬA PHẦN DƯỚI
// ============================================

async function createAdmin() {
  try {
    console.log('🚀 Bắt đầu tạo user Administrator...\n');

    // 1. Khởi tạo Firebase Admin
    const serviceAccount = require(path.resolve(CONFIG.serviceAccountPath));
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }

    console.log('✅ Firebase Admin đã được khởi tạo\n');

    // 2. Kiểm tra user đã tồn tại chưa
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(CONFIG.admin.email);
      console.log('⚠️  User đã tồn tại với email:', CONFIG.admin.email);
      console.log('   UID:', userRecord.uid);
      console.log('   Đang cập nhật custom claims...\n');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // 3. Tạo user mới trên Firebase Authentication
        console.log('📝 Đang tạo user mới trên Firebase Authentication...');
        userRecord = await admin.auth().createUser({
          email: CONFIG.admin.email,
          password: CONFIG.admin.password,
          displayName: CONFIG.admin.name,
          emailVerified: false // User sẽ cần verify email
        });
        console.log('✅ User đã được tạo trên Firebase');
        console.log('   UID:', userRecord.uid);
        console.log('   Email:', userRecord.email);
        console.log('');
      } else {
        throw error;
      }
    }

    // 4. Set custom claims
    console.log('🔐 Đang set custom claims...');
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      roles: CONFIG.admin.roles,
      name: CONFIG.admin.name
    });
    console.log('✅ Custom claims đã được set');
    console.log('   Roles:', CONFIG.admin.roles);
    console.log('');

    // 5. Tạo user trong local DB (nếu có API)
    if (CONFIG.createInLocalDB && CONFIG.apiUrl) {
      try {
        console.log('💾 Đang tạo user trong local DB...');
        const response = await axios.post(`${CONFIG.apiUrl}/users`, {
          firebaseUid: userRecord.uid,
          name: CONFIG.admin.name,
          email: CONFIG.admin.email,
          roles: CONFIG.admin.roles
        }, {
          timeout: 5000,
          validateStatus: (status) => status < 500 // Không throw error cho 404, 400, etc.
        });
        console.log('✅ User đã được tạo trong local DB');
        console.log('   ID:', response.data.id);
        console.log('');
      } catch (error) {
        if (error.response) {
          // User đã tồn tại trong DB
          if (error.response.status === 409 || error.response.status === 400) {
            console.log('⚠️  User đã tồn tại trong local DB hoặc có lỗi validation');
            console.log('   Response:', error.response.data);
            console.log('');
          } else {
            console.log('⚠️  Không thể tạo user trong local DB:', error.response.status, error.response.data);
            console.log('   Bạn có thể tạo thủ công sau\n');
          }
        } else if (error.code === 'ECONNREFUSED') {
          console.log('⚠️  Không thể kết nối đến API backend');
          console.log('   URL:', CONFIG.apiUrl);
          console.log('   User sẽ được tạo tự động khi đăng nhập lần đầu\n');
        } else {
          console.log('⚠️  Lỗi khi tạo user trong local DB:', error.message);
          console.log('   User sẽ được tạo tự động khi đăng nhập lần đầu\n');
        }
      }
    }

    // 6. Tóm tắt
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 TẠO ADMIN THÀNH CÔNG!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📧 Email:', CONFIG.admin.email);
    console.log('🔑 Password:', CONFIG.admin.password);
    console.log('🆔 UID:', userRecord.uid);
    console.log('👤 Name:', CONFIG.admin.name);
    console.log('🎭 Roles:', CONFIG.admin.roles.join(', '));
    console.log('\n⚠️  QUAN TRỌNG:');
    console.log('   1. Đổi mật khẩu ngay sau lần đăng nhập đầu tiên!');
    console.log('   2. Lưu lại thông tin này ở nơi an toàn');
    console.log('   3. User cần đăng nhập lại để nhận custom claims mới\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ LỖI KHI TẠO ADMIN:');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (error.code) {
      console.error('Error Code:', error.code);
    }
    if (error.message) {
      console.error('Error Message:', error.message);
    }
    if (error.stack) {
      console.error('\nStack Trace:');
      console.error(error.stack);
    }
    
    console.error('\n💡 Kiểm tra:');
    console.error('   - Service Account Key có đúng không?');
    console.error('   - Email có định dạng hợp lệ không?');
    console.error('   - Password có đủ mạnh không? (tối thiểu 6 ký tự)');
    console.error('   - Firebase project có đúng không?\n');

    process.exit(1);
  }
}

// Chạy script
if (require.main === module) {
  createAdmin();
}

module.exports = { createAdmin, CONFIG };

