/**
 * Script kiểm tra user trong Firebase Authentication
 * 
 * Chức năng:
 * - Kiểm tra user có tồn tại trong Firebase không
 * - Kiểm tra thông tin user (custom claims, roles, email verified)
 * - Kiểm tra user có trong backend DB không
 * - So sánh thông tin giữa Firebase và Backend DB
 * 
 * Cách sử dụng:
 * 1. Cài đặt: npm install firebase-admin axios
 * 2. Lấy Service Account Key từ Firebase Console
 * 3. Chạy: node scripts/check-firebase-user.js <email>
 * 
 * Example:
 *   node scripts/check-firebase-user.js user@example.com
 */

const admin = require('firebase-admin');
const axios = require('axios');
const path = require('path');

// ============================================
// CẤU HÌNH
// ============================================
const CONFIG = {
  serviceAccountPath: './service-account-key.json',
  apiUrl: 'http://localhost:5000/api' // Backend API URL
};

// ============================================
// KHỞI TẠO FIREBASE ADMIN
// ============================================
function initFirebase() {
  try {
    const serviceAccount = require(path.resolve(CONFIG.serviceAccountPath));
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    
    console.log('✅ Firebase Admin initialized\n');
    return true;
  } catch (error) {
    console.error('❌ Error initializing Firebase:', error.message);
    console.error('💡 Đảm bảo file service-account-key.json tồn tại và hợp lệ\n');
    return false;
  }
}

// ============================================
// KIỂM TRA USER
// ============================================

/**
 * Kiểm tra user trong Firebase
 */
async function checkFirebaseUser(email) {
  try {
    console.log(`🔍 Đang kiểm tra user trong Firebase: ${email}...\n`);
    
    const user = await admin.auth().getUserByEmail(email);
    const customClaims = user.customClaims || {};
    const roles = customClaims.roles || [];
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 THÔNG TIN FIREBASE USER');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('✅ User tồn tại trong Firebase\n');
    console.log('📧 Email:', user.email);
    console.log('🆔 UID:', user.uid);
    console.log('👤 Display Name:', user.displayName || 'N/A');
    console.log('✅ Email Verified:', user.emailVerified ? 'Yes' : 'No');
    console.log('📅 Created:', user.metadata.creationTime);
    console.log('🔐 Last Sign In:', user.metadata.lastSignInTime || 'Never');
    console.log('🚫 Disabled:', user.disabled ? 'Yes' : 'No');
    
    console.log('\n🎭 Custom Claims:');
    if (Object.keys(customClaims).length > 0) {
      console.log('   Roles:', Array.isArray(roles) ? roles.join(', ') : roles || 'N/A');
      if (customClaims.name) {
        console.log('   Name:', customClaims.name);
      }
      console.log('   Full Claims:', JSON.stringify(customClaims, null, 2));
    } else {
      console.log('   ⚠️  Không có custom claims được set');
      console.log('   💡 Cần set custom claims để user có roles');
    }
    
    console.log('\n🔑 Provider Data:');
    user.providerData.forEach((provider, index) => {
      console.log(`   ${index + 1}. Provider: ${provider.providerId}`);
      console.log(`      UID: ${provider.uid}`);
    });
    
    return user;
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('❌ USER KHÔNG TỒN TẠI TRONG FIREBASE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log(`📧 Email: ${email}`);
      console.log('\n💡 Nguyên nhân có thể:');
      console.log('   1. User chưa được tạo trên Firebase Authentication');
      console.log('   2. Email không đúng');
      console.log('   3. User đã bị xóa');
      console.log('\n🔧 Giải pháp:');
      console.log('   - Tạo user mới: node scripts/manage-firebase-users.js create <email> <password> <name> <roles>');
      console.log('   - Hoặc: node scripts/create-admin.js (nếu là admin)');
      return null;
    } else {
      console.error('❌ Error checking Firebase user:', error.message);
      throw error;
    }
  }
}

/**
 * Kiểm tra user trong Backend DB
 */
