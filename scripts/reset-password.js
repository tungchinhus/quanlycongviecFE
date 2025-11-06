/**
 * Script reset mật khẩu cho user trong Firebase Authentication
 * 
 * Chức năng:
 * - Reset mật khẩu cho user bằng email
 * - Tạo mật khẩu mới (random hoặc tự định nghĩa)
 * - Gửi email reset password (nếu cần)
 * - Hiển thị thông tin đăng nhập mới
 * 
 * Cách sử dụng:
 * 1. Cài đặt: npm install firebase-admin
 * 2. Lấy Service Account Key từ Firebase Console
 * 3. Chạy: node scripts/reset-password.js <email> [newPassword]
 * 
 * Commands:
 *   <email> [newPassword]  - Reset mật khẩu cho user
 *                            Nếu không có newPassword, sẽ tạo mật khẩu random
 * 
 * Examples:
 *   node scripts/reset-password.js user@example.com
 *   node scripts/reset-password.js user@example.com "NewPass123!"
 *   node scripts/reset-password.js user@example.com --send-email
 */

const admin = require('firebase-admin');
const path = require('path');
const crypto = require('crypto');

// ============================================
// CẤU HÌNH
// ============================================
const CONFIG = {
  serviceAccountPath: './service-account-key.json',
  // Độ dài mật khẩu random mặc định
  defaultPasswordLength: 12,
  // Gửi email reset password link
  sendPasswordResetEmail: false
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
// VALIDATE PASSWORD
// ============================================
function validatePassword(password) {
  if (!password || password.length < 6) {
    return {
      valid: false,
      message: 'Mật khẩu phải có ít nhất 6 ký tự'
    };
  }
  
  // Kiểm tra độ mạnh (khuyến nghị)
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const strength = [hasUpperCase, hasLowerCase, hasNumber, hasSpecialChar].filter(Boolean).length;
  
  if (strength < 2) {
    return {
      valid: true,
      warning: '⚠️  Mật khẩu yếu. Khuyến nghị: có chữ hoa, chữ thường, số và ký tự đặc biệt'
    };
  }
  
  return { valid: true };
}

// ============================================
// GENERATE RANDOM PASSWORD
// ============================================
function generateRandomPassword(length = CONFIG.defaultPasswordLength) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()';
  const all = uppercase + lowercase + numbers + special;
  
  let password = '';
  
  // Đảm bảo có ít nhất 1 ký tự từ mỗi loại
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Điền phần còn lại
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  
  // Shuffle để tránh pattern
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// ============================================
// RESET PASSWORD
// ============================================

/**
 * Reset mật khẩu cho user
 */
async function resetPassword(email, newPassword = null, sendEmail = false) {
  try {
    console.log(`🔐 Đang reset mật khẩu cho: ${email}...\n`);
    
    // 1. Kiểm tra user có tồn tại không
    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.error('❌ User không tồn tại trong Firebase');
        console.error(`   Email: ${email}\n`);
        console.log('💡 Kiểm tra lại email hoặc tạo user mới:');
        console.log(`   node scripts/manage-firebase-users.js create ${email} <password> <name> <roles>\n`);
        process.exit(1);
      }
      throw error;
    }
    
    console.log('✅ User tồn tại');
    console.log(`   UID: ${user.uid}`);
    console.log(`   Name: ${user.displayName || 'N/A'}\n`);
    
    // 2. Tạo mật khẩu mới nếu chưa có
    let password = newPassword;
    if (!password) {
      password = generateRandomPassword();
      console.log('🔑 Đã tạo mật khẩu random mới\n');
    } else {
      // Validate mật khẩu
      const validation = validatePassword(password);
      if (!validation.valid) {
        console.error(`❌ ${validation.message}\n`);
        process.exit(1);
      }
      if (validation.warning) {
        console.log(`${validation.warning}\n`);
      }
    }
    
    // 3. Gửi email reset password link (nếu được yêu cầu)
    if (sendEmail) {
      try {
        console.log('📧 Đang gửi email reset password link...');
        const link = await admin.auth().generatePasswordResetLink(email);
        console.log('✅ Email reset link đã được tạo');
        console.log(`   Link: ${link}\n`);
        console.log('💡 Gửi link này cho user để họ tự reset mật khẩu\n');
        return { email, link, method: 'email' };
      } catch (error) {
        console.error('⚠️  Không thể gửi email:', error.message);
        console.log('   Tiếp tục với phương pháp set password trực tiếp...\n');
      }
    }
    
    // 4. Set mật khẩu mới trực tiếp
    console.log('🔐 Đang set mật khẩu mới...');
    await admin.auth().updateUser(user.uid, {
      password: password
    });
    console.log('✅ Mật khẩu đã được reset thành công\n');
    
    // 5. Hiển thị thông tin
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 RESET MẬT KHẨU THÀNH CÔNG!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📋 Thông tin đăng nhập mới:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   UID: ${user.uid}`);
    console.log(`   Name: ${user.displayName || 'N/A'}`);
    
    const customClaims = user.customClaims || {};
    const roles = customClaims.roles || [];
    if (roles.length > 0) {
      console.log(`   Roles: ${Array.isArray(roles) ? roles.join(', ') : roles}`);
    }
    
    console.log('\n⚠️  QUAN TRỌNG:');
    console.log('   1. Lưu lại mật khẩu mới ở nơi an toàn');
    console.log('   2. Thông báo cho user về mật khẩu mới');
    console.log('   3. Khuyến nghị user đổi mật khẩu sau lần đăng nhập đầu tiên');
    console.log('   4. Xóa mật khẩu này khỏi console/log sau khi đã thông báo\n');
    
    return { email, password, uid: user.uid, method: 'direct' };
    
  } catch (error) {
    console.error('\n❌ LỖI KHI RESET MẬT KHẨU:');
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
    console.error('   - Firebase project có đúng không?\n');
    
    throw error;
  }
}

// ============================================
// MAIN
// ============================================
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📖 Firebase Password Reset Script\n');
    console.log('Usage:');
    console.log('  node scripts/reset-password.js <email> [newPassword]');
    console.log('  node scripts/reset-password.js <email> --send-email');
    console.log('\nExamples:');
    console.log('  # Reset với mật khẩu random:');
    console.log('  node scripts/reset-password.js user@example.com');
    console.log('\n  # Reset với mật khẩu tự định nghĩa:');
    console.log('  node scripts/reset-password.js user@example.com "NewPass123!"');
    console.log('\n  # Gửi email reset link:');
    console.log('  node scripts/reset-password.js user@example.com --send-email');
    console.log('\nOptions:');
    console.log('  --send-email    Gửi email reset password link thay vì set password trực tiếp');
    process.exit(1);
  }
  
  const email = args[0];
  const sendEmail = args.includes('--send-email');
  let newPassword = null;
  
  // Tìm password trong args (không phải flag)
  const passwordArg = args.find(arg => !arg.startsWith('--') && arg !== email);
  if (passwordArg && !sendEmail) {
    newPassword = passwordArg;
  }
  
  if (!email || !email.includes('@')) {
    console.error('❌ Email không hợp lệ:', email);
    process.exit(1);
  }
  
  if (!initFirebase()) {
    process.exit(1);
  }
  
  try {
    await resetPassword(email, newPassword, sendEmail);
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

// Chạy script
if (require.main === module) {
  main();
}

module.exports = { resetPassword, generateRandomPassword, validatePassword };

