/**
 * Script quản lý users trên Firebase Authentication
 * 
 * Chức năng:
 * - Tạo user mới trên Firebase
 * - Set Custom Claims (roles)
 * - List users
 * - Update user info
 * - Delete user
 * 
 * Cách sử dụng:
 * 1. Cài đặt: npm install firebase-admin
 * 2. Lấy Service Account Key từ Firebase Console
 * 3. Chạy: node scripts/manage-firebase-users.js <command> [options]
 * 
 * Commands:
 *   create <email> <password> <name> <roles>  - Tạo user mới
 *   list                                        - List tất cả users
 *   set-roles <email> <roles>                   - Set roles cho user
 *   update <email> <name>                       - Update user info
 *   delete <email>                              - Xóa user
 *   get <email>                                 - Lấy thông tin user
 */

const admin = require('firebase-admin');
const path = require('path');
const readline = require('readline');

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
 * Tạo user mới trên Firebase
 */
async function createUser(email, password, name, roles) {
  try {
    console.log(`📝 Đang tạo user: ${email}...`);
    
    // 1. Tạo user trên Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: name,
      emailVerified: false
    });
    
    console.log(`✅ User created: ${userRecord.uid}`);
    
    // 2. Set Custom Claims
    const rolesArray = roles.split(',').map(r => r.trim());
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      roles: rolesArray,
      name: name
    });
    
    console.log(`✅ Custom claims set:`, rolesArray);
    
    // 3. Hiển thị thông tin
    console.log('\n📋 User Information:');
    console.log(`   UID: ${userRecord.uid}`);
    console.log(`   Email: ${userRecord.email}`);
    console.log(`   Name: ${userRecord.displayName}`);
    console.log(`   Roles: ${rolesArray.join(', ')}`);
    console.log(`   Created: ${userRecord.metadata.creationTime}`);
    
    return userRecord;
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    throw error;
  }
}

/**
 * List tất cả users
 */
async function listUsers() {
  try {
    console.log('📋 Đang lấy danh sách users...\n');
    
    let nextPageToken;
    let count = 0;
    
    do {
      const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
      
      for (const user of listUsersResult.users) {
        count++;
        const customClaims = user.customClaims || {};
        const roles = customClaims.roles || [];
        
        console.log(`${count}. ${user.email}`);
        console.log(`   UID: ${user.uid}`);
        console.log(`   Name: ${user.displayName || 'N/A'}`);
        console.log(`   Roles: ${Array.isArray(roles) ? roles.join(', ') : roles || 'N/A'}`);
        console.log(`   Created: ${user.metadata.creationTime}`);
        console.log(`   Last Sign In: ${user.metadata.lastSignInTime || 'Never'}`);
        console.log('');
      }
      
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);
    
    console.log(`✅ Tổng cộng: ${count} users`);
  } catch (error) {
    console.error('❌ Error listing users:', error.message);
    throw error;
  }
}

/**
 * Set roles cho user
 */
async function setRoles(email, roles) {
  try {
    console.log(`📝 Đang set roles cho: ${email}...`);
    
    // Tìm user theo email
    const user = await admin.auth().getUserByEmail(email);
    
    // Set Custom Claims
    const rolesArray = roles.split(',').map(r => r.trim());
    await admin.auth().setCustomUserClaims(user.uid, {
      roles: rolesArray,
      name: user.displayName || user.email.split('@')[0]
    });
    
    console.log(`✅ Roles updated:`, rolesArray);
    console.log(`⚠️  User cần refresh token để nhận roles mới`);
    
    return user;
  } catch (error) {
    console.error('❌ Error setting roles:', error.message);
    throw error;
  }
}

/**
 * Update user info
 */
