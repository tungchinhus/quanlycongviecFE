/**
 * TSMay Service - Updated với hỗ trợ Phase (1 Pha / 3 Pha)
 * 
 * Hướng dẫn sử dụng:
 * 1. Copy toàn bộ nội dung file này
 * 2. Thay thế file tsmay.service.js hiện tại
 * 3. Đảm bảo đã chạy SQL script để thêm cột Phase
 */

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
    UdmLV: data.udmLV || null,
    Phase: data.phase || null  // ✅ THÊM: Hỗ trợ Phase
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
    udmLV: row.UdmLV,
    phase: row.Phase  // ✅ THÊM: Hỗ trợ Phase
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
    request.input('Phase', sql.NChar(1), dbData.Phase);  // ✅ THÊM
    
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
        request.input('Phase', sql.NChar(1), dbData.Phase);  // ✅ THÊM
        
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

// Lấy tất cả
exports.getAll = async () => {
  const pool = await db.getConnection();
  try {
    const result = await pool.request().query(`
      SELECT * FROM TSMay 
      ORDER BY id DESC
    `);
    
    return result.recordset.map(mapToApiFormat);
  } finally {
    await pool.close();
  }
};

// Lấy theo ID
exports.getById = async (id) => {
  const pool = await db.getConnection();
  try {
    const request = pool.request();
    request.input('Id', sql.Int, id);
    
    const result = await request.query(`
      SELECT * FROM TSMay WHERE id = @Id
    `);
    
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
    
    const request = pool.request();
    request.input('Id', sql.Int, id);
    
    const updates = [];
    
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
    if (dbData.LSX !== undefined) {
      request.input('LSX', sql.NVarChar(50), dbData.LSX);
      updates.push('LSX = @LSX');
    }
    if (dbData.TChuanLSX !== undefined) {
      request.input('TChuanLSX', sql.NVarChar(50), dbData.TChuanLSX);
      updates.push('TChuanLSX = @TChuanLSX');
    }
    if (dbData.TBKT !== undefined) {
      request.input('TBKT', sql.NChar(10), dbData.TBKT);
      updates.push('TBKT = @TBKT');
    }
    if (dbData.Po !== undefined) {
      request.input('Po', sql.NChar(10), dbData.Po);
      updates.push('Po = @Po');
    }
    if (dbData.Io !== undefined) {
      request.input('Io', sql.NChar(10), dbData.Io);
      updates.push('Io = @Io');
    }
    if (dbData.Pk75H1 !== undefined) {
      request.input('Pk75H1', sql.NChar(10), dbData.Pk75H1);
      updates.push('Pk75H1 = @Pk75H1');
    }
    if (dbData.Pk75H2 !== undefined) {
      request.input('Pk75H2', sql.NChar(10), dbData.Pk75H2);
      updates.push('Pk75H2 = @Pk75H2');
    }
    if (dbData.Uk75H1 !== undefined) {
      request.input('Uk75H1', sql.NChar(10), dbData.Uk75H1);
      updates.push('Uk75H1 = @Uk75H1');
    }
    if (dbData.Uk75H2 !== undefined) {
      request.input('Uk75H2', sql.NChar(10), dbData.Uk75H2);
      updates.push('Uk75H2 = @Uk75H2');
    }
    if (dbData.UdmHVH1 !== undefined) {
      request.input('UdmHVH1', sql.NChar(10), dbData.UdmHVH1);
      updates.push('UdmHVH1 = @UdmHVH1');
    }
    if (dbData.UdmHVH2 !== undefined) {
      request.input('UdmHVH2', sql.NChar(10), dbData.UdmHVH2);
      updates.push('UdmHVH2 = @UdmHVH2');
    }
    if (dbData.UdmLV !== undefined) {
      request.input('UdmLV', sql.NChar(10), dbData.UdmLV);
      updates.push('UdmLV = @UdmLV');
    }
    if (dbData.Phase !== undefined) {  // ✅ THÊM
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

// Xóa
exports.delete = async (id) => {
  const pool = await db.getConnection();
  try {
    const request = pool.request();
    request.input('Id', sql.Int, id);
    
    const result = await request.query(`
      DELETE FROM TSMay 
      OUTPUT DELETED.id
      WHERE id = @Id
    `);
    
    return result.recordset.length > 0;
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
    if (criteria.phase) {  // ✅ THÊM: Hỗ trợ filter theo Phase
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