async function checkBackendUser(firebaseUid, email) {
  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 KIỂM TRA BACKEND DB');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log(`🔍 Đang kiểm tra user trong Backend DB...`);
    console.log(`   API URL: ${CONFIG.apiUrl}`);
    console.log(`   Firebase UID: ${firebaseUid}\n`);
    
    const response = await axios.get(`${CONFIG.apiUrl}/users/by-firebase-uid/${firebaseUid}`, {
      timeout: 5000,
      validateStatus: (status) => status < 500
    });
    
    if (response.status === 200) {
      const user = response.data;
      console.log('✅ User tồn tại trong Backend DB\n');
      console.log('📋 Thông tin Backend:');
      console.log('   ID:', user.userId || user.id || 'N/A');
      console.log('   UserName:', user.userName || 'N/A');
      console.log('   Full Name:', user.fullName || user.name || 'N/A');
      console.log('   Email:', user.email || 'N/A');
      console.log('   Firebase UID:', user.firebaseUID || user.firebaseUid || 'N/A');
      console.log('   Roles:', Array.isArray(user.roles) ? user.roles.join(', ') : user.roles || 'N/A');
      console.log('   Is Active:', user.isActive !== undefined ? user.isActive : 'N/A');
      console.log('   Created At:', user.createdAt || 'N/A');
      
      return user;
    } else if (response.status === 404) {
      console.log('⚠️  User không tồn tại trong Backend DB');
      console.log('\n💡 User sẽ được tạo tự động khi đăng nhập lần đầu');
      console.log('   Hoặc có thể tạo thủ công qua API');
      return null;
    } else {
      console.log(`⚠️  Lỗi khi kiểm tra Backend DB: ${response.status}`);
      console.log('   Response:', response.data);
      return null;
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('⚠️  Không thể kết nối đến Backend API');
      console.log(`   URL: ${CONFIG.apiUrl}`);
      console.log('   💡 Đảm bảo backend đang chạy');
      return null;
    } else if (error.response && error.response.status === 404) {
      console.log('⚠️  User không tồn tại trong Backend DB');
      console.log('\n💡 User sẽ được tạo tự động khi đăng nhập lần đầu');
      return null;
    } else {
      console.log('⚠️  Lỗi khi kiểm tra Backend DB:', error.message);
      return null;
    }
  }
}

/**
 * So sánh thông tin giữa Firebase và Backend
 */
