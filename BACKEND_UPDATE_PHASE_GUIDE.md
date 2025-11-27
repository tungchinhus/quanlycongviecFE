# Hướng Dẫn Cập Nhật Backend - Hỗ Trợ Phase (1 Pha / 3 Pha)

## Tổng Quan

Hướng dẫn này mô tả các thay đổi cần thiết để backend hỗ trợ trường `phase` cho bảng TSMay, cho phép phân biệt giữa máy biến áp 1 pha và 3 pha.

## Bước 1: Chạy SQL Script

Trước tiên, chạy script SQL để cập nhật database:
```bash
# Chạy file TSMay_1Pha_SQL_Script.sql trong SQL Server Management Studio
```

Script sẽ:
- Thêm cột `Phase` (NCHAR(1)) vào bảng TSMay
- Tạo index và constraint
- Cập nhật dữ liệu cũ

## Bước 2: Cập Nhật Service (`tsmay.service.js`)

### 2.1. Cập nhật hàm `mapToDbFormat`

**TRƯỚC:**
```javascript
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
```

**SAU:**
```javascript
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
    UdmLV: data.udmLV || null,
    Phase: data.phase || null  // ✅ THÊM DÒNG NÀY
  };
}
```

### 2.2. Cập nhật hàm `mapToApiFormat`

**TRƯỚC:**
```javascript
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
```

**SAU:**
```javascript
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
    udmLV: row.UdmLV,
    phase: row.Phase  // ✅ THÊM DÒNG NÀY
  };
}
```

### 2.3. Cập nhật hàm `create`

**TRƯỚC:**
```javascript
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
```

**SAU:**
```javascript
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
    request.input('Phase', sql.NChar(1), dbData.Phase);  // ✅ THÊM DÒNG NÀY
    
    const result = await request.query(`
      INSERT INTO TSMay (
        CongSuat, SoMay, SBB, LSX, TChuanLSX, TBKT, Po, Io,
        Pk75H1, Pk75H2, Uk75H1, Uk75H2, UdmHVH1, UdmHVH2, UdmLV, Phase
      )
      OUTPUT INSERTED.*
      VALUES (
        @CongSuat, @SoMay, @SBB, @LSX, @TChuanLSX, @TBKT, @Po, @Io,
        @Pk75H1, @Pk75H2, @Uk75H1, @Uk75H2, @UdmHVH1, @UdmHVH2, @UdmLV, @Phase
      )
    `);
    
    return mapToApiFormat(result.recordset[0]);
  } finally {
    await pool.close();
  }
};
```

### 2.4. Cập nhật hàm `bulkCreate`

**TRƯỚC:**
```javascript
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
  } finally {
    await pool.close();
  }
};
```

**SAU:**
```javascript
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
        request.input('Phase', sql.NChar(1), dbData.Phase);  // ✅ THÊM DÒNG NÀY
        
        const result = await request.query(`
          INSERT INTO TSMay (
            CongSuat, SoMay, SBB, LSX, TChuanLSX, TBKT, Po, Io,
            Pk75H1, Pk75H2, Uk75H1, Uk75H2, UdmHVH1, UdmHVH2, UdmLV, Phase
          )
          OUTPUT INSERTED.*
          VALUES (
            @CongSuat, @SoMay, @SBB, @LSX, @TChuanLSX, @TBKT, @Po, @Io,
            @Pk75H1, @Pk75H2, @Uk75H1, @Uk75H2, @UdmHVH1, @UdmHVH2, @UdmLV, @Phase
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
  } finally {
    await pool.close();
  }
};
```

### 2.5. Cập nhật hàm `update`

Cần thêm `Phase` vào phần UPDATE:

```javascript
exports.update = async (id, data) => {
  const pool = await db.getConnection();
  try {
    const dbData = mapToDbFormat(data);
    
    const request = pool.request();
    request.input('Id', sql.Int, id);
    
    // Chỉ thêm input cho các trường có trong data
    const updates = [];
    
    if (dbData.CongSuat !== undefined) {
      request.input('CongSuat', sql.Int, dbData.CongSuat);
      updates.push('CongSuat = @CongSuat');
    }
    if (dbData.SoMay !== undefined) {
      request.input('SoMay', sql.NVarChar(50), dbData.SoMay);
      updates.push('SoMay = @SoMay');
    }
    // ... các trường khác
    
    // ✅ THÊM PHẦN NÀY
    if (dbData.Phase !== undefined) {
      request.input('Phase', sql.NChar(1), dbData.Phase);
      updates.push('Phase = @Phase');
    }
    
    if (updates.length === 0) {
      throw new Error('No fields to update');
    }
    
    const result = await request.query(`
      UPDATE TSMay
      SET ${updates.join(', ')}
      OUTPUT INSERTED.*
      WHERE id = @Id
    `);
    
    if (result.recordset.length === 0) {
      return null;
    }
    
    return mapToApiFormat(result.recordset[0]);
  } finally {
    await pool.close();
  }
};
```

### 2.6. Cập nhật hàm `search` để hỗ trợ filter theo Phase

**TRƯỚC:**
```javascript
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

**SAU:**
```javascript
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
    // ✅ THÊM PHẦN NÀY
    if (criteria.phase) {
      request.input('Phase', sql.NChar(1), criteria.phase);
      conditions.push('Phase = @Phase');
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

## Bước 3: Cập Nhật Controller (`tsmay.controller.js`)

### 3.1. Cập nhật hàm `search` để nhận query parameter `phase`

**TRƯỚC:**
```javascript
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

