/**
 * Script kiểm tra kết nối đến Backend API
 * 
 * Chức năng:
 * - Kiểm tra API URL có đúng không
 * - Kiểm tra các endpoint có hoạt động không
 * - Kiểm tra CORS
 * - So sánh với environment.ts
 * 
 * Cách sử dụng:
 * node scripts/check-api-connection.js [apiUrl]
 * 
 * Example:
 *   node scripts/check-api-connection.js
 *   node scripts/check-api-connection.js http://localhost:5000/api
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ============================================
// CẤU HÌNH
// ============================================
const DEFAULT_API_URL = 'http://localhost:5000/api';
const ENVIRONMENT_FILE = path.resolve('./src/environments/environment.ts');

// ============================================
// ĐỌC ENVIRONMENT.TS
// ============================================
function readEnvironmentApiUrl() {
  try {
    const content = fs.readFileSync(ENVIRONMENT_FILE, 'utf8');
    const match = content.match(/apiUrl:\s*['"]([^'"]+)['"]/);
    if (match) {
      return match[1];
    }
    return null;
  } catch (error) {
    console.log('⚠️  Không thể đọc file environment.ts:', error.message);
    return null;
  }
}

// ============================================
// KIỂM TRA KẾT NỐI
// ============================================

/**
 * Kiểm tra endpoint có hoạt động không
 */
async function checkEndpoint(apiUrl, endpoint, method = 'GET', data = null) {
  try {
    const url = `${apiUrl}${endpoint}`;
    const config = {
      method,
      url,
      timeout: 5000,
      validateStatus: (status) => status < 500 // Không throw error cho 404, 401, etc.
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
      config.headers = { 'Content-Type': 'application/json' };
    }
    
    const response = await axios(config);
    
    return {
      success: true,
      status: response.status,
      statusText: response.statusText,
      url: url
    };
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return {
        success: false,
        error: 'Connection refused',
        message: 'Backend không chạy hoặc không thể kết nối'
      };
    } else if (error.code === 'ETIMEDOUT') {
      return {
        success: false,
        error: 'Timeout',
        message: 'Request timeout - backend có thể không phản hồi'
      };
    } else if (error.response) {
      return {
        success: true, // Endpoint tồn tại, chỉ là status code khác 200
        status: error.response.status,
        statusText: error.response.statusText,
        url: error.config.url
      };
    } else {
      return {
        success: false,
        error: error.code || 'Unknown',
        message: error.message
      };
    }
  }
}

/**
 * Kiểm tra các endpoint quan trọng
 */
async function checkEndpoints(apiUrl) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 KIỂM TRA ENDPOINTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const endpoints = [
    { path: '/auth/login/firebase-token', method: 'POST', name: 'Login (Firebase Token)', critical: true },
    { path: '/users/by-username/test', method: 'GET', name: 'Get User by Username', critical: true },
    { path: '/users/by-firebase-uid/test', method: 'GET', name: 'Get User by Firebase UID', critical: false },
    { path: '/users', method: 'GET', name: 'List Users', critical: false },
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    console.log(`🔍 ${endpoint.name}...`);
    console.log(`   ${endpoint.method} ${apiUrl}${endpoint.path}`);
    
    const testData = endpoint.method === 'POST' 
      ? { idToken: 'test-token' } 
      : null;
    
    const result = await checkEndpoint(apiUrl, endpoint.path, endpoint.method, testData);
    results.push({ ...endpoint, ...result });
    
    if (result.success) {
      if (result.status === 200) {
        console.log(`   ✅ OK (${result.status})`);
      } else if (result.status === 401 || result.status === 403) {
        console.log(`   ⚠️  Requires authentication (${result.status})`);
      } else if (result.status === 404) {
        console.log(`   ⚠️  Not found (${result.status}) - endpoint có thể không tồn tại`);
      } else {
        console.log(`   ⚠️  Status: ${result.status} ${result.statusText}`);
      }
    } else {
      console.log(`   ❌ ${result.message || result.error}`);
      if (endpoint.critical) {
        console.log(`   ⚠️  CRITICAL: Endpoint này cần thiết cho đăng nhập!`);
      }
    }
    console.log('');
  }
  
  return results;
}

