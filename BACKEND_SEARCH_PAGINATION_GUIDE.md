# Hướng Dẫn: Cập Nhật Backend Search với Pagination và Search Text

## Tổng Quan

Hướng dẫn này tập trung vào việc cập nhật endpoint `/api/tsmay/search` để hỗ trợ:
- **Search text tổng quát**: Tìm kiếm trong nhiều cột (soMay, sbb, lsx, tChuanLSX, tbkt, congSuat)
- **Pagination**: Phân trang dữ liệu với `page` và `pageSize`
- **Phase filter**: Filter theo 1 pha hoặc 3 pha (đã có sẵn)

## Response Format

Backend sẽ trả về format mới:
```json
{
  "data": [...],
  "total": 42502,
  "page": 0,
  "pageSize": 10
}
```

Thay vì chỉ trả về array `[...]` như trước.

---

## Bước 1: Cập Nhật Service (`tsmay.service.js`)

### 1.1. Cập nhật hàm `search` với Pagination và Search Text

Tìm hàm `search` và thay thế bằng code sau:

```javascript
// Tìm kiếm với hỗ trợ Pagination, Search Text và Phase Filter
exports.search = async (criteria) => {
  const pool = await db.getConnection();
  try {
    const conditions = [];
    const request = pool.request();
    
    // ✅ SEARCH TEXT: Tìm kiếm tổng quát trong nhiều cột
    if (criteria.search) {
      const searchTerm = `%${criteria.search}%`;
      request.input('SearchTerm', sql.NVarChar(255), searchTerm);
      conditions.push(`(
        SoMay LIKE @SearchTerm OR
        SBB LIKE @SearchTerm OR
        LSX LIKE @SearchTerm OR
        TChuanLSX LIKE @SearchTerm OR
        TBKT LIKE @SearchTerm OR
        CAST(CongSuat AS NVARCHAR) LIKE @SearchTerm
      )`);
    }
    
    // Filter theo Số máy (nếu có, ưu tiên hơn search text)
    if (criteria.soMay) {
      request.input('SoMay', sql.NVarChar(50), criteria.soMay);
      conditions.push('SoMay = @SoMay');
    }
    
    // Filter theo SBB
    if (criteria.sbb) {
      request.input('SBB', sql.NVarChar(50), criteria.sbb);
      conditions.push('SBB = @SBB');
    }
    
    // Filter theo LSX
    if (criteria.lsx) {
      request.input('LSX', sql.NVarChar(50), criteria.lsx);
      conditions.push('LSX = @LSX');
    }
    
    // Filter theo Công suất
    if (criteria.congSuat !== undefined) {
      request.input('CongSuat', sql.Int, criteria.congSuat);
      conditions.push('CongSuat = @CongSuat');
    }
    
    // ✅ PHASE FILTER: Filter theo Phase (1 pha hoặc 3 pha)
    if (criteria.phase) {
      request.input('Phase', sql.NChar(1), criteria.phase);
      conditions.push('Phase = @Phase');
    }
    
    // Tạo WHERE clause
    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}`
      : '';
    
    // ✅ PAGINATION: Tính toán OFFSET và FETCH
    const page = criteria.page !== undefined ? parseInt(criteria.page) : 0;
    const pageSize = criteria.pageSize !== undefined ? parseInt(criteria.pageSize) : 10;
    const offset = page * pageSize;
    
    // ✅ COUNT TOTAL: Đếm tổng số records (trước khi pagination)
    const countResult = await request.query(`
      SELECT COUNT(*) as Total
      FROM TSMay 
      ${whereClause}
    `);
    const total = countResult.recordset[0].Total;
    
    // ✅ FETCH DATA: Lấy dữ liệu với pagination
    const result = await request.query(`
      SELECT * FROM TSMay 
      ${whereClause}
      ORDER BY id DESC
      OFFSET ${offset} ROWS
      FETCH NEXT ${pageSize} ROWS ONLY
    `);
    
    // Map kết quả về format API
    const data = result.recordset.map(mapToApiFormat);
    
    // ✅ RETURN FORMAT MỚI: Trả về object với data, total, page, pageSize
    return {
      data: data,
      total: total,
      page: page,
      pageSize: pageSize
    };
  } finally {
    await pool.close();
  }
};
```

### 1.2. Lưu ý về SQL Injection

Để tránh SQL Injection, nên sử dụng parameterized query cho OFFSET và FETCH:

```javascript
// Cách an toàn hơn (nếu SQL Server hỗ trợ)
request.input('Offset', sql.Int, offset);
request.input('PageSize', sql.Int, pageSize);

