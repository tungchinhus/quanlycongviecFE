# Hướng Dẫn Backend API - Bảng TSMay

## Tổng Quan

Tài liệu này hướng dẫn tạo Backend API để lưu dữ liệu từ Excel Reader vào bảng `TSMay` trong database.

## Cấu Trúc Bảng TSMay

```sql
CREATE TABLE TSMay (
    id INT PRIMARY KEY IDENTITY(1,1),
    CongSuat INT NULL,
    SoMay NVARCHAR(50) NULL,
    SBB NVARCHAR(50) NULL,
    LSX NVARCHAR(50) NULL,
    TChuanLSX NVARCHAR(50) NULL,
    TBKT NCHAR(10) NULL,
    Po NCHAR(10) NULL,
    Io NCHAR(10) NULL,
    Pk75H1 NCHAR(10) NULL,
    Pk75H2 NCHAR(10) NULL,
    Uk75H1 NCHAR(10) NULL,
    Uk75H2 NCHAR(10) NULL,
    UdmHVH1 NCHAR(10) NULL,
    UdmHVH2 NCHAR(10) NULL,
    UdmLV NCHAR(10) NULL
);
```

## API Endpoints Cần Tạo

### 1. POST `/api/tsmay` - Tạo một bản ghi

**Request:**
```json
{
  "congSuat": 160,
  "soMay": "T00034002",
  "sbb": "2531837",
  "lsx": "50001208",
  "tChuanLSX": "LAO",
  "tbkt": "25139T",
  "po": "78",
  "io": "0.527",
  "pk75H1": "1898",
  "pk75H2": null,
  "uk75H1": "4.15",
  "uk75H2": null,
  "udmHVH1": "22",
  "udmHVH2": null,
  "udmLV": "0.4"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "congSuat": 160,
  "soMay": "T00034002",
  "sbb": "2531837",
  "lsx": "50001208",
  "tChuanLSX": "LAO",
  "tbkt": "25139T",
  "po": "78",
  "io": "0.527",
  "pk75H1": "1898",
  "pk75H2": null,
  "uk75H1": "4.15",
  "uk75H2": null,
  "udmHVH1": "22",
  "udmHVH2": null,
  "udmLV": "0.4"
}
```

### 2. POST `/api/tsmay/bulk` - Tạo nhiều bản ghi cùng lúc (Bulk Insert)

**Request:**
```json
{
  "items": [
    {
      "congSuat": 160,
      "soMay": "T00034002",
      "sbb": "2531837",
      "lsx": "50001208",
      "tChuanLSX": "LAO",
      "tbkt": "25139T",
      "po": "78",
      "io": "0.527",
      "pk75H1": "1898",
      "pk75H2": null,
      "uk75H1": "4.15",
      "uk75H2": null,
      "udmHVH1": "22",
      "udmHVH2": null,
      "udmLV": "0.4"
    },
    {
      "congSuat": 250,
      "soMay": "T00034003",
      "sbb": "2531840",
      "lsx": "50000110",
      "tChuanLSX": "DLVN-62",
      "tbkt": "25140T",
      "po": "90",
      "io": "0.537",
      "pk75H1": "1894",
      "pk75H2": null,
      "uk75H1": "4.13",
      "uk75H2": null,
      "udmHVH1": "22",
      "udmHVH2": null,
      "udmLV": "0.4"
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "total": 2,
  "created": 2,
  "failed": 0
}
```

**Response với lỗi (một số bản ghi thất bại):**
```json
{
  "success": false,
  "total": 2,
  "created": 1,
  "failed": 1,
  "errors": [
    {
      "index": 1,
      "data": {
        "congSuat": 250,
        "soMay": "T00034003",
        ...
      },
      "error": "Duplicate key violation: SoMay already exists"
    }
  ]
}
```

