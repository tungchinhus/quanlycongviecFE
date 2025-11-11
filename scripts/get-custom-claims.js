/**
 * Script lấy Custom Claims từ Firebase Authentication
 * 
 * Chức năng:
 * - Lấy custom claims của một user cụ thể (theo email hoặc UID)
 * - Lấy custom claims của tất cả users
 * - Hiển thị thông tin chi tiết về custom claims
 * - Export custom claims ra file JSON (tùy chọn)
 * 
 * Cách sử dụng:
 * 1. Cài đặt: npm install firebase-admin
 * 2. Lấy Service Account Key từ Firebase Console
 * 3. Chạy: node scripts/get-custom-claims.js <command> [options]
 * 
 * Commands:
 *   get-by-email <email>              - Lấy custom claims theo email
 *   get-by-uid <uid>                   - Lấy custom claims theo UID
 *   get-all                            - Lấy custom claims của tất cả users
 *   get-all --export <filename>       - Lấy và export ra file JSON
 * 
 * Examples:
 *   node scripts/get-custom-claims.js get-by-email user@example.com
 *   node scripts/get-custom-claims.js get-by-uid abc123xyz
 *   node scripts/get-custom-claims.js get-all
 *   node scripts/get-custom-claims.js get-all --export claims-backup.json
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

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
// FUNCTIONS
// ============================================

/**
 * Lấy custom claims theo email
 */
async function getClaimsByEmail(email) {
  try {
    console.log(`🔍 Đang lấy custom claims cho user: ${email}...\n`);
    
    const user = await admin.auth().getUserByEmail(email);
    const customClaims = user.customClaims || {};
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 CUSTOM CLAIMS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('👤 User Information:');
    console.log(`   Email: ${user.email}`);
    console.log(`   UID: ${user.uid}`);
    console.log(`   Display Name: ${user.displayName || 'N/A'}`);
    console.log(`   Email Verified: ${user.emailVerified ? 'Yes' : 'No'}`);
    console.log(`   Created: ${user.metadata.creationTime}`);
    console.log(`   Last Sign In: ${user.metadata.lastSignInTime || 'Never'}\n`);
    
    console.log('🎭 Custom Claims:');
    if (Object.keys(customClaims).length > 0) {
      console.log(JSON.stringify(customClaims, null, 2));
      
      if (customClaims.roles) {
        const roles = Array.isArray(customClaims.roles) 
          ? customClaims.roles 
          : [customClaims.roles];
        console.log(`\n📌 Roles: ${roles.join(', ')}`);
      }
      
      if (customClaims.name) {
        console.log(`📌 Name: ${customClaims.name}`);
      }
    } else {
      console.log('   ⚠️  Không có custom claims được set');
      console.log('   💡 User chưa có roles hoặc custom claims');
    }
    
    return { user, customClaims };
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`❌ User không tồn tại: ${email}\n`);
      console.log('💡 Kiểm tra lại email hoặc tạo user mới:');
      console.log(`   node scripts/manage-firebase-users.js create ${email} <password> <name> <roles>\n`);
      return null;
    }
    throw error;
  }
}

/**
 * Lấy custom claims theo UID
 */
async function getClaimsByUid(uid) {
  try {
    console.log(`🔍 Đang lấy custom claims cho UID: ${uid}...\n`);
    
    const user = await admin.auth().getUser(uid);
    const customClaims = user.customClaims || {};
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 CUSTOM CLAIMS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('👤 User Information:');
    console.log(`   Email: ${user.email || 'N/A'}`);
    console.log(`   UID: ${user.uid}`);
    console.log(`   Display Name: ${user.displayName || 'N/A'}`);
    console.log(`   Email Verified: ${user.emailVerified ? 'Yes' : 'No'}`);
    console.log(`   Created: ${user.metadata.creationTime}`);
    console.log(`   Last Sign In: ${user.metadata.lastSignInTime || 'Never'}\n`);
    
    console.log('🎭 Custom Claims:');
    if (Object.keys(customClaims).length > 0) {
      console.log(JSON.stringify(customClaims, null, 2));
      
      if (customClaims.roles) {
        const roles = Array.isArray(customClaims.roles) 
          ? customClaims.roles 
          : [customClaims.roles];
        console.log(`\n📌 Roles: ${roles.join(', ')}`);
      }
      
      if (customClaims.name) {
        console.log(`📌 Name: ${customClaims.name}`);
      }
    } else {
      console.log('   ⚠️  Không có custom claims được set');
      console.log('   💡 User chưa có roles hoặc custom claims');
    }
    
    return { user, customClaims };
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`❌ User không tồn tại với UID: ${uid}\n`);
      return null;
    }
    throw error;
  }
}

/**
 * Lấy custom claims của tất cả users
 */