const result = await request.query(`
  SELECT * FROM TSMay 
  ${whereClause}
  ORDER BY id DESC
  OFFSET @Offset ROWS
  FETCH NEXT @PageSize ROWS ONLY
`);
```

Tuy nhiên, vì `offset` và `pageSize` là số nguyên được validate ở controller, cách trên cũng an toàn.

---

## Bước 2: Cập Nhật Controller (`tsmay.controller.js`)

### 2.1. Cập nhật hàm `search`

Tìm hàm `search` trong controller và cập nhật:

```javascript
// ✅ CẬP NHẬT: Tìm kiếm với hỗ trợ Search Text, Pagination và Phase Filter
exports.search = async (req, res) => {
  try {
    // Tạo criteria object từ query parameters
    const criteria = {
      // ✅ SEARCH TEXT: Tìm kiếm tổng quát
      search: req.query.search,
      
      // Các filter cụ thể (ưu tiên hơn search text)
      soMay: req.query.soMay,
      sbb: req.query.sbb,
      lsx: req.query.lsx,
      congSuat: req.query.congSuat ? parseInt(req.query.congSuat) : undefined,
      
      // ✅ PHASE FILTER
      phase: req.query.phase,
      
      // ✅ PAGINATION
      page: req.query.page ? parseInt(req.query.page) : 0,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize) : 10
    };
    
    // Validate pagination params
    if (criteria.page < 0) {
      criteria.page = 0;
    }
    if (criteria.pageSize < 1 || criteria.pageSize > 1000) {
      criteria.pageSize = 10; // Default hoặc max 1000
    }
    
    // Gọi service để tìm kiếm
    const result = await tsMayService.search(criteria);
    
    // Trả về kết quả với format mới
    res.status(200).json(result);
  } catch (error) {
    console.error('Error searching TSMay:', error);
    res.status(500).json({ error: error.message });
  }
};
```

---

## Bước 3: Testing

### 3.1. Test Search với Pagination

```bash
# Search với pagination (trang đầu, 10 items)
curl -X GET "http://localhost:3000/api/tsmay/search?search=100&page=0&pageSize=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "data": [
    {
      "id": 1,
      "congSuat": 100,
      "soMay": "T00033422-1",
      "sbb": "2520720",
      "lsx": "50000029",
      "tChuanLSX": "DLVN-62",
      "tbkt": "24225B",
      "phase": "3",
      ...
    },
    ...
  ],
  "total": 42502,
  "page": 0,
  "pageSize": 10
}
```

### 3.2. Test Search Text

```bash
# Tìm kiếm text "T000" trong nhiều cột
curl -X GET "http://localhost:3000/api/tsmay/search?search=T000&page=0&pageSize=25" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Tìm kiếm text "DLVN" (trong TChuanLSX)
curl -X GET "http://localhost:3000/api/tsmay/search?search=DLVN&page=0&pageSize=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3.3. Test Search kết hợp Phase và Pagination

```bash
# Tìm kiếm 1 pha với search text, trang 2, 50 items/trang
curl -X GET "http://localhost:3000/api/tsmay/search?search=100&phase=1&page=1&pageSize=50" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Tìm kiếm 3 pha với search text
curl -X GET "http://localhost:3000/api/tsmay/search?search=DLVN&phase=3&page=0&pageSize=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3.4. Test Pagination

```bash
# Trang đầu (page 0)
curl -X GET "http://localhost:3000/api/tsmay/search?page=0&pageSize=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Trang 2 (page 1)
curl -X GET "http://localhost:3000/api/tsmay/search?page=1&pageSize=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Trang 3 với 25 items/trang
curl -X GET "http://localhost:3000/api/tsmay/search?page=2&pageSize=25" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3.5. Test không có params (default)