### 3. GET `/api/tsmay` - Lấy tất cả bản ghi

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "congSuat": 160,
    "soMay": "T00034002",
    ...
  },
  {
    "id": 2,
    "congSuat": 250,
    "soMay": "T00034003",
    ...
  }
]
```

### 4. GET `/api/tsmay/:id` - Lấy một bản ghi theo ID

**Response (200 OK):**
```json
{
  "id": 1,
  "congSuat": 160,
  "soMay": "T00034002",
  ...
}
```

### 5. PUT `/api/tsmay/:id` - Cập nhật một bản ghi

**Request:**
```json
{
  "po": "80",
  "io": "0.530"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "congSuat": 160,
  "soMay": "T00034002",
  "po": "80",
  "io": "0.530",
  ...
}
```

### 6. DELETE `/api/tsmay/:id` - Xóa một bản ghi

**Response (200 OK):**
```json
{
  "message": "Deleted successfully"
}
```

### 7. GET `/api/tsmay/search` - Tìm kiếm

**Query Parameters:**
- `soMay` (optional): Tìm theo số máy
- `sbb` (optional): Tìm theo SBB
- `lsx` (optional): Tìm theo LSX
- `congSuat` (optional): Tìm theo công suất

**Example:**
```
GET /api/tsmay/search?soMay=T00034002
GET /api/tsmay/search?congSuat=160&sbb=2531837
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "congSuat": 160,
    "soMay": "T00034002",
    ...
  }
]
```

## Implementation Guide (Node.js/Express + SQL Server)

### 1. Controller (`tsmay.controller.js`)

```javascript
const tsMayService = require('../services/tsmay.service');
const { validateTSMay, validateBulkTSMay } = require('../validators/tsmay.validator');

// Tạo một bản ghi
exports.create = async (req, res) => {
  try {
    const validation = validateTSMay(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.errors });
    }

    const result = await tsMayService.create(req.body);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating TSMay:', error);
    res.status(500).json({ error: error.message });
  }
};

// Bulk create
exports.bulkCreate = async (req, res) => {
  try {
    const validation = validateBulkTSMay(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.errors });
    }

    const result = await tsMayService.bulkCreate(req.body.items);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error bulk creating TSMay:', error);
    res.status(500).json({ error: error.message });
  }
};

// Lấy tất cả
exports.getAll = async (req, res) => {
  try {
    const result = await tsMayService.getAll();
    res.status(200).json(result);
  } catch (error) {
    console.error('Error getting TSMay:', error);
    res.status(500).json({ error: error.message });
  }
};

// Lấy theo ID
exports.getById = async (req, res) => {
  try {
    const result = await tsMayService.getById(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'TSMay not found' });
    }
    res.status(200).json(result);
  } catch (error) {
    console.error('Error getting TSMay by ID:', error);
    res.status(500).json({ error: error.message });
  }
};

// Cập nhật
exports.update = async (req, res) => {
  try {
    const result = await tsMayService.update(req.params.id, req.body);
    if (!result) {
      return res.status(404).json({ error: 'TSMay not found' });
    }
    res.status(200).json(result);
  } catch (error) {
    console.error('Error updating TSMay:', error);
    res.status(500).json({ error: error.message });
  }
};

// Xóa
exports.delete = async (req, res) => {
  try {
    await tsMayService.delete(req.params.id);
    res.status(200).json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting TSMay:', error);
    res.status(500).json({ error: error.message });
  }
};

// Tìm kiếm
exports.search = async (req, res) => {
  try {
    const criteria = {
      soMay: req.query.soMay,
      sbb: req.query.sbb,
      lsx: req.query.lsx,
      congSuat: req.query.congSuat ? parseInt(req.query.congSuat) : undefined
    };
    
    const result = await tsMayService.search(criteria);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error searching TSMay:', error);
    res.status(500).json({ error: error.message });
  }
};
```

### 2. Service (`tsmay.service.js`)

```javascript
const sql = require('mssql');
const db = require('../config/database');

// Map từ camelCase (API) sang PascalCase (Database)
function mapToDbFormat(data) {
  return {
    CongSuat: data.congSuat !== undefined && data.congSuat !== null ? parseInt(data.congSuat) : null,
    SoMay: data.soMay || null,
    SBB: data.sbb || null,
    LSX: data.lsx || null,
    TChuanLSX: data.tChuanLSX || null,
    TBKT: data.tbkt || null,
    Po: data.po || null,
    Io: data.io || null,
    Pk75H1: data.pk75H1 || null,
    Pk75H2: data.pk75H2 || null,
    Uk75H1: data.uk75H1 || null,
    Uk75H2: data.uk75H2 || null,
    UdmHVH1: data.udmHVH1 || null,
    UdmHVH2: data.udmHVH2 || null,
    UdmLV: data.udmLV || null
  };
}

