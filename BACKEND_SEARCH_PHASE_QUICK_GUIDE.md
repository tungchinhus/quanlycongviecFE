# Hướng Dẫn Nhanh: Cập Nhật Backend Search với Phase Filter

## Tổng Quan

Hướng dẫn này tập trung vào việc cập nhật endpoint `/api/tsmay/search` để hỗ trợ filter theo `phase` (1 pha hoặc 3 pha).

## Bước 1: Đảm Bảo Database Đã Có Cột Phase

Chạy SQL script trước:
```sql
-- File: TSMay_1Pha_SQL_Script.sql
-- Đảm bảo cột Phase đã được thêm vào bảng TSMay
```

## Bước 2: Cập Nhật Service (`tsmay.service.js`)

### 2.1. Cập nhật hàm `search`

Tìm hàm `search` và cập nhật như sau:

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

**SAU (Thêm Phase Filter):**
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

### 2.2. Đảm bảo hàm `mapToApiFormat` đã có Phase

Kiểm tra hàm `mapToApiFormat` đã có:
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
    phase: row.Phase  // ✅ Đảm bảo có dòng này
  };
}
```

## Bước 3: Cập Nhật Controller (`tsmay.controller.js`)

### 3.1. Cập nhật hàm `search`

Tìm hàm `search` trong controller và cập nhật:

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

## Bước 4: Testing

### 4.1. Test Search với Phase = 1

```bash
curl -X GET "http://localhost:3000/api/tsmay/search?phase=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
[
  {
    "id": 1,
    "congSuat": 37.5,
    "soMay": "T00034421",
    "sbb": "2520694",
    "lsx": "50000026",
    "tChuanLSX": "DLVN-62",
    "tbkt": "24216T",
    "phase": "1",
    ...
  },
  ...
]
```

### 4.2. Test Search với Phase = 3

```bash
curl -X GET "http://localhost:3000/api/tsmay/search?phase=3" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4.3. Test Search kết hợp Phase và các filter khác

```bash
# Tìm kiếm 1 pha với số máy cụ thể
curl -X GET "http://localhost:3000/api/tsmay/search?phase=1&soMay=T00034421" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Tìm kiếm 3 pha với công suất
curl -X GET "http://localhost:3000/api/tsmay/search?phase=3&congSuat=100" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4.4. Test Search không có Phase (hiển thị tất cả)

```bash
curl -X GET "http://localhost:3000/api/tsmay/search" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Bước 5: Kiểm Tra Frontend

Sau khi cập nhật backend, frontend sẽ tự động hoạt động vì:
- Frontend đã được cập nhật để gửi `phase` parameter
- Service đã được cập nhật để hỗ trợ `phase` trong search

## Checklist

- [ ] Đã chạy SQL script để thêm cột Phase
- [ ] Đã cập nhật hàm `search` trong service để hỗ trợ `criteria.phase`
- [ ] Đã cập nhật controller để nhận `req.query.phase`
- [ ] Đã test search với `phase=1`
- [ ] Đã test search với `phase=3`
- [ ] Đã test search không có phase (hiển thị tất cả)
- [ ] Đã test search kết hợp phase với các filter khác

## Code Mẫu Hoàn Chỉnh

### Service (`tsmay.service.js` - Chỉ phần search)

```javascript
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

### Controller (`tsmay.controller.js` - Chỉ phần search)

```javascript
// Tìm kiếm
exports.search = async (req, res) => {
  try {
    const criteria = {
      soMay: req.query.soMay,
      sbb: req.query.sbb,
      lsx: req.query.lsx,
      congSuat: req.query.congSuat ? parseInt(req.query.congSuat) : undefined,
      phase: req.query.phase
    };
    
    const result = await tsMayService.search(criteria);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error searching TSMay:', error);
    res.status(500).json({ error: error.message });
  }
};
```

## Lưu Ý

1. **Validation**: Phase chỉ chấp nhận giá trị `'1'` hoặc `'3'`
2. **Null Phase**: Nếu không có phase parameter, sẽ trả về tất cả dữ liệu (cả 1 pha và 3 pha)
3. **Performance**: Đã có index trên cột Phase để tối ưu truy vấn
4. **Backward Compatibility**: Code cũ vẫn hoạt động nếu không gửi phase parameter

## Troubleshooting

### Lỗi: "Invalid column name 'Phase'"
- **Nguyên nhân**: Chưa chạy SQL script
- **Giải pháp**: Chạy file `TSMay_1Pha_SQL_Script.sql`

### Lỗi: "Cannot read property 'phase' of undefined"
- **Nguyên nhân**: Controller chưa được cập nhật
- **Giải pháp**: Thêm `phase: req.query.phase` vào criteria object

### Không filter được theo phase
- **Nguyên nhân**: Service chưa xử lý phase trong WHERE clause
- **Giải pháp**: Kiểm tra lại hàm `search` trong service

## Kết Luận

Sau khi hoàn thành các bước trên, endpoint `/api/tsmay/search` sẽ hỗ trợ filter theo phase:
- `GET /api/tsmay/search?phase=1` → Chỉ dữ liệu 1 pha
- `GET /api/tsmay/search?phase=3` → Chỉ dữ liệu 3 pha
- `GET /api/tsmay/search` → Tất cả dữ liệu

Frontend đã sẵn sàng sử dụng tính năng này!

