/**
 * TSMay Validator - Updated với validation cho Phase
 * 
 * Hướng dẫn sử dụng:
 * 1. Copy phần validateTSMay function từ file này
 * 2. Thay thế function validateTSMay trong file tsmay.validator.js hiện tại
 */

// ✅ CẬP NHẬT: Validation cho TSMay với Phase
function validateTSMay(data) {
  const errors = [];
  
  // Validation cho Phase
  if (data.phase !== undefined && data.phase !== null) {
    if (data.phase !== '1' && data.phase !== '3') {
      errors.push('Phase phải là "1" (1 pha) hoặc "3" (3 pha)');
    }
  }
  
  // Các validation khác (giữ nguyên logic hiện có)
  // Ví dụ:
  // if (data.congSuat !== undefined && data.congSuat !== null) {
  //   if (isNaN(data.congSuat) || data.congSuat < 0) {
  //     errors.push('Công suất phải là số dương');
  //   }
  // }
  
  // if (data.soMay && data.soMay.length > 50) {
  //   errors.push('Số máy không được vượt quá 50 ký tự');
  // }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

// Validation cho Bulk Create
function validateBulkTSMay(data) {
  const errors = [];
  
  if (!data.items || !Array.isArray(data.items)) {
    errors.push('Items phải là một mảng');
    return {
      isValid: false,
      errors: errors
    };
  }
  
  if (data.items.length === 0) {
    errors.push('Items không được rỗng');
    return {
      isValid: false,
      errors: errors
    };
  }
  
  // Validate từng item
  data.items.forEach((item, index) => {
    const itemValidation = validateTSMay(item);
    if (!itemValidation.isValid) {
      itemValidation.errors.forEach(error => {
        errors.push(`Item ${index + 1}: ${error}`);
      });
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

module.exports = {
  validateTSMay,
  validateBulkTSMay
};