```bash
# Không có params → trả về trang đầu, 10 items
curl -X GET "http://localhost:3000/api/tsmay/search" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Bước 4: Tối Ưu Performance

### 4.1. Thêm Index cho các cột thường search

```sql
-- Index cho các cột thường được search
CREATE INDEX IX_TSMay_SoMay ON TSMay(SoMay);
CREATE INDEX IX_TSMay_SBB ON TSMay(SBB);
CREATE INDEX IX_TSMay_LSX ON TSMay(LSX);
CREATE INDEX IX_TSMay_TChuanLSX ON TSMay(TChuanLSX);
CREATE INDEX IX_TSMay_TBKT ON TSMay(TBKT);
CREATE INDEX IX_TSMay_Phase ON TSMay(Phase);
CREATE INDEX IX_TSMay_CongSuat ON TSMay(CongSuat);

-- Composite index cho Phase + các cột thường search
CREATE INDEX IX_TSMay_Phase_SoMay ON TSMay(Phase, SoMay);
```

### 4.2. Full-Text Search (Tùy chọn - nâng cao)

Nếu cần tìm kiếm phức tạp hơn, có thể sử dụng Full-Text Search:

```sql
-- Tạo Full-Text Catalog (chỉ cần làm 1 lần)
CREATE FULLTEXT CATALOG TSMayFullTextCatalog;

-- Tạo Full-Text Index
CREATE FULLTEXT INDEX ON TSMay(
  SoMay, SBB, LSX, TChuanLSX, TBKT
) KEY INDEX PK_TSMay ON TSMayFullTextCatalog;

