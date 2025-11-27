/**
 * Backend CORS Configuration - Node.js/Express
 * 
 * Hướng dẫn sử dụng:
 * 1. Copy code này vào file server chính (app.js, server.js, hoặc index.js)
 * 2. Hoặc tạo file riêng và require vào
 * 3. Đảm bảo CORS middleware được đặt TRƯỚC các routes
 */

const express = require('express');
const cors = require('cors');

// ============================================
// CÁCH 1: Sử dụng cors package (Khuyến nghị)
// ============================================

// Cài đặt: npm install cors

const corsOptions = {
  // Cho phép các origins
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localsite.thibidi.com',  // Production frontend
      'http://localhost:4200',          // Angular dev server
      'http://localhost:3000'           // Nếu có frontend dev khác
    ];
    
    // Cho phép requests không có origin (mobile apps, Postman, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Kiểm tra origin có trong danh sách allowed không
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  
  // Cho phép gửi credentials (cookies, authorization headers)
  credentials: true,
  
  // Cho phép các HTTP methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  
  // Cho phép các headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-Requested-With'
  ],
  
  // Expose headers cho frontend có thể đọc được
  exposedHeaders: ['Authorization'],
  
  // Cache preflight requests trong 24 giờ (giảm số lượng OPTIONS requests)
  maxAge: 86400
};

// Sử dụng CORS middleware
// QUAN TRỌNG: Phải đặt TRƯỚC các routes và middleware khác
app.use(cors(corsOptions));

// ============================================
// CÁCH 2: Manual CORS headers (nếu không dùng package)
// ============================================

// Middleware xử lý CORS thủ công
function corsMiddleware(req, res, next) {
  const allowedOrigins = [
    'http://localsite.thibidi.com',
    'http://localhost:4200',
    'http://localhost:3000'
  ];
  
  const origin = req.headers.origin;
  
  // Set Access-Control-Allow-Origin
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  // Set các CORS headers khác
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Expose-Headers', 'Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Xử lý preflight requests (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204); // No Content
  }
  
  next();
}

// Sử dụng middleware
app.use(corsMiddleware);

// ============================================
// CÁCH 3: CORS chỉ cho một số routes cụ thể
// ============================================

// Chỉ áp dụng CORS cho routes /api
app.use('/api', cors(corsOptions));

// ============================================
// EXAMPLE: Complete Server Setup
// ============================================

const express = require('express');
const cors = require('cors');
const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS Configuration
const corsOptions = {
  origin: [
    'http://localsite.thibidi.com',
    'http://localhost:4200'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['Authorization'],
  maxAge: 86400
};

// Apply CORS - PHẢI ĐẶT TRƯỚC CÁC ROUTES
app.use(cors(corsOptions));

// Routes
app.use('/api', require('./routes'));

// Error handling
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({ 
      error: 'CORS: Origin not allowed',
      message: 'Request from this origin is not allowed by CORS policy'
    });
  } else {
    console.error('Server error:', err);
    res.status(500).json({ 
      error: 'Internal server error',
      message: err.message 
    });
  }
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://172.20.115.40:${PORT}`);
  console.log('CORS enabled for:', corsOptions.origin);
});

// ============================================
// DEBUGGING: Log CORS requests
// ============================================

// Middleware để log CORS requests (dùng để debug)
app.use((req, res, next) => {
  console.log('=== CORS Request ===');
  console.log('Origin:', req.headers.origin);
  console.log('Method:', req.method);
  console.log('Path:', req.path);
  console.log('Headers:', req.headers);
  console.log('===================');
  next();
});

// ============================================
// TESTING: Test CORS với curl
// ============================================

/*
# Test preflight request
curl -X OPTIONS http://172.20.115.40:8080/api/auth/login/firebase-token \
  -H "Origin: http://localsite.thibidi.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v

# Expected response headers:
# Access-Control-Allow-Origin: http://localsite.thibidi.com
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
# Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin
# Access-Control-Allow-Credentials: true
*/