async function updateUser(email, name) {
  try {
    console.log(`📝 Đang update user: ${email}...`);
    
    const user = await admin.auth().getUserByEmail(email);
    
    await admin.auth().updateUser(user.uid, {
      displayName: name
    });
    
    // Update custom claims name
    const currentClaims = user.customClaims || {};
    await admin.auth().setCustomUserClaims(user.uid, {
      ...currentClaims,
      name: name
    });
    
    console.log(`✅ User updated: ${name}`);
    
    return user;
  } catch (error) {
    console.error('❌ Error updating user:', error.message);
    throw error;
  }
}

/**
 * Xóa user
 */
async function deleteUser(email) {
  try {
    console.log(`📝 Đang xóa user: ${email}...`);
    
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().deleteUser(user.uid);
    
    console.log(`✅ User deleted: ${email}`);
  } catch (error) {
    console.error('❌ Error deleting user:', error.message);
    throw error;
  }
}

/**
 * Lấy thông tin user
 */
async function getUser(email) {
  try {
    console.log(`📋 Đang lấy thông tin user: ${email}...\n`);
    
    const user = await admin.auth().getUserByEmail(email);
    const customClaims = user.customClaims || {};
    const roles = customClaims.roles || [];
    
    console.log('📋 User Information:');
    console.log(`   UID: ${user.uid}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.displayName || 'N/A'}`);
    console.log(`   Roles: ${Array.isArray(roles) ? roles.join(', ') : roles || 'N/A'}`);
    console.log(`   Email Verified: ${user.emailVerified}`);
    console.log(`   Created: ${user.metadata.creationTime}`);
    console.log(`   Last Sign In: ${user.metadata.lastSignInTime || 'Never'}`);
    
    return user;
  } catch (error) {
    console.error('❌ Error getting user:', error.message);
    throw error;
  }
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
      case 'create':
        if (args.length < 4) {
          console.error('❌ Usage: node manage-firebase-users.js create <email> <password> <name> <roles>');
          console.error('   Example: node manage-firebase-users.js create user@example.com password123 "User Name" "Administrator,Manager"');
          process.exit(1);
        }
        await createUser(args[1], args[2], args[3], args[4] || 'User');
        break;
        
      case 'list':
        await listUsers();
        break;
        
      case 'set-roles':
        if (args.length < 3) {
          console.error('❌ Usage: node manage-firebase-users.js set-roles <email> <roles>');
          console.error('   Example: node manage-firebase-users.js set-roles user@example.com "Administrator,Manager"');
          process.exit(1);
        }
        await setRoles(args[1], args[2]);
        break;
        
      case 'update':
        if (args.length < 3) {
          console.error('❌ Usage: node manage-firebase-users.js update <email> <name>');
          console.error('   Example: node manage-firebase-users.js update user@example.com "New Name"');
          process.exit(1);
        }
        await updateUser(args[1], args[2]);
        break;
        
      case 'delete':
        if (args.length < 2) {
          console.error('❌ Usage: node manage-firebase-users.js delete <email>');
          console.error('   Example: node manage-firebase-users.js delete user@example.com');
          process.exit(1);
        }
        await deleteUser(args[1]);
        break;
        
      case 'get':
        if (args.length < 2) {
          console.error('❌ Usage: node manage-firebase-users.js get <email>');
          console.error('   Example: node manage-firebase-users.js get user@example.com');
          process.exit(1);
        }
        await getUser(args[1]);
        break;
        
      default:
        console.log('📖 Firebase User Management Script\n');
        console.log('Commands:');
        console.log('  create <email> <password> <name> <roles>  - Tạo user mới');
        console.log('  list                                      - List tất cả users');
        console.log('  set-roles <email> <roles>                - Set roles cho user');
        console.log('  update <email> <name>                    - Update user info');
        console.log('  delete <email>                           - Xóa user');
        console.log('  get <email>                              - Lấy thông tin user');
        console.log('\nExamples:');
        console.log('  node manage-firebase-users.js create admin@example.com pass123 "Admin User" "Administrator"');
        console.log('  node manage-firebase-users.js list');
        console.log('  node manage-firebase-users.js set-roles user@example.com "Administrator,Manager"');
        console.log('  node manage-firebase-users.js get user@example.com');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();