**SAU:**
```javascript
exports.search = async (req, res) => {
  try {
    const criteria = {
      soMay: req.query.soMay,
      sbb: req.query.sbb,
      lsx: req.query.lsx,
      congSuat: req.query.congSuat ? parseInt(req.query.congSuat) : undefined,
      phase: req.query.phase  // ✅ THÊM DÒNG NÀY
    };
    
    const result = await tsMayService.search(criteria);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error searching TSMay:', error);
    res.status(500).json({ error: error.message });
  }
};
```

## Bước 4: Cập Nhật Validator (`tsmay.validator.js`)

### 4.1. Thêm validation cho Phase

**TRƯỚC:**
```javascript
function validateTSMay(data) {
  const errors = [];
  
  // Validation logic...
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}
```

**SAU:**
```javascript
function validateTSMay(data) {
  const errors = [];
  
  // Validation logic hiện có...
  
  // ✅ THÊM VALIDATION CHO PHASE
  if (data.phase !== undefined && data.phase !== null) {
    if (data.phase !== '1' && data.phase !== '3') {
      errors.push('Phase phải là "1" (1 pha) hoặc "3" (3 pha)');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}
```

## Bước 5: Cập Nhật API Documentation

### 5.1. Request Example với Phase

**POST `/api/tsmay` - Tạo một bản ghi**

```json
{
  "congSuat": 37.5,
  "soMay": "T00034421",
  "sbb": "2520694",
  "lsx": "50000026",
  "tChuanLSX": "DLVN-62",
  "tbkt": "24216T",
  "po": "91",
  "io": "1.04",
  "pk75H1": "414",
  "pk75H2": null,
  "uk75H1": "2.08",
  "uk75H2": null,
  "udmHVH1": "12.7",
  "udmHVH2": null,
  "udmLV": "0.23",
  "phase": "1"
}
```

**Response:**
```json
{
  "id": 1,
  "congSuat": 37.5,
  "soMay": "T00034421",
  "sbb": "2520694",
  "lsx": "50000026",
  "tChuanLSX": "DLVN-62",
  "tbkt": "24216T",
  "po": "91",
  "io": "1.04",
  "pk75H1": "414",
  "pk75H2": null,
  "uk75H1": "2.08",
  "uk75H2": null,
  "udmHVH1": "12.7",
  "udmHVH2": null,
  "udmLV": "0.23",
  "phase": "1"
}
```

### 5.2. Search với Phase

**GET `/api/tsmay/search?phase=1`** - Lấy tất cả dữ liệu 1 pha

**GET `/api/tsmay/search?phase=3`** - Lấy tất cả dữ liệu 3 pha

**GET `/api/tsmay/search?soMay=T00034421&phase=1`** - Tìm kiếm kết hợp

## Bước 6: Testing

### 6.1. Test Create với Phase

```bash
curl -X POST http://localhost:3000/api/tsmay \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "congSuat": 37.5,
    "soMay": "T00034421",
    "sbb": "2520694",
    "lsx": "50000026",
    "tChuanLSX": "DLVN-62",
    "tbkt": "24216T",
    "po": "91",
    "io": "1.04",
    "udmLV": "0.23",
    "phase": "1"
  }'
```

### 6.2. Test Bulk Create với Phase

```bash
curl -X POST http://localhost:3000/api/tsmay/bulk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "items": [
      {
        "congSuat": 37.5,
        "soMay": "T00034421",
        "sbb": "2520694",
        "lsx": "50000026",
        "tChuanLSX": "DLVN-62",
        "tbkt": "24216T",
        "po": "91",
        "io": "1.04",
        "udmLV": "0.23",
        "phase": "1"
      },
      {
        "congSuat": 100,
        "soMay": "T00034432",
        "sbb": "2520718",
        "lsx": "50000029",
        "tChuanLSX": "DLVN-62",
        "tbkt": "24219T",
        "po": "180",
        "io": "0.60",
        "udmLV": "0.23",
        "phase": "3"
      }
    ]
  }'
```

### 6.3. Test Search với Phase

```bash
# Lấy tất cả dữ liệu 1 pha
curl -X GET "http://localhost:3000/api/tsmay/search?phase=1" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Lấy tất cả dữ liệu 3 pha
curl -X GET "http://localhost:3000/api/tsmay/search?phase=3" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Checklist

- [ ] Đã chạy SQL script để thêm cột Phase
- [ ] Đã cập nhật `mapToDbFormat` để thêm Phase
- [ ] Đã cập nhật `mapToApiFormat` để thêm Phase
- [ ] Đã cập nhật `create` function
- [ ] Đã cập nhật `bulkCreate` function
- [ ] Đã cập nhật `update` function
- [ ] Đã cập nhật `search` function
- [ ] Đã cập nhật controller `search`
- [ ] Đã cập nhật validator
- [ ] Đã test create với phase
- [ ] Đã test bulk create với phase
- [ ] Đã test search với phase filter

## Lưu Ý

1. **Backward Compatibility**: Các request không có `phase` vẫn hoạt động (sẽ lưu `null`)
2. **Default Value**: Nếu không có `phase`, có thể set default là `'3'` trong database
3. **Validation**: Phase chỉ chấp nhận `'1'` hoặc `'3'`
4. **Index**: Đã có index trên cột Phase để tối ưu truy vấn

## Troubleshooting

### Lỗi: "Invalid column name 'Phase'"
- **Nguyên nhân**: Chưa chạy SQL script
- **Giải pháp**: Chạy file `TSMay_1Pha_SQL_Script.sql`

### Lỗi: "The INSERT statement conflicted with the CHECK constraint"
- **Nguyên nhân**: Phase không phải '1' hoặc '3'
- **Giải pháp**: Kiểm tra validation và đảm bảo chỉ gửi '1' hoặc '3'

### Lỗi: "Cannot insert the value NULL into column 'Phase'"
- **Nguyên nhân**: Cột Phase có NOT NULL constraint
- **Giải pháp**: Thêm default value hoặc luôn gửi phase trong request

