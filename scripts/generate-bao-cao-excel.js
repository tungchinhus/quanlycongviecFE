/**
 * Script tạo file Excel mẫu báo cáo công việc PTK (cá nhân + tổng).
 * Chạy: node scripts/generate-bao-cao-excel.js
 * Output: docs/MAU_BAO_CAO_CONG_VIEC_PTK.xlsx, docs/MAU_BAO_CAO_TONG_PTK.xlsx
 */

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const HEADER_FONT = { bold: true, size: 12 };
const TITLE_FONT = { bold: true, size: 14 };
const TABLE_HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } };
const TABLE_HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' } };
const BORDER_THIN = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' }
};

function styleHeaderCell(cell, text) {
  cell.value = text;
  cell.font = TABLE_HEADER_FONT;
  cell.fill = TABLE_HEADER_FILL;
  cell.alignment = { vertical: 'middle', wrapText: true };
  cell.border = BORDER_THIN;
}

function styleDataCell(cell, value = '') {
  cell.value = value;
  cell.border = BORDER_THIN;
  cell.alignment = { vertical: 'middle', wrapText: true };
}

async function createBaoCaoCaNhan(workbook) {
  const ws = workbook.addWorksheet('Bao cao ca nhan', {
    properties: { defaultRowHeight: 22 },
    pageSetup: { orientation: 'portrait', fitToPage: true }
  });

  let r = 1;
  ws.getCell(`A${r}`).value = 'BÁO CÁO CÔNG VIỆC CÁ NHÂN';
  ws.getCell(`A${r}`).font = TITLE_FONT;
  r++;
  ws.getCell(`A${r}`).value = 'Phòng Thiết Kế — Tháng [XX] / [Năm]';
  r += 2;

  // Thông tin
  const metaLabels = ['Họ và tên', 'Chức vụ', 'Tháng báo cáo', 'Ngày lập báo cáo'];
  const metaCols = ['A', 'B'];
  ws.getCell('A' + r).value = 'Thông tin';
  ws.getCell('A' + r).font = HEADER_FONT;
  r++;
  metaLabels.forEach((label, i) => {
    ws.getCell('A' + (r + i)).value = label;
    styleDataCell(ws.getCell('B' + (r + i)), '');
  });
  r += metaLabels.length + 1;

  // 1. Tổng quan
  ws.getCell('A' + r).value = '1. TỔNG QUAN';
  ws.getCell('A' + r).font = HEADER_FONT;
  r++;
  styleHeaderCell(ws.getCell('A' + r), 'Chỉ tiêu');
  styleHeaderCell(ws.getCell('B' + r), 'Số lượng / Ghi chú');
  r++;
  ['Số công việc đã hoàn thành', 'Số công việc đang thực hiện', 'Số công việc chưa bắt đầu / tạm hoãn'].forEach((label, i) => {
    styleDataCell(ws.getCell('A' + (r + i)), label);
    styleDataCell(ws.getCell('B' + (r + i)), '');
  });
  r += 4;

  // 2. Chi tiết đã hoàn thành
  ws.getCell('A' + r).value = '2. CHI TIẾT CÔNG VIỆC ĐÃ HOÀN THÀNH';
  ws.getCell('A' + r).font = HEADER_FONT;
  r++;
  const cols2 = ['STT', 'Tên công việc', 'Mô tả ngắn', 'Kết quả / Sản phẩm', 'Ghi chú'];
  cols2.forEach((h, i) => styleHeaderCell(ws.getCell(String.fromCharCode(65 + i) + r), h));
  r++;
  for (let i = 1; i <= 5; i++) {
    styleDataCell(ws.getCell('A' + r), i);
    styleDataCell(ws.getCell('B' + r), '');
    styleDataCell(ws.getCell('C' + r), '');
    styleDataCell(ws.getCell('D' + r), '');
    styleDataCell(ws.getCell('E' + r), '');
    r++;
  }
  r++;

  // 3. Đang thực hiện
  ws.getCell('A' + r).value = '3. CÔNG VIỆC ĐANG THỰC HIỆN';
  ws.getCell('A' + r).font = HEADER_FONT;
  r++;
  const cols3 = ['STT', 'Tên công việc', 'Tiến độ (%)', 'Dự kiến hoàn thành', 'Ghi chú'];
  cols3.forEach((h, i) => styleHeaderCell(ws.getCell(String.fromCharCode(65 + i) + r), h));
  r++;
  for (let i = 1; i <= 4; i++) {
    styleDataCell(ws.getCell('A' + r), i);
    styleDataCell(ws.getCell('B' + r), '');
    styleDataCell(ws.getCell('C' + r), '');
    styleDataCell(ws.getCell('D' + r), '');
    styleDataCell(ws.getCell('E' + r), '');
    r++;
  }
  r++;

  // 4. Dự kiến tháng sau
  ws.getCell('A' + r).value = '4. CÔNG VIỆC DỰ KIẾN THÁNG SAU';
  ws.getCell('A' + r).font = HEADER_FONT;
  r++;
  const cols4 = ['STT', 'Tên công việc', 'Ưu tiên', 'Ghi chú'];
  cols4.forEach((h, i) => styleHeaderCell(ws.getCell(String.fromCharCode(65 + i) + r), h));
  r++;
  for (let i = 1; i <= 4; i++) {
    styleDataCell(ws.getCell('A' + r), i);
    styleDataCell(ws.getCell('B' + r), '');
    styleDataCell(ws.getCell('C' + r), '');
    styleDataCell(ws.getCell('D' + r), '');
    r++;
  }
  r++;

  // 5. Khó khăn / Đề xuất
  ws.getCell('A' + r).value = '5. KHÓ KHĂN / ĐỀ XUẤT';
  ws.getCell('A' + r).font = HEADER_FONT;
  r += 3;

  // 6. Ghi chú
  ws.getCell('A' + r).value = '6. GHI CHÚ THÊM';
  ws.getCell('A' + r).font = HEADER_FONT;
  r += 2;
  ws.getCell('A' + r).value = 'Người lập báo cáo (Ký, ghi rõ họ tên)';
  ws.getCell('A' + r).font = { italic: true };

  ws.getColumn(1).width = 12;
  ws.getColumn(2).width = 28;
  ws.getColumn(3).width = 22;
  ws.getColumn(4).width = 28;
  ws.getColumn(5).width = 18;
}