function compareUserInfo(firebaseUser, backendUser) {
  if (!backendUser) {
    return;
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 SO SÁNH THÔNG TIN');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const firebaseRoles = Array.isArray(firebaseUser.customClaims?.roles) 
    ? firebaseUser.customClaims.roles 
    : firebaseUser.customClaims?.roles ? [firebaseUser.customClaims.roles] : [];
  const backendRoles = Array.isArray(backendUser.roles) ? backendUser.roles : [];
  
  // So sánh email
  if (firebaseUser.email !== backendUser.email) {
    console.log('⚠️  Email không khớp:');
    console.log(`   Firebase: ${firebaseUser.email}`);
    console.log(`   Backend: ${backendUser.email || 'N/A'}`);
  } else {
    console.log('✅ Email khớp:', firebaseUser.email);
  }
  
  // So sánh name
  const firebaseName = firebaseUser.displayName || firebaseUser.customClaims?.name || '';
  const backendName = backendUser.fullName || backendUser.name || '';
  if (firebaseName !== backendName) {
    console.log('⚠️  Name không khớp:');
    console.log(`   Firebase: ${firebaseName || 'N/A'}`);
    console.log(`   Backend: ${backendName || 'N/A'}`);
  } else {
    console.log('✅ Name khớp:', firebaseName || backendName || 'N/A');
  }
  
  // So sánh roles
  const rolesMatch = JSON.stringify(firebaseRoles.sort()) === JSON.stringify(backendRoles.sort());
  if (!rolesMatch) {
    console.log('⚠️  Roles không khớp:');
    console.log(`   Firebase: [${firebaseRoles.join(', ')}]`);
    console.log(`   Backend: [${backendRoles.join(', ')}]`);
    console.log('\n💡 Lưu ý: Roles trong Firebase Custom Claims là source of truth');
    console.log('   Cần đồng bộ roles từ Firebase xuống Backend');
  } else {
    console.log('✅ Roles khớp:', firebaseRoles.length > 0 ? firebaseRoles.join(', ') : 'N/A');
  }
  
  // Kiểm tra Firebase UID
  const backendFirebaseUid = backendUser.firebaseUID || backendUser.firebaseUid;
  if (backendFirebaseUid && backendFirebaseUid !== firebaseUser.uid) {
    console.log('⚠️  Firebase UID không khớp:');
    console.log(`   Firebase: ${firebaseUser.uid}`);
    console.log(`   Backend: ${backendFirebaseUid}`);
  } else {
    console.log('✅ Firebase UID khớp:', firebaseUser.uid);
  }
}

/**
 * Tóm tắt và đưa ra khuyến nghị
 */
function showRecommendations(firebaseUser, backendUser) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💡 KHUYẾN NGHỊ');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (!firebaseUser) {
    console.log('❌ User không tồn tại trong Firebase - cần tạo user trước');
    return;
  }
  
  // Kiểm tra email verified
  if (!firebaseUser.emailVerified) {
    console.log('⚠️  Email chưa được verify');
    console.log('   💡 User có thể cần verify email để đăng nhập');
  }
  
  // Kiểm tra disabled
  if (firebaseUser.disabled) {
    console.log('❌ User đã bị disabled');
    console.log('   💡 Cần enable user để có thể đăng nhập');
  }
  
  // Kiểm tra custom claims
  if (!firebaseUser.customClaims || !firebaseUser.customClaims.roles) {
    console.log('⚠️  User không có custom claims (roles)');
    console.log('   💡 Cần set custom claims:');
    console.log(`      node scripts/manage-firebase-users.js set-roles ${firebaseUser.email} "Administrator"`);
  }
  
  // Kiểm tra last sign in
  if (!firebaseUser.metadata.lastSignInTime) {
    console.log('⚠️  User chưa từng đăng nhập');
    console.log('   💡 Đây có thể là user mới tạo');
  }
  
  // Kiểm tra backend sync
  if (!backendUser) {
    console.log('⚠️  User chưa có trong Backend DB');
    console.log('   💡 User sẽ được tạo tự động khi đăng nhập lần đầu');
    console.log('   💡 Hoặc có thể tạo thủ công qua API');
  }
  
  console.log('\n✅ Nếu tất cả đều OK, user có thể đăng nhập');
  console.log('   Nếu vẫn lỗi, kiểm tra:');
  console.log('   1. Mật khẩu có đúng không');
  console.log('   2. User có bị disabled không');
  console.log('   3. Firebase project có đúng không');
}

/**
 * Main function
 */
async function checkUser(email) {
  if (!email) {
    console.error('❌ Thiếu email');
    console.error('Usage: node scripts/check-firebase-user.js <email>');
    console.error('Example: node scripts/check-firebase-user.js user@example.com');
    process.exit(1);
  }
  
  if (!initFirebase()) {
    process.exit(1);
  }
  
  try {
    // 1. Kiểm tra Firebase
    const firebaseUser = await checkFirebaseUser(email);
    
    if (!firebaseUser) {
      process.exit(1);
    }
    
    // 2. Kiểm tra Backend DB
    const backendUser = await checkBackendUser(firebaseUser.uid, email);
    
    // 3. So sánh thông tin
    if (backendUser) {
      compareUserInfo(firebaseUser, backendUser);
    }
    
    // 4. Đưa ra khuyến nghị
    showRecommendations(firebaseUser, backendUser);
    
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack Trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// ============================================
// RUN
// ============================================
const args = process.argv.slice(2);
const email = args[0];

checkUser(email);