/**
 * Kiểm tra CORS
 */
async function checkCORS(apiUrl) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌐 KIỂM TRA CORS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    const response = await axios.options(`${apiUrl}/auth/login/firebase-token`, {
      timeout: 5000,
      validateStatus: () => true
    });
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': response.headers['access-control-allow-origin'],
      'Access-Control-Allow-Methods': response.headers['access-control-allow-methods'],
      'Access-Control-Allow-Headers': response.headers['access-control-allow-headers'],
    };
    
    console.log('CORS Headers:');
    Object.entries(corsHeaders).forEach(([key, value]) => {
      if (value) {
        console.log(`   ${key}: ${value}`);
      } else {
        console.log(`   ${key}: ❌ Không có`);
      }
    });
    
    if (!corsHeaders['Access-Control-Allow-Origin']) {
      console.log('\n⚠️  CORS có thể chưa được cấu hình đúng');
      console.log('   Frontend có thể gặp lỗi CORS khi gọi API');
    } else {
      console.log('\n✅ CORS đã được cấu hình');
    }
    
  } catch (error) {
    console.log('⚠️  Không thể kiểm tra CORS:', error.message);
  }
  
  console.log('');
}

/**
 * Main function
 */
async function checkApiConnection(apiUrl) {
  console.log('🚀 KIỂM TRA KẾT NỐI BACKEND API\n');
  
  // 1. Đọc từ environment.ts
  const envApiUrl = readEnvironmentApiUrl();
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 CẤU HÌNH');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('📝 Environment.ts:');
  if (envApiUrl) {
    console.log(`   ${envApiUrl}`);
  } else {
    console.log('   ⚠️  Không tìm thấy apiUrl trong environment.ts');
  }
  
  console.log(`\n🔧 URL được kiểm tra: ${apiUrl}\n`);
  
  if (envApiUrl && envApiUrl !== apiUrl) {
    console.log('⚠️  WARNING: URL khác với environment.ts!');
    console.log(`   Environment: ${envApiUrl}`);
    console.log(`   Testing: ${apiUrl}\n`);
  }
  
  // 2. Kiểm tra kết nối cơ bản
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔌 KIỂM TRA KẾT NỐI');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const basicCheck = await checkEndpoint(apiUrl, '/users', 'GET');
  
  if (!basicCheck.success) {
    console.log('❌ KHÔNG THỂ KẾT NỐI ĐẾN BACKEND!\n');
    console.log('💡 Kiểm tra:');
    console.log('   1. Backend có đang chạy không?');
    console.log(`   2. URL có đúng không? (${apiUrl})`);
    console.log('   3. Port có đúng không? (5000)');
    console.log('   4. Firewall có chặn không?');
    process.exit(1);
  }
  
  console.log('✅ Backend đang chạy\n');
  
  // 3. Kiểm tra endpoints
  const results = await checkEndpoints(apiUrl);
  
  // 4. Kiểm tra CORS
  await checkCORS(apiUrl);
  
  // 5. Tóm tắt
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 TÓM TẮT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const criticalEndpoints = results.filter(r => r.critical);
  const criticalOk = criticalEndpoints.every(r => r.success);
  
  if (criticalOk) {
    console.log('✅ Tất cả endpoints quan trọng đều OK');
  } else {
    console.log('❌ Có endpoints quan trọng không hoạt động');
    criticalEndpoints.forEach(endpoint => {
      if (!endpoint.success) {
        console.log(`   - ${endpoint.name}: ${endpoint.message || endpoint.error}`);
      }
    });
  }
  
  console.log('\n💡 Nếu vẫn gặp lỗi đăng nhập:');
  console.log('   1. Kiểm tra mật khẩu có đúng không');
  console.log('   2. Kiểm tra user có tồn tại trong Firebase:');
  console.log('      node scripts/check-firebase-user.js <email>');
  console.log('   3. Kiểm tra CORS trong backend');
  console.log('   4. Kiểm tra network tab trong browser DevTools\n');
}

// ============================================
// RUN
// ============================================
const args = process.argv.slice(2);
const apiUrl = args[0] || DEFAULT_API_URL;

checkApiConnection(apiUrl).catch(error => {
  console.error('\n❌ Error:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});