async function createBaoCaoTong(workbook) {
  const ws = workbook.addWorksheet('Bao cao tong', {
    properties: { defaultRowHeight: 22 },
    pageSetup: { orientation: 'portrait', fitToPage: true }
  });

  let r = 1;
  ws.getCell(`A${r}`).value = 'BÁO CÁO TỔNG CÔNG VIỆC';
  ws.getCell(`A${r}`).font = TITLE_FONT;
  r++;
  ws.getCell(`A${r}`).value = 'Phòng Thiết Kế — Tháng [XX] / [Năm]';
  r += 2;

  // Thông tin
  ws.getCell('A' + r).value = 'Thông tin';
  ws.getCell('A' + r).font = HEADER_FONT;
  r++;
  [
    ['Đơn vị', 'Phòng Thiết Kế'],
    ['Tháng / Năm báo cáo', ''],
    ['Ngày lập báo cáo', ''],
    ['Người lập báo cáo tổng', '']
  ].forEach(([label, val], i) => {
    styleDataCell(ws.getCell('A' + (r + i)), label);
    styleDataCell(ws.getCell('B' + (r + i)), val);
  });
  r += 5;

  // 1. Tổng quan toàn phòng
  ws.getCell('A' + r).value = '1. TỔNG QUAN TOÀN PHÒNG';
  ws.getCell('A' + r).font = HEADER_FONT;
  r++;
  styleHeaderCell(ws.getCell('A' + r), 'Chỉ tiêu');
  styleHeaderCell(ws.getCell('B' + r), 'Số lượng / Ghi chú');
  r++;
  [
    'Số nhân sự đã nộp báo cáo',
    'Tổng số công việc đã hoàn thành',
    'Tổng số công việc đang thực hiện',
    'Tổng số công việc chưa bắt đầu / tạm hoãn'
  ].forEach((label, i) => {
    styleDataCell(ws.getCell('A' + (r + i)), label);
    styleDataCell(ws.getCell('B' + (r + i)), '');
  });
  r += 5;

  // 2. Tổng hợp theo từng cá nhân
  ws.getCell('A' + r).value = '2. TỔNG HỢP THEO TỪNG CÁ NHÂN';
  ws.getCell('A' + r).font = HEADER_FONT;
  r++;
  const h2 = ['STT', 'Họ và tên', 'Đã hoàn thành', 'Đang thực hiện', 'Chưa/Tạm hoãn', 'Ghi chú'];
  h2.forEach((h, i) => styleHeaderCell(ws.getCell(String.fromCharCode(65 + i) + r), h));
  r++;
  for (let i = 1; i <= 6; i++) {
    styleDataCell(ws.getCell('A' + r), i);
    styleDataCell(ws.getCell('B' + r), '');
    styleDataCell(ws.getCell('C' + r), '');
    styleDataCell(ws.getCell('D' + r), '');
    styleDataCell(ws.getCell('E' + r), '');
    styleDataCell(ws.getCell('F' + r), '');
    r++;
  }
  r++;

  // 3. Chi tiết đã hoàn thành (toàn phòng)
  ws.getCell('A' + r).value = '3. CHI TIẾT CÔNG VIỆC ĐÃ HOÀN THÀNH (TOÀN PHÒNG)';
  ws.getCell('A' + r).font = HEADER_FONT;
  r++;
  const h3 = ['STT', 'Người phụ trách', 'Tên công việc', 'Mô tả ngắn', 'Kết quả / Sản phẩm', 'Ghi chú'];
  h3.forEach((h, i) => styleHeaderCell(ws.getCell(String.fromCharCode(65 + i) + r), h));
  r++;
  for (let i = 1; i <= 5; i++) {
    styleDataCell(ws.getCell('A' + r), i);
    styleDataCell(ws.getCell('B' + r), '');
    styleDataCell(ws.getCell('C' + r), '');
    styleDataCell(ws.getCell('D' + r), '');
    styleDataCell(ws.getCell('E' + r), '');
    styleDataCell(ws.getCell('F' + r), '');
    r++;
  }
  r++;

  // 4. Đang thực hiện (toàn phòng)
  ws.getCell('A' + r).value = '4. CÔNG VIỆC ĐANG THỰC HIỆN (TOÀN PHÒNG)';
  ws.getCell('A' + r).font = HEADER_FONT;
  r++;
  const h4 = ['STT', 'Người phụ trách', 'Tên công việc', 'Tiến độ (%)', 'Dự kiến hoàn thành', 'Ghi chú'];
  h4.forEach((h, i) => styleHeaderCell(ws.getCell(String.fromCharCode(65 + i) + r), h));
  r++;
  for (let i = 1; i <= 4; i++) {
    styleDataCell(ws.getCell('A' + r), i);
    styleDataCell(ws.getCell('B' + r), '');
    styleDataCell(ws.getCell('C' + r), '');
    styleDataCell(ws.getCell('D' + r), '');
    styleDataCell(ws.getCell('E' + r), '');
    styleDataCell(ws.getCell('F' + r), '');
    r++;
  }
  r++;

  // 5. Dự kiến tháng sau (toàn phòng)
  ws.getCell('A' + r).value = '5. CÔNG VIỆC DỰ KIẾN THÁNG SAU (TOÀN PHÒNG)';
  ws.getCell('A' + r).font = HEADER_FONT;
  r++;
  const h5 = ['STT', 'Người phụ trách', 'Tên công việc', 'Ưu tiên', 'Ghi chú'];
  h5.forEach((h, i) => styleHeaderCell(ws.getCell(String.fromCharCode(65 + i) + r), h));
  r++;
  for (let i = 1; i <= 4; i++) {
    styleDataCell(ws.getCell('A' + r), i);
    styleDataCell(ws.getCell('B' + r), '');
    styleDataCell(ws.getCell('C' + r), '');
    styleDataCell(ws.getCell('D' + r), '');
    styleDataCell(ws.getCell('E' + r), '');
    r++;
  }
  r++;

  // 6. Khó khăn / Đề xuất tổng hợp
  ws.getCell('A' + r).value = '6. KHÓ KHĂN / ĐỀ XUẤT TỔNG HỢP';
  ws.getCell('A' + r).font = HEADER_FONT;
  r += 3;

  // 7. Ghi chú / Đánh giá chung
  ws.getCell('A' + r).value = '7. GHI CHÚ / ĐÁNH GIÁ CHUNG';
  ws.getCell('A' + r).font = HEADER_FONT;
  r += 2;
  ws.getCell('A' + r).value = 'Người lập báo cáo tổng (Ký, ghi rõ họ tên)';
  ws.getCell('A' + r).font = { italic: true };

  ws.getColumn(1).width = 8;
  ws.getColumn(2).width = 18;
  ws.getColumn(3).width = 28;
  ws.getColumn(4).width = 22;
  ws.getColumn(5).width = 28;
  ws.getColumn(6).width = 18;
}

async function main() {
  const docsDir = path.join(__dirname, '..', 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  const wbCaNhan = new ExcelJS.Workbook();
  wbCaNhan.creator = 'PTK';
  await createBaoCaoCaNhan(wbCaNhan);
  const outCaNhan = path.join(docsDir, 'MAU_BAO_CAO_CONG_VIEC_PTK.xlsx');
  await wbCaNhan.xlsx.writeFile(outCaNhan);
  console.log('Đã tạo:', outCaNhan);

  const wbTong = new ExcelJS.Workbook();
  wbTong.creator = 'PTK';
  await createBaoCaoTong(wbTong);
  const outTong = path.join(docsDir, 'MAU_BAO_CAO_TONG_PTK.xlsx');
  await wbTong.xlsx.writeFile(outTong);
  console.log('Đã tạo:', outTong);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
