import * as XLSX from 'xlsx';
import type { BaoCaoTuanRow } from '../models/bao-cao-tuan.model';

function cellText(sheet: XLSX.WorkSheet, addr: string): string {
  const c = sheet[addr] as { v?: unknown; w?: string; t?: string } | undefined;
  if (!c || c.v == null || c.v === '') return '';
  if (typeof c.w === 'string' && c.w.length > 0) return c.w;
  if (c.t === 'd' && c.v instanceof Date) {
    const d = c.v;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  return String(c.v);
}

function cellStt(sheet: XLSX.WorkSheet, addr: string): number | null {
  const c = sheet[addr] as { v?: unknown } | undefined;
  if (!c || c.v == null || c.v === '') return null;
  if (typeof c.v === 'number' && Number.isFinite(c.v)) return c.v;
  const n = Number(String(c.v).replace(',', '.').trim());
  return Number.isFinite(n) ? n : null;
}

/** Đọc file .xlsx mẫu báo cáo tuần (sheet đầu). */
export function parseWeeklyReportWorkbook(buffer: ArrayBuffer): {
  tuanBaoCao: string;
  nguoiLap: string;
  ngayLapIso: string | null;
  rows: BaoCaoTuanRow[];
} {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) {
    return { tuanBaoCao: '', nguoiLap: '', ngayLapIso: null, rows: [] };
  }

  const tuanBaoCao = cellText(sheet, 'C3').trim();
  const nguoiLap = cellText(sheet, 'C4').trim();
  const a5 = cellText(sheet, 'A5');
  let ngayLapIso: string | null = null;
  const m = a5.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    ngayLapIso = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }

  const rows: BaoCaoTuanRow[] = [];
  for (let r = 8; r <= 67; r++) {
    rows.push({
      stt: cellStt(sheet, `A${r}`),
      danhMuc1: cellText(sheet, `B${r}`).trim(),
      danhMuc2: cellText(sheet, `C${r}`).trim(),
      ketQua: cellText(sheet, `D${r}`).trim(),
      tongSo: cellText(sheet, `E${r}`).trim(),
      vuongMac: cellText(sheet, `F${r}`).trim(),
      deXuat: cellText(sheet, `G${r}`).trim()
    });
  }

  return { tuanBaoCao, nguoiLap, ngayLapIso, rows };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Xuất .xlsx theo bố cục mẫu (sheet đầu). */
export function buildWeeklyReportWorkbook(params: {
  tuanBaoCao: string;
  nguoiLap: string;
  ngayLap: Date | null;
  rows: BaoCaoTuanRow[];
}): XLSX.WorkBook {
  const ngayStr = params.ngayLap
    ? `${pad2(params.ngayLap.getDate())}/${pad2(params.ngayLap.getMonth() + 1)}/${params.ngayLap.getFullYear()}`
    : '';

  const aoa: (string | number | null)[][] = [];
  aoa.push(['CÔNG TY CP THIẾT BỊ ĐIỆN', null, null, 'Báo cáo công tác tuần', null, null, null, null, null, null]);
  aoa.push([null, null, null, null, null, null, null, null, null, null]);
  aoa.push(['Tuần báo cáo : ', null, params.tuanBaoCao || null, null, null, null, null, null, null, null]);
  aoa.push(['Người lập báo cáo : ', null, params.nguoiLap || null, null, null, null, null, null, null, null]);
  aoa.push([ngayStr ? `Ngày lập : ${ngayStr}` : 'Ngày lập : ', null, null, null, null, null, null, null, null, null]);
  aoa.push([null, null, null, null, null, null, null, null, null, null]);
  aoa.push([
    'STT',
    'Danh mục công việc',
    null,
    'Kết quả thực hiện',
    'Tổng số lượng',
    'Các vướng mắc, tồn tại',
    'Đề xuất, giải pháp khắc phục',
    null,
    null,
    null
  ]);

  for (const row of params.rows) {
    aoa.push([
      row.stt ?? null,
      row.danhMuc1 || null,
      row.danhMuc2 || null,
      row.ketQua || null,
      row.tongSo || null,
      row.vuongMac || null,
      row.deXuat || null,
      null,
      null,
      null
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'BaoCaoTuan');
  return wb;
}

export function downloadWeeklyReportXlsx(wb: XLSX.WorkBook, fileName: string): void {
  XLSX.writeFile(wb, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
}