-- Sử dụng trong query
SELECT * FROM TSMay
WHERE CONTAINS((SoMay, SBB, LSX, TChuanLSX, TBKT), @SearchTerm)
```

---

## Bước 5: Validation và Error Handling

### 5.1. Thêm validation trong Controller

```javascript
exports.search = async (req, res) => {
  try {
    // Validate page
    const page = req.query.page ? parseInt(req.query.page) : 0;
    if (isNaN(page) || page < 0) {
      return res.status(400).json({ error: 'Invalid page parameter' });
    }
    
    // Validate pageSize
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize) : 10;
    if (isNaN(pageSize) || pageSize < 1 || pageSize > 1000) {
      return res.status(400).json({ error: 'Invalid pageSize parameter (1-1000)' });
    }
    
    // Validate phase (nếu có)
    if (req.query.phase && !['1', '3'].includes(req.query.phase)) {
      return res.status(400).json({ error: 'Invalid phase parameter (must be 1 or 3)' });
    }
    
    const criteria = {
      search: req.query.search,
      soMay: req.query.soMay,
      sbb: req.query.sbb,
      lsx: req.query.lsx,
      congSuat: req.query.congSuat ? parseInt(req.query.congSuat) : undefined,
      phase: req.query.phase,
      page: page,
      pageSize: pageSize
    };
    
    const result = await tsMayService.search(criteria);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error searching TSMay:', error);
    res.status(500).json({ error: error.message });
  }
};
```

---

## Checklist

- [ ] Đã cập nhật hàm `search` trong service để hỗ trợ search text
- [ ] Đã cập nhật hàm `search` trong service để hỗ trợ pagination (OFFSET/FETCH)
- [ ] Đã cập nhật hàm `search` trong service để trả về format mới `{ data, total, page, pageSize }`
- [ ] Đã cập nhật controller để nhận `req.query.search`, `req.query.page`, `req.query.pageSize`
- [ ] Đã thêm validation cho pagination params
- [ ] Đã test search với text
- [ ] Đã test pagination
- [ ] Đã test search kết hợp phase và pagination
- [ ] Đã thêm index cho các cột thường search (tùy chọn nhưng khuyến nghị)

---

## Code Mẫu Hoàn Chỉnh

### Service (`tsmay.service.js` - Chỉ phần search)

```javascript
// Tìm kiếm với hỗ trợ Pagination, Search Text và Phase Filter
exports.search = async (criteria) => {
  const pool = await db.getConnection();
  try {
    const conditions = [];
    const request = pool.request();
    
    // Search Text: Tìm kiếm tổng quát
    if (criteria.search) {
      const searchTerm = `%${criteria.search}%`;
      request.input('SearchTerm', sql.NVarChar(255), searchTerm);
      conditions.push(`(
        SoMay LIKE @SearchTerm OR
        SBB LIKE @SearchTerm OR
        LSX LIKE @SearchTerm OR
        TChuanLSX LIKE @SearchTerm OR
        TBKT LIKE @SearchTerm OR
        CAST(CongSuat AS NVARCHAR) LIKE @SearchTerm
      )`);
    }
    
    // Filter cụ thể (ưu tiên hơn search text)
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
    
    // Pagination
    const page = criteria.page !== undefined ? parseInt(criteria.page) : 0;
    const pageSize = criteria.pageSize !== undefined ? parseInt(criteria.pageSize) : 10;
    const offset = page * pageSize;
    
    // Count total
    const countResult = await request.query(`
      SELECT COUNT(*) as Total
      FROM TSMay 
      ${whereClause}
    `);
    const total = countResult.recordset[0].Total;
    
    // Fetch data with pagination
    const result = await request.query(`
      SELECT * FROM TSMay 
      ${whereClause}
      ORDER BY id DESC
      OFFSET ${offset} ROWS
      FETCH NEXT ${pageSize} ROWS ONLY
    `);
    
    const data = result.recordset.map(mapToApiFormat);
    
    return {
      data: data,
      total: total,
      page: page,
      pageSize: pageSize
    };
  } finally {
    await pool.close();
  }
};
```

### Controller (`tsmay.controller.js` - Chỉ phần search)

```javascript
exports.search = async (req, res) => {
  try {
    // Validate và parse params
    const page = req.query.page ? parseInt(req.query.page) : 0;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize) : 10;
    
    if (isNaN(page) || page < 0) {
      return res.status(400).json({ error: 'Invalid page parameter' });
    }
    if (isNaN(pageSize) || pageSize < 1 || pageSize > 1000) {
      return res.status(400).json({ error: 'Invalid pageSize parameter (1-1000)' });
    }
    
    const criteria = {
      search: req.query.search,
      soMay: req.query.soMay,
      sbb: req.query.sbb,
      lsx: req.query.lsx,
      congSuat: req.query.congSuat ? parseInt(req.query.congSuat) : undefined,
      phase: req.query.phase,
      page: page,
      pageSize: pageSize
    };
    
    const result = await tsMayService.search(criteria);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error searching TSMay:', error);
    res.status(500).json({ error: error.message });
  }
};
```

---

## Lưu Ý

1. **Page Index**: Frontend sử dụng page index bắt đầu từ 0 (0, 1, 2, ...), backend cũng nên sử dụng 0-based
2. **Page Size**: Nên giới hạn max pageSize (ví dụ: 1000) để tránh load quá nhiều dữ liệu
3. **Performance**: Với database lớn, nên thêm index cho các cột thường search
4. **Backward Compatibility**: Nếu có code cũ đang sử dụng endpoint này, có thể giữ cả hai format (array và object) hoặc version API

---

## Troubleshooting

### Lỗi: "Invalid column name 'Phase'"
- **Nguyên nhân**: Chưa chạy SQL script để thêm cột Phase
- **Giải pháp**: Chạy file `TSMay_1Pha_SQL_Script.sql`

### Lỗi: "Incorrect syntax near 'OFFSET'"
- **Nguyên nhân**: SQL Server version cũ không hỗ trợ OFFSET/FETCH (cần SQL Server 2012+)
- **Giải pháp**: Sử dụng ROW_NUMBER() thay thế:
  ```sql
  SELECT * FROM (
    SELECT *, ROW_NUMBER() OVER (ORDER BY id DESC) as RowNum
    FROM TSMay
    ${whereClause}
  ) AS T
  WHERE RowNum > ${offset} AND RowNum <= ${offset + pageSize}
  ```

### Performance chậm
- **Nguyên nhân**: Thiếu index trên các cột search
- **Giải pháp**: Thêm index như hướng dẫn ở Bước 4

---

## Kết Luận

Sau khi hoàn thành các bước trên, endpoint `/api/tsmay/search` sẽ hỗ trợ:
- ✅ Search text tổng quát trong nhiều cột
- ✅ Pagination với `page` và `pageSize`
- ✅ Phase filter (1 pha hoặc 3 pha)
- ✅ Response format mới với `{ data, total, page, pageSize }`

Frontend đã sẵn sàng sử dụng tính năng này!

