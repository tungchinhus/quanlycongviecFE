/**
 * Script set role cho user cụ thể trong Firebase
 * 
 * Chức năng:
 * - Set roles cho user bằng email
 * - Set custom claims trên Firebase
 * - Hiển thị thông tin user và roles
 * 
 * Cách sử dụng:
 * 1. Cài đặt: npm install firebase-admin
 * 2. Lấy Service Account Key từ Firebase Console
 * 3. Chạy: node scripts/set-user-role.js <email> <roles>
 * 
 * Commands:
 *   <email> <roles>  - Set roles cho user
 *                      roles có thể là một role hoặc nhiều roles phân cách bằng dấu phẩy
 * 
 * Examples:
 *   # Set một role
 *   node scripts/set-user-role.js user@example.com Administrator
 * 
 *   # Set nhiều roles
 *   node scripts/set-user-role.js user@example.com "Administrator,Manager"
 * 
 *   # Set role User
 *   node scripts/set-user-role.js user@example.com User
 * 
 * Available Roles:
 *   - Administrator (hoặc Admin)
 *   - Manager
 *   - User
 *   - Guest
 */

const admin = require('firebase-admin');
const path = require('path');

// ============================================
// CẤU HÌNH
// ============================================
const CONFIG = {
  serviceAccountPath: './service-account-key.json'
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
// VALIDATE ROLES
// ============================================
const VALID_ROLES = ['Administrator', 'Admin', 'Manager', 'User', 'Guest'];

function validateRoles(roles) {
  const invalidRoles = roles.filter(role => !VALID_ROLES.includes(role));
  
  if (invalidRoles.length > 0) {
    return {
      valid: false,
      message: `Invalid roles: ${invalidRoles.join(', ')}. Valid roles are: ${VALID_ROLES.join(', ')}`
    };
  }
  
  return { valid: true };
}

// ============================================
// NORMALIZE ROLES
// ============================================
function normalizeRoles(roles) {
  return roles.map(role => {
    // Map "Admin" -> "Administrator" để đảm bảo consistency
    if (role === 'Admin' || role === 'admin') {
      return 'Administrator';
    }
    // Capitalize first letter
    return role.charAt(0).toUpperCase() + role.slice(1);
  });
}

// ============================================
// SET USER ROLES
// ============================================
async function setUserRole(email, rolesString) {
  try {
    console.log(`🔐 Đang set roles cho user: ${email}...\n`);
    
    // 1. Parse roles
    const rolesArray = rolesString
      .split(',')
      .map(r => r.trim())
      .filter(r => r.length > 0);
    
    if (rolesArray.length === 0) {
      console.error('❌ Không có roles nào được cung cấp\n');
      process.exit(1);
    }
    
    // 2. Normalize roles
    const normalizedRoles = normalizeRoles(rolesArray);
    
    // 3. Validate roles
    const validation = validateRoles(normalizedRoles);
    if (!validation.valid) {
      console.error(`❌ ${validation.message}\n`);
      process.exit(1);
    }
    
    // 4. Kiểm tra user có tồn tại không
    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.error('❌ User không tồn tại trong Firebase');
        console.error(`   Email: ${email}\n`);
        console.log('💡 Tạo user mới:');
        console.log(`   node scripts/manage-firebase-users.js create ${email} <password> <name> "${rolesArray.join(',')}"\n`);
        process.exit(1);
      }
      throw error;
    }
    
    console.log('✅ User tồn tại');
    console.log(`   UID: ${user.uid}`);
    console.log(`   Name: ${user.displayName || 'N/A'}`);
    
    // 5. Lấy custom claims hiện tại
    const currentClaims = user.customClaims || {};
    const currentRoles = currentClaims.roles || [];
    
    console.log(`\n📋 Roles hiện tại: ${Array.isArray(currentRoles) ? currentRoles.join(', ') : currentRoles || 'N/A'}`);
    console.log(`📝 Roles mới: ${normalizedRoles.join(', ')}\n`);
    
    // 6. Set custom claims
    console.log('🔐 Đang set custom claims...');
    await admin.auth().setCustomUserClaims(user.uid, {
      roles: normalizedRoles,
      name: user.displayName || user.email.split('@')[0]
    });
    
    console.log('✅ Custom claims đã được set thành công\n');
    
    // 7. Verify lại để hiển thị thông tin
    const updatedUser = await admin.auth().getUser(user.uid);
    const updatedClaims = updatedUser.customClaims || {};
    const updatedRoles = updatedClaims.roles || [];
    
    // 8. Hiển thị kết quả
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 SET ROLES THÀNH CÔNG!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📋 Thông tin User:');
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   UID: ${updatedUser.uid}`);
    console.log(`   Name: ${updatedUser.displayName || 'N/A'}`);
    console.log(`   Roles: ${Array.isArray(updatedRoles) ? updatedRoles.join(', ') : updatedRoles || 'N/A'}`);
    console.log(`   Email Verified: ${updatedUser.emailVerified ? 'Yes' : 'No'}`);
    
    console.log('\n⚠️  QUAN TRỌNG:');
    console.log('   1. User cần đăng xuất và đăng nhập lại để nhận roles mới');
    console.log('   2. Hoặc user cần refresh token để nhận custom claims mới');
    console.log('   3. Roles sẽ có hiệu lực ngay sau khi user refresh token\n');
    
    return { email, uid: updatedUser.uid, roles: updatedRoles };
    
  } catch (error) {
    console.error('\n❌ LỖI KHI SET ROLES:');
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
    console.error('   - Email có đúng không?');
    console.error('   - User có tồn tại trong Firebase không?');
    console.error('   - Service Account Key có đúng không?');
    console.error('   - Roles có hợp lệ không?\n');
    
    throw error;
  }
}

// ============================================
// MAIN
// ============================================
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('📖 Firebase Set User Role Script\n');
    console.log('Usage:');
    console.log('  node scripts/set-user-role.js <email> <roles>');
    console.log('\nExamples:');
    console.log('  # Set một role:');
    console.log('  node scripts/set-user-role.js user@example.com Administrator');
    console.log('\n  # Set nhiều roles:');
    console.log('  node scripts/set-user-role.js user@example.com "Administrator,Manager"');
    console.log('\n  # Set role User:');
    console.log('  node scripts/set-user-role.js user@example.com User');
    console.log('\nAvailable Roles:');
    console.log('  - Administrator (hoặc Admin)');
    console.log('  - Manager');
    console.log('  - User');
    console.log('  - Guest');
    console.log('\n💡 Lưu ý:');
    console.log('  - User cần đăng xuất và đăng nhập lại để nhận roles mới');
    console.log('  - "Admin" sẽ được tự động chuyển thành "Administrator"');
    process.exit(1);
  }
  
  const email = args[0];
  const rolesString = args[1];
  
  if (!email || !email.includes('@')) {
    console.error('❌ Email không hợp lệ:', email);
    process.exit(1);
  }
  
  if (!initFirebase()) {
    process.exit(1);
  }
  
  try {
    await setUserRole(email, rolesString);
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

// Chạy script
if (require.main === module) {
  main();
}

module.exports = { setUserRole, normalizeRoles, validateRoles };

