/**
 * TSMay Search Function - Updated với hỗ trợ Phase Filter
 * 
 * Hướng dẫn sử dụng:
 * 1. Copy hàm search từ file này
 * 2. Thay thế hàm search trong file tsmay.service.js hiện tại
 */

// Tìm kiếm với hỗ trợ Phase Filter
exports.search = async (criteria) => {
  const pool = await db.getConnection();
  try {
    const conditions = [];
    const request = pool.request();
    
    // Filter theo Số máy
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
    
    // ✅ THÊM: Filter theo Phase (1 pha hoặc 3 pha)
    if (criteria.phase) {
      request.input('Phase', sql.NChar(1), criteria.phase);
      conditions.push('Phase = @Phase');
    }
    
    // Tạo WHERE clause
    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}`
      : '';
    
    // Thực thi query
    const result = await request.query(`
      SELECT * FROM TSMay 
      ${whereClause}
      ORDER BY id DESC
    `);
    
    // Map kết quả về format API
    return result.recordset.map(mapToApiFormat);
  } finally {
    await pool.close();
  }
};

