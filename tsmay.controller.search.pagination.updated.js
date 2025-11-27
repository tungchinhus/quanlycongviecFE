/**
 * TSMay Controller Search Function - Updated với hỗ trợ Pagination, Search Text và Phase Filter
 * 
 * Hướng dẫn sử dụng:
 * 1. Copy hàm search từ file này
 * 2. Thay thế hàm search trong file tsmay.controller.js hiện tại
 */

// ✅ CẬP NHẬT: Tìm kiếm với hỗ trợ Search Text, Pagination và Phase Filter
exports.search = async (req, res) => {
  try {
    // Validate và parse pagination params
    const page = req.query.page ? parseInt(req.query.page) : 0;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize) : 10;
    
    // Validate page
    if (isNaN(page) || page < 0) {
      return res.status(400).json({ 
        error: 'Invalid page parameter. Must be a non-negative integer.' 
      });
    }
    
    // Validate pageSize
    if (isNaN(pageSize) || pageSize < 1 || pageSize > 1000) {
      return res.status(400).json({ 
        error: 'Invalid pageSize parameter. Must be between 1 and 1000.' 
      });
    }
    
    // Validate phase (nếu có)
    if (req.query.phase && !['1', '3'].includes(req.query.phase)) {
      return res.status(400).json({ 
        error: 'Invalid phase parameter. Must be "1" or "3".' 
      });
    }
    
    // Tạo criteria object từ query parameters
    const criteria = {
      // ✅ SEARCH TEXT: Tìm kiếm tổng quát
      search: req.query.search,
      
      // Các filter cụ thể (ưu tiên hơn search text nếu có)
      soMay: req.query.soMay,
      sbb: req.query.sbb,
      lsx: req.query.lsx,
      congSuat: req.query.congSuat ? parseInt(req.query.congSuat) : undefined,
      
      // ✅ PHASE FILTER
      phase: req.query.phase,
      
      // ✅ PAGINATION
      page: page,
      pageSize: pageSize
    };
    
    // Gọi service để tìm kiếm
    const result = await tsMayService.search(criteria);
    
    // Trả về kết quả với format mới
    res.status(200).json(result);
  } catch (error) {
    console.error('Error searching TSMay:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
};