// Map từ PascalCase (Database) sang camelCase (API)
function mapToApiFormat(row) {
  return {
    id: row.id,
    congSuat: row.CongSuat,
    soMay: row.SoMay,
    sbb: row.SBB,
    lsx: row.LSX,
    tChuanLSX: row.TChuanLSX,
    tbkt: row.TBKT,
    po: row.Po,
    io: row.Io,
    pk75H1: row.Pk75H1,
    pk75H2: row.Pk75H2,
    uk75H1: row.Uk75H1,
    uk75H2: row.Uk75H2,
    udmHVH1: row.UdmHVH1,
    udmHVH2: row.UdmHVH2,
    udmLV: row.UdmLV
  };
}

// Tạo một bản ghi
exports.create = async (data) => {
  const pool = await db.getConnection();
  try {
    const dbData = mapToDbFormat(data);
    
    const request = pool.request();
    request.input('CongSuat', sql.Int, dbData.CongSuat);
    request.input('SoMay', sql.NVarChar(50), dbData.SoMay);
    request.input('SBB', sql.NVarChar(50), dbData.SBB);
    request.input('LSX', sql.NVarChar(50), dbData.LSX);
    request.input('TChuanLSX', sql.NVarChar(50), dbData.TChuanLSX);
    request.input('TBKT', sql.NChar(10), dbData.TBKT);
    request.input('Po', sql.NChar(10), dbData.Po);
    request.input('Io', sql.NChar(10), dbData.Io);
    request.input('Pk75H1', sql.NChar(10), dbData.Pk75H1);
    request.input('Pk75H2', sql.NChar(10), dbData.Pk75H2);
    request.input('Uk75H1', sql.NChar(10), dbData.Uk75H1);
    request.input('Uk75H2', sql.NChar(10), dbData.Uk75H2);
    request.input('UdmHVH1', sql.NChar(10), dbData.UdmHVH1);
    request.input('UdmHVH2', sql.NChar(10), dbData.UdmHVH2);
    request.input('UdmLV', sql.NChar(10), dbData.UdmLV);
    
    const result = await request.query(`
      INSERT INTO TSMay (
        CongSuat, SoMay, SBB, LSX, TChuanLSX, TBKT, Po, Io,
        Pk75H1, Pk75H2, Uk75H1, Uk75H2, UdmHVH1, UdmHVH2, UdmLV
      )
      OUTPUT INSERTED.*
      VALUES (
        @CongSuat, @SoMay, @SBB, @LSX, @TChuanLSX, @TBKT, @Po, @Io,
        @Pk75H1, @Pk75H2, @Uk75H1, @Uk75H2, @UdmHVH1, @UdmHVH2, @UdmLV
      )
    `);
    
    return mapToApiFormat(result.recordset[0]);
  } finally {
    await pool.close();
  }
};

