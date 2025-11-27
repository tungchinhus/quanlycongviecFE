/**
 * TSMay Controller - Updated với hỗ trợ Phase (1 Pha / 3 Pha)
 * 
 * Hướng dẫn sử dụng:
 * 1. Copy phần search function từ file này
 * 2. Thay thế function search trong file tsmay.controller.js hiện tại
 */

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

// ✅ CẬP NHẬT: Tìm kiếm với hỗ trợ Phase
exports.search = async (req, res) => {
  try {
    const criteria = {
      soMay: req.query.soMay,
      sbb: req.query.sbb,
      lsx: req.query.lsx,
      congSuat: req.query.congSuat ? parseInt(req.query.congSuat) : undefined,
      phase: req.query.phase  // ✅ THÊM: Hỗ trợ filter theo Phase
    };
    
    const result = await tsMayService.search(criteria);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error searching TSMay:', error);
    res.status(500).json({ error: error.message });
  }
};

