/**
 * Script helper để kiểm tra và chạy create-admin.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Đang kiểm tra điều kiện...\n');

// Kiểm tra service account key
const serviceAccountPath = './service-account-key.json';
if (!fs.existsSync(serviceAccountPath)) {
  console.log('❌ Không tìm thấy Service Account Key!');
  console.log('\n📋 Cách lấy Service Account Key:');
  console.log('1. Truy cập: https://console.firebase.google.com/');
  console.log('2. Chọn project: quanlyfiles-9891e');
  console.log('3. Vào Project Settings (⚙️) → Service Accounts');
  console.log('4. Click "Generate new private key"');
  console.log('5. Lưu file JSON vào thư mục project với tên: service-account-key.json');
  console.log('\n⚠️  Lưu ý: Không commit file này lên Git!');
  console.log('\nSau khi có file, chạy lại: node scripts/check-and-run-admin.js\n');
  process.exit(1);
}

console.log('✅ Service Account Key đã tồn tại');

// Kiểm tra dependencies
try {
  require('firebase-admin');
  require('axios');
  console.log('✅ Dependencies đã được cài đặt');
} catch (error) {
  console.log('❌ Thiếu dependencies!');
  console.log('Chạy: npm install firebase-admin axios --save-dev\n');
  process.exit(1);
}

console.log('\n🚀 Tất cả điều kiện đã sẵn sàng!');
console.log('Đang chạy script tạo admin...\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Chạy script create-admin
require('./create-admin.js');

