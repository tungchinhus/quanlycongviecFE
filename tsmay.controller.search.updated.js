/**
 * TSMay Controller Search Function - Updated với hỗ trợ Phase Filter
 * 
 * Hướng dẫn sử dụng:
 * 1. Copy hàm search từ file này
 * 2. Thay thế hàm search trong file tsmay.controller.js hiện tại
 */

// ✅ CẬP NHẬT: Tìm kiếm với hỗ trợ Phase Filter
exports.search = async (req, res) => {
  try {
    // Tạo criteria object từ query parameters
    const criteria = {
      soMay: req.query.soMay,
      sbb: req.query.sbb,
      lsx: req.query.lsx,
      congSuat: req.query.congSuat ? parseInt(req.query.congSuat) : undefined,
      phase: req.query.phase  // ✅ THÊM: Hỗ trợ filter theo Phase
    };
    
    // Gọi service để tìm kiếm
    const result = await tsMayService.search(criteria);
    
    // Trả về kết quả
    res.status(200).json(result);
  } catch (error) {
    console.error('Error searching TSMay:', error);
    res.status(500).json({ error: error.message });
  }
};