// Bulk create với transaction
exports.bulkCreate = async (items) => {
  const pool = await db.getConnection();
  const transaction = new sql.Transaction(pool);
  
  try {
    await transaction.begin();
    
    const created = [];
    const errors = [];
    
    for (let i = 0; i < items.length; i++) {
      try {
        const dbData = mapToDbFormat(items[i]);
        
        const request = new sql.Request(transaction);
        request.input('CongSuat', sql.Int, dbData.CongSuat);
        request.input('SoMay', sql.NVarChar(50), dbData.SoMay);
        request.input('SBB', sql.NVarChar(50), dbData.SBB);
        request.input('LSX', sql.NVarChar(50), dbData.LSX);
        request.input('TChuanLSX', sql.NVarChar(50), dbData.TChuanLSX);
        request.input('TBKT', sql.NChar(10), dbData.TBKT);
        request.input('Po', sql.NChar(10), dbData.Po);
        request.input('Io', sql.NChar(10), dbData.Io);
        request.input('Pk75H1', sql.NChar(10), dbData.Pk75H1);
        request.input('Pk75H2', sql.NChar(10), dbData.Pk75H2);
        request.input('Uk75H1', sql.NChar(10), dbData.Uk75H1);
        request.input('Uk75H2', sql.NChar(10), dbData.Uk75H2);
        request.input('UdmHVH1', sql.NChar(10), dbData.UdmHVH1);
        request.input('UdmHVH2', sql.NChar(10), dbData.UdmHVH2);
        request.input('UdmLV', sql.NChar(10), dbData.UdmLV);
        
        const result = await request.query(`
          INSERT INTO TSMay (
            CongSuat, SoMay, SBB, LSX, TChuanLSX, TBKT, Po, Io,
            Pk75H1, Pk75H2, Uk75H1, Uk75H2, UdmHVH1, UdmHVH2, UdmLV
          )
          OUTPUT INSERTED.*
          VALUES (
            @CongSuat, @SoMay, @SBB, @LSX, @TChuanLSX, @TBKT, @Po, @Io,
            @Pk75H1, @Pk75H2, @Uk75H1, @Uk75H2, @UdmHVH1, @UdmHVH2, @UdmLV
          )
        `);
        
        created.push(mapToApiFormat(result.recordset[0]));
      } catch (error) {
        errors.push({
          index: i,
          data: items[i],
          error: error.message
        });
      }
    }
    
    if (errors.length === 0) {
      await transaction.commit();
    } else {
      await transaction.rollback();
    }
    
    return {
      success: errors.length === 0,
      total: items.length,
      created: created.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  } finally {
    await pool.close();
  }
};

// Lấy tất cả
exports.getAll = async () => {
  const pool = await db.getConnection();
  try {
    const result = await pool.request().query('SELECT * FROM TSMay ORDER BY id DESC');
    return result.recordset.map(mapToApiFormat);
  } finally {
    await pool.close();
  }
};

// Lấy theo ID
exports.getById = async (id) => {
  const pool = await db.getConnection();
  try {
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM TSMay WHERE id = @id');
    
    if (result.recordset.length === 0) {
      return null;
    }
    
    return mapToApiFormat(result.recordset[0]);
  } finally {
    await pool.close();
  }
};

// Cập nhật
exports.update = async (id, data) => {
  const pool = await db.getConnection();
  try {
    const dbData = mapToDbFormat(data);
    
    const updates = [];
    const request = pool.request();
    request.input('id', sql.Int, id);
    
    if (dbData.CongSuat !== undefined) {
      request.input('CongSuat', sql.Int, dbData.CongSuat);
      updates.push('CongSuat = @CongSuat');
    }
    if (dbData.SoMay !== undefined) {
      request.input('SoMay', sql.NVarChar(50), dbData.SoMay);
      updates.push('SoMay = @SoMay');
    }
    if (dbData.SBB !== undefined) {
      request.input('SBB', sql.NVarChar(50), dbData.SBB);
      updates.push('SBB = @SBB');
    }
    // ... thêm các trường khác tương tự
    
    if (updates.length === 0) {
      return await exports.getById(id);
    }
    
    const updateQuery = `
      UPDATE TSMay 
      SET ${updates.join(', ')}
      OUTPUT INSERTED.*
      WHERE id = @id
    `;
    
    const result = await request.query(updateQuery);
    
    if (result.recordset.length === 0) {
      return null;
    }
    
    return mapToApiFormat(result.recordset[0]);
  } finally {
    await pool.close();
  }
};

// Xóa
exports.delete = async (id) => {
  const pool = await db.getConnection();
  try {
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM TSMay WHERE id = @id');
  } finally {
    await pool.close();
  }
};

// Tìm kiếm
exports.search = async (criteria) => {
  const pool = await db.getConnection();
  try {
    const conditions = [];
    const request = pool.request();
    
    if (criteria.soMay) {
      request.input('SoMay', sql.NVarChar(50), criteria.soMay);
      conditions.push('SoMay = @SoMay');
    }
    if (criteria.sbb) {
      request.input('SBB', sql.NVarChar(50), criteria.sbb);
      conditions.push('SBB = @SBB');
    }
    if (criteria.lsx) {
      request.input('LSX', sql.NVarChar(50), criteria.lsx);
      conditions.push('LSX = @LSX');
    }
    if (criteria.congSuat !== undefined) {
      request.input('CongSuat', sql.Int, criteria.congSuat);
      conditions.push('CongSuat = @CongSuat');
    }
    
    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}`
      : '';
    
    const result = await request.query(`
      SELECT * FROM TSMay 
      ${whereClause}
      ORDER BY id DESC
    `);
    
    return result.recordset.map(mapToApiFormat);
  } finally {
    await pool.close();
  }
};
```

### 3. Routes (`tsmay.routes.js`)

```javascript
const express = require('express');
const router = express.Router();
const tsMayController = require('../controllers/tsmay.controller');
const { verifyFirebaseToken } = require('../middleware/auth.middleware');

// Tất cả routes đều yêu cầu authentication
router.use(verifyFirebaseToken);

// CRUD operations
router.post('/', tsMayController.create);
router.post('/bulk', tsMayController.bulkCreate);
router.get('/', tsMayController.getAll);
router.get('/search', tsMayController.search);
router.get('/:id', tsMayController.getById);
router.put('/:id', tsMayController.update);
router.delete('/:id', tsMayController.delete);

module.exports = router;
```

### 4. Validator (`tsmay.validator.js`)

```javascript
function validateTSMay(data) {
  const errors = [];
  
  // CongSuat phải là số nếu có
  if (data.congSuat !== undefined && data.congSuat !== null) {
    if (isNaN(parseInt(data.congSuat))) {
      errors.push('congSuat must be a number');
    }
  }
  
  // SoMay không được quá 50 ký tự
  if (data.soMay && data.soMay.length > 50) {
    errors.push('soMay must not exceed 50 characters');
  }
  
  // Các trường NCHAR(10) không được quá 10 ký tự
  const ncharFields = ['tbkt', 'po', 'io', 'pk75H1', 'pk75H2', 'uk75H1', 'uk75H2', 'udmHVH1', 'udmHVH2', 'udmLV'];
  ncharFields.forEach(field => {
    if (data[field] && data[field].length > 10) {
      errors.push(`${field} must not exceed 10 characters`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

function validateBulkTSMay(data) {
  if (!data.items || !Array.isArray(data.items)) {
    return {
      isValid: false,
      errors: ['items must be an array']
    };
  }
  
  if (data.items.length === 0) {
    return {
      isValid: false,
      errors: ['items array cannot be empty']
    };
  }
  
  if (data.items.length > 1000) {
    return {
      isValid: false,
      errors: ['items array cannot exceed 1000 items']
    };
  }
  
  const errors = [];
  data.items.forEach((item, index) => {
    const validation = validateTSMay(item);
    if (!validation.isValid) {
      errors.push({
        index,
        errors: validation.errors
      });
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateTSMay,
  validateBulkTSMay
};
```

### 5. Đăng ký Routes trong `app.js` hoặc `server.js`

```javascript
const tsMayRoutes = require('./routes/tsmay.routes');

app.use('/api/tsmay', tsMayRoutes);
```

## Lưu Ý Quan Trọng

1. **Authentication**: Tất cả endpoints đều yêu cầu Firebase token authentication
2. **Validation**: Validate dữ liệu trước khi insert vào database
3. **Error Handling**: Xử lý lỗi đầy đủ, đặc biệt là duplicate key errors
4. **Transaction**: Sử dụng transaction cho bulk insert để đảm bảo data integrity
5. **Mapping**: Chuyển đổi giữa camelCase (API) và PascalCase (Database)
6. **Null Handling**: Xử lý đúng các giá trị null từ Excel

## Testing

Sử dụng Postman hoặc curl để test:

```bash
# Test create
curl -X POST http://localhost:5000/api/tsmay \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{
    "congSuat": 160,
    "soMay": "T00034002",
    "sbb": "2531837"
  }'

# Test bulk create
curl -X POST http://localhost:5000/api/tsmay/bulk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{
    "items": [
      {"congSuat": 160, "soMay": "T00034002"},
      {"congSuat": 250, "soMay": "T00034003"}
    ]
  }'
```

