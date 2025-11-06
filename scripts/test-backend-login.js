/**
 * Script test backend login endpoint với Firebase token
 * 
 * Chức năng:
 * - Test endpoint /auth/login/firebase-token
 * - Kiểm tra backend có verify được Firebase token không
 * - Debug các vấn đề về authentication
 * 
 * Cách sử dụng:
 * 1. Lấy Firebase ID token từ browser console sau khi login Firebase thành công
 * 2. Chạy: node scripts/test-backend-login.js <firebaseIdToken>
 * 
 * Example:
 *   node scripts/test-backend-login.js "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
 */

const axios = require('axios');

// ============================================
// CẤU HÌNH
// ============================================
const CONFIG = {
  apiUrl: 'http://localhost:5000/api'
};

// ============================================
// TEST BACKEND LOGIN
// ============================================
async function testBackendLogin(firebaseIdToken) {
  if (!firebaseIdToken) {
    console.error('❌ Thiếu Firebase ID Token');
    console.log('\n💡 Cách lấy Firebase ID Token:');
    console.log('   1. Mở browser và đăng nhập vào ứng dụng');
    console.log('   2. Mở DevTools (F12) → Console');
    console.log('   3. Chạy lệnh:');
    console.log('      firebase.auth().currentUser?.getIdToken().then(token => console.log(token))');
    console.log('   4. Copy token và dùng làm tham số cho script này\n');
    process.exit(1);
  }

  console.log('🚀 TEST BACKEND LOGIN ENDPOINT\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 THÔNG TIN');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log(`API URL: ${CONFIG.apiUrl}/auth/login/firebase-token`);
  console.log(`Token (first 50 chars): ${firebaseIdToken.substring(0, 50)}...`);
  console.log(`Token length: ${firebaseIdToken.length} characters\n`);

  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 ĐANG GỬI REQUEST');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const response = await axios.post(
      `${CONFIG.apiUrl}/auth/login/firebase-token`,
      {
        idToken: firebaseIdToken
      },
      {
        timeout: 10000,
        validateStatus: (status) => status < 600 // Không throw error cho bất kỳ status code nào
      }
    );

    console.log('✅ REQUEST THÀNH CÔNG!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 RESPONSE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Headers:`, JSON.stringify(response.headers, null, 2));
    console.log(`\nResponse Data:`, JSON.stringify(response.data, null, 2));

    if (response.status === 200 && response.data.token) {
      console.log('\n✅ Login thành công!');
      console.log(`JWT Token: ${response.data.token.substring(0, 50)}...`);
      if (response.data.user) {
        console.log('\n📋 User Info:');
        console.log(`   ID: ${response.data.user.userId || response.data.user.id}`);
        console.log(`   Email: ${response.data.user.email}`);
        console.log(`   Name: ${response.data.user.fullName || response.data.user.name}`);
        console.log(`   Roles: ${Array.isArray(response.data.user.roles) ? response.data.user.roles.join(', ') : response.data.user.roles || 'N/A'}`);
        console.log(`   Firebase UID: ${response.data.user.firebaseUID || response.data.user.firebaseUid}`);
      }
    }

  } catch (error) {
    console.log('❌ REQUEST THẤT BẠI!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 ERROR DETAILS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (error.response) {
      // Server responded with error status
      console.log(`Status: ${error.response.status} ${error.response.statusText}`);
      console.log(`URL: ${error.config?.url}`);
      console.log(`Method: ${error.config?.method?.toUpperCase()}`);
      
      console.log('\nResponse Headers:');
      console.log(JSON.stringify(error.response.headers, null, 2));
      
      console.log('\nResponse Data:');
      console.log(JSON.stringify(error.response.data, null, 2));

      if (error.response.status === 401) {
        console.log('\n💡 LỖI 401 UNAUTHORIZED - Có thể do:');
        console.log('   1. Firebase token không hợp lệ');
        console.log('   2. Firebase token đã hết hạn');
        console.log('   3. Backend không thể verify Firebase token');
        console.log('   4. Backend chưa được cấu hình đúng với Firebase project');
        console.log('   5. Service Account Key trong backend không đúng');
        console.log('   6. Firebase project ID không khớp giữa frontend và backend');
      } else if (error.response.status === 404) {
        console.log('\n💡 LỖI 404 NOT FOUND:');
        console.log('   Endpoint không tồn tại. Kiểm tra URL có đúng không.');
        console.log(`   Expected: ${CONFIG.apiUrl}/auth/login/firebase-token`);
      } else if (error.response.status === 500) {
        console.log('\n💡 LỖI 500 INTERNAL SERVER ERROR:');
        console.log('   Backend có lỗi khi xử lý request.');
        console.log('   Kiểm tra backend logs để xem chi tiết.');
      }
    } else if (error.request) {
      // Request was made but no response received
      console.log('❌ Không nhận được response từ server');
      console.log(`URL: ${error.config?.url}`);
      console.log(`Method: ${error.config?.method?.toUpperCase()}`);
      
      if (error.code === 'ECONNREFUSED') {
        console.log('\n💡 KHÔNG THỂ KẾT NỐI:');
        console.log('   1. Backend có đang chạy không?');
        console.log(`   2. URL có đúng không? (${CONFIG.apiUrl})`);
        console.log('   3. Port có đúng không?');
      } else if (error.code === 'ETIMEDOUT') {
        console.log('\n💡 REQUEST TIMEOUT:');
        console.log('   Backend không phản hồi trong thời gian cho phép.');
      }
    } else {
      // Error setting up request
      console.log('❌ Lỗi khi setup request:', error.message);
    }

    console.log('\n📋 Full Error:');
    console.log(error);
  }
}

// ============================================
// RUN
// ============================================
const args = process.argv.slice(2);
const firebaseIdToken = args[0];

testBackendLogin(firebaseIdToken);

