/**
 * TSMay Search Function - Updated với hỗ trợ Pagination, Search Text và Phase Filter
 * 
 * Hướng dẫn sử dụng:
 * 1. Copy hàm search từ file này
 * 2. Thay thế hàm search trong file tsmay.service.js hiện tại
 * 
 * Response Format:
 * {
 *   data: [...],
 *   total: 42502,
 *   page: 0,
 *   pageSize: 10
 * }
 */

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
    
    // Validate pagination
    if (isNaN(page) || page < 0) {
      throw new Error('Invalid page parameter');
    }
    if (isNaN(pageSize) || pageSize < 1 || pageSize > 1000) {
      throw new Error('Invalid pageSize parameter (1-1000)');
    }
    
    // ✅ COUNT TOTAL: Đếm tổng số records (trước khi pagination)
    const countResult = await request.query(`
      SELECT COUNT(*) as Total
      FROM TSMay 
      ${whereClause}
    `);
    const total = countResult.recordset[0].Total;
    
    // ✅ FETCH DATA: Lấy dữ liệu với pagination
    // Lưu ý: OFFSET/FETCH chỉ hỗ trợ từ SQL Server 2012+
    // Nếu dùng SQL Server cũ hơn, sử dụng ROW_NUMBER() (xem code thay thế bên dưới)
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

/**
 * ALTERNATIVE: Nếu SQL Server < 2012, sử dụng ROW_NUMBER() thay vì OFFSET/FETCH
 * 
 * Thay thế phần FETCH DATA bằng code sau:
 */
/*
const result = await request.query(`
  SELECT * FROM (
    SELECT *, ROW_NUMBER() OVER (ORDER BY id DESC) as RowNum
    FROM TSMay
    ${whereClause}
  ) AS T
  WHERE RowNum > ${offset} AND RowNum <= ${offset + pageSize}
`);
*/