async function getAllClaims(exportToFile = null) {
  try {
    console.log('📋 Đang lấy custom claims của tất cả users...\n');
    
    let nextPageToken;
    let allUsers = [];
    let count = 0;
    let usersWithClaims = 0;
    let usersWithoutClaims = 0;
    
    do {
      const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
      
      for (const user of listUsersResult.users) {
        count++;
        const customClaims = user.customClaims || {};
        const hasClaims = Object.keys(customClaims).length > 0;
        
        if (hasClaims) {
          usersWithClaims++;
        } else {
          usersWithoutClaims++;
        }
        
        allUsers.push({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          emailVerified: user.emailVerified,
          createdAt: user.metadata.creationTime,
          lastSignIn: user.metadata.lastSignInTime,
          customClaims: customClaims,
          hasClaims: hasClaims
        });
      }
      
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 TỔNG KẾT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`📌 Tổng số users: ${count}`);
    console.log(`✅ Users có custom claims: ${usersWithClaims}`);
    console.log(`⚠️  Users không có custom claims: ${usersWithoutClaims}\n`);
    
    // Hiển thị chi tiết users có claims
    if (usersWithClaims > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎭 USERS CÓ CUSTOM CLAIMS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      allUsers
        .filter(u => u.hasClaims)
        .forEach((user, index) => {
          const roles = Array.isArray(user.customClaims.roles) 
            ? user.customClaims.roles 
            : user.customClaims.roles ? [user.customClaims.roles] : [];
          
          console.log(`${index + 1}. ${user.email || user.uid}`);
          console.log(`   UID: ${user.uid}`);
          console.log(`   Name: ${user.displayName || 'N/A'}`);
          console.log(`   Roles: ${roles.length > 0 ? roles.join(', ') : 'N/A'}`);
          console.log(`   Custom Claims: ${JSON.stringify(user.customClaims)}`);
          console.log('');
        });
    }
    
    // Hiển thị users không có claims
    if (usersWithoutClaims > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️  USERS KHÔNG CÓ CUSTOM CLAIMS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      allUsers
        .filter(u => !u.hasClaims)
        .forEach((user, index) => {
          console.log(`${index + 1}. ${user.email || user.uid}`);
          console.log(`   UID: ${user.uid}`);
          console.log(`   Name: ${user.displayName || 'N/A'}`);
          console.log('');
        });
    }
    
    // Export ra file nếu có yêu cầu
    if (exportToFile) {
      const exportData = {
        exportedAt: new Date().toISOString(),
        totalUsers: count,
        usersWithClaims: usersWithClaims,
        usersWithoutClaims: usersWithoutClaims,
        users: allUsers.map(u => ({
          uid: u.uid,
          email: u.email,
          displayName: u.displayName,
          customClaims: u.customClaims
        }))
      };
      
      fs.writeFileSync(exportToFile, JSON.stringify(exportData, null, 2), 'utf8');
      console.log(`\n✅ Đã export ra file: ${exportToFile}`);
      console.log(`   Tổng số users: ${count}`);
      console.log(`   Users có claims: ${usersWithClaims}`);
      console.log(`   Users không có claims: ${usersWithoutClaims}\n`);
    }
    
    return allUsers;
  } catch (error) {
    console.error('❌ Error getting all claims:', error.message);
    throw error;
  }
}

/**
 * Format và hiển thị custom claims một cách đẹp
 */
function formatClaims(customClaims) {
  if (!customClaims || Object.keys(customClaims).length === 0) {
    return 'Không có custom claims';
  }
  
  const formatted = [];
  if (customClaims.roles) {
    const roles = Array.isArray(customClaims.roles) 
      ? customClaims.roles 
      : [customClaims.roles];
    formatted.push(`Roles: ${roles.join(', ')}`);
  }
  
  if (customClaims.name) {
    formatted.push(`Name: ${customClaims.name}`);
  }
  
  // Các claims khác
  Object.keys(customClaims).forEach(key => {
    if (key !== 'roles' && key !== 'name') {
      formatted.push(`${key}: ${JSON.stringify(customClaims[key])}`);
    }
  });
  
  return formatted.join(' | ');
}

// ============================================
// MAIN
// ============================================
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!initFirebase()) {
    process.exit(1);
  }
  
  try {
    switch (command) {
      case 'get-by-email':
        if (args.length < 2) {
          console.error('❌ Usage: node get-custom-claims.js get-by-email <email>');
          console.error('   Example: node get-custom-claims.js get-by-email user@example.com');
          process.exit(1);
        }
        await getClaimsByEmail(args[1]);
        break;
        
      case 'get-by-uid':
        if (args.length < 2) {
          console.error('❌ Usage: node get-custom-claims.js get-by-uid <uid>');
          console.error('   Example: node get-custom-claims.js get-by-uid abc123xyz');
          process.exit(1);
        }
        await getClaimsByUid(args[1]);
        break;
        
      case 'get-all':
        const exportIndex = args.indexOf('--export');
        const exportFile = exportIndex !== -1 && args[exportIndex + 1] 
          ? args[exportIndex + 1] 
          : null;
        await getAllClaims(exportFile);
        break;
        
      default:
        console.log('📖 Firebase Get Custom Claims Script\n');
        console.log('Commands:');
        console.log('  get-by-email <email>              - Lấy custom claims theo email');
        console.log('  get-by-uid <uid>                  - Lấy custom claims theo UID');
        console.log('  get-all                            - Lấy custom claims của tất cả users');
        console.log('  get-all --export <filename>        - Lấy và export ra file JSON');
        console.log('\nExamples:');
        console.log('  node scripts/get-custom-claims.js get-by-email user@example.com');
        console.log('  node scripts/get-custom-claims.js get-by-uid abc123xyz');
        console.log('  node scripts/get-custom-claims.js get-all');
        console.log('  node scripts/get-custom-claims.js get-all --export claims-backup.json');
        console.log('\n💡 Lưu ý:');
        console.log('  - Custom claims chứa thông tin về roles và các thông tin khác');
        console.log('  - User cần refresh token để nhận custom claims mới');
        console.log('  - File export sẽ chứa tất cả users và custom claims của họ');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack Trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();

