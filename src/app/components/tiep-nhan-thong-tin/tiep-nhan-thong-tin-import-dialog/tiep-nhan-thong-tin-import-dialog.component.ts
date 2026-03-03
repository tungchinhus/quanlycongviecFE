import { Component, Inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import * as XLSX from 'xlsx';
import { TiepNhanThongTinService } from '../../../services/tiep-nhan-thong-tin.service';
import { TiepNhanThongTin } from '../../../models/tiep-nhan-thong-tin.model';

const PHAN_LOAI_OPTIONS = [
  { value: 'Tiếp nhận mới', label: 'Tiếp nhận mới' },
  { value: 'Xuất Khẩu', label: 'Xuất Khẩu' },
  { value: 'DVKH', label: 'DVKH' },
  { value: 'VPMB', label: 'VPMB' },
  { value: 'Đơn Hàng', label: 'Đơn Hàng' }
];

/** Map Excel header (normalized) -> model key. Nhiều biến thể tên cột. */
const HEADER_MAP: Record<string, keyof TiepNhanThongTin> = {
  'số tntt': 'soTNTT',
  'so tntt': 'soTNTT',
  'stt': 'soTNTT',
  'số tntt/dv/đh-p.kd': 'soTNTT',
  'số tntt/dv/đh-p kd': 'soTNTT',
  'tháng/năm': 'thangNam',
  'thang nam': 'thangNam',
  'tên (p. kd)': 'tenNVPKD',
  'tên (p.kd)': 'tenNVPKD',
  'ten (p. kd)': 'tenNVPKD',
  'tên p. kd': 'tenNVPKD',
  's (kva)': 'skVA',
  'skva': 'skVA',
  'biến áp': 'dienAp',
  'bien ap': 'dienAp',
  'điện áp': 'dienAp',
  'dien ap': 'dienAp',
  'số lượng': 'soLuong',
  'so luong': 'soLuong',
  'tiêu chuẩn': 'tieuChuan',
  'tieu chuan': 'tieuChuan',
  'khách hàng': 'khachHang',
  'khach hang': 'khachHang',
  'thông tin khách hàng': 'khachHang',
  'thong tin khach hang': 'khachHang',
  'ngày nhận': 'ngayNhan',
  'ngay nhan': 'ngayNhan',
  'ngày giao': 'ngayGiao',
  'ngay giao': 'ngayGiao',
  'ngày giao p. kd': 'ngayGiao',
  'ngay giao p. kd': 'ngayGiao',
  'giao p.kd': 'ngayGiao',
  'ngày lưu': 'ngayLuu',
  'ngay luu': 'ngayLuu',
  'người thực hiện': 'nguoiThucHien',
  'nguoi thuc hien': 'nguoiThucHien',
  'ngày hoàn thành': 'ngayHoanThanh',
  'ngay hoan thanh': 'ngayHoanThanh',
  'ghi chú': 'ghiChu',
  'ghi chu': 'ghiChu',
  'phụ kiện': 'phuKienKemTheo',
  'phu kien': 'phuKienKemTheo'
};

/** Thứ tự cột mặc định khi map theo index (dòng 1 = header có thể không khớp) */
const DEFAULT_COLUMN_ORDER: (keyof TiepNhanThongTin)[] = [
  'soTNTT', 'thangNam', 'tenNVPKD', 'skVA', 'dienAp', 'soLuong', 'tieuChuan', 'khachHang',
  'ngayNhan', 'ngayGiao', 'ngayLuu', 'nguoiThucHien', 'ngayHoanThanh', 'ghiChu'
];

function normalizeHeader(h: string): string {
  return h.replace(/\s+/g, ' ').trim().toLowerCase();
}

function excelDateToISO(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') {
    // Excel serial date: days since 1900-01-01 (with 1900 leap bug)
    const d = new Date((value - 25569) * 86400 * 1000);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    // DD/MM/YYYY or YYYY-MM-DD
    const m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      const [, day, month, year] = m;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }
  return null;
}

function cellStr(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'number') return String(value);
  return String(value).trim();
}

@Component({
  selector: 'app-tiep-nhan-thong-tin-import-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './tiep-nhan-thong-tin-import-dialog.component.html',
  styleUrls: ['./tiep-nhan-thong-tin-import-dialog.component.css']
})
export class TiepNhanThongTinImportDialogComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  selectedFile: File | null = null;
  sheetNames: string[] = [];
  selectedSheetName = '';
  selectedPhanLoai = '';
  phanLoaiOptions = PHAN_LOAI_OPTIONS;
  workbook: XLSX.WorkBook | null = null;
  isImporting = false;
  previewRowCount = 0;

  constructor(
    private dialogRef: MatDialogRef<TiepNhanThongTinImportDialogComponent>,
    private service: TiepNhanThongTinService,
    private snackBar: MatSnackBar
  ) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      this.snackBar.open('Vui lòng chọn file Excel (.xlsx hoặc .xls).', 'Đóng', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }
    this.selectedFile = file;
    this.workbook = null;
    this.sheetNames = [];
    this.selectedSheetName = '';
    this.previewRowCount = 0;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) return;
        const wb = XLSX.read(data, { type: 'binary' });
        this.workbook = wb;
        this.sheetNames = wb.SheetNames.filter((n) => {
          const ws = wb.Sheets[n];
          return ws && XLSX.utils.sheet_to_json(ws, { header: 1 }).length > 0;
        });
        if (this.sheetNames.length > 0 && !this.selectedSheetName) {
          this.selectedSheetName = this.sheetNames[0];
          this.updatePreviewCount();
        }
      } catch (err) {
        this.snackBar.open('Không đọc được file Excel.', 'Đóng', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    };
    reader.readAsBinaryString(file);
    input.value = '';
  }

  triggerFileInput(): void {
    this.fileInput?.nativeElement?.click();
  }

  onSheetChange(): void {
    this.updatePreviewCount();
  }

  private updatePreviewCount(): void {
    if (!this.workbook || !this.selectedSheetName) {
      this.previewRowCount = 0;
      return;
    }
    const ws = this.workbook.Sheets[this.selectedSheetName];
    if (!ws) {
      this.previewRowCount = 0;
      return;
    }
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown as unknown[][];
    // First row = header, data rows after
    this.previewRowCount = Math.max(0, rows.length - 1);
  }

  get canImport(): boolean {
    return !!(
      this.selectedFile &&
      this.workbook &&
      this.selectedSheetName &&
      this.selectedPhanLoai &&
      this.previewRowCount > 0 &&
      !this.isImporting
    );
  }

  import(): void {
    if (!this.canImport || !this.workbook) return;
    const ws = this.workbook.Sheets[this.selectedSheetName];
    if (!ws) return;

    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown as unknown[][];
    if (rows.length < 2) {
      this.snackBar.open('Sheet không có dữ liệu (cần ít nhất 1 dòng tiêu đề và 1 dòng dữ liệu).', 'Đóng', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    const phanLoai = this.selectedPhanLoai;
    let headerRow = rows[0] as unknown[];
    let dataRows = rows.slice(1) as unknown[][];
    let headers = headerRow.map((h) => normalizeHeader(String(h ?? '')));
    let toCreate = this.buildRowsFromData(headers, dataRows, phanLoai);

    // Fallback 1: nếu dòng 1 là tiêu đề (title), thử dùng dòng 2 làm header
    if (toCreate.length === 0 && rows.length >= 3) {
      headerRow = rows[1] as unknown[];
      dataRows = rows.slice(2) as unknown[][];
      headers = headerRow.map((h) => normalizeHeader(String(h ?? '')));
      toCreate = this.buildRowsFromData(headers, dataRows, phanLoai);
    }

    // Fallback 2: map theo thứ tự cột (cột 0 = Số TNTT, 1 = Tháng/Năm, ...)
    if (toCreate.length === 0 && dataRows.length > 0) {
      toCreate = this.buildRowsByColumnIndex(dataRows, phanLoai);
    }

    if (toCreate.length === 0) {
      this.snackBar.open('Không có dòng dữ liệu hợp lệ để import.', 'Đóng', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.isImporting = true;
    let done = 0;
    let failed = 0;
    const total = toCreate.length;

    const next = (index: number) => {
      if (index >= total) {
        this.isImporting = false;
        if (failed > 0) {
          this.snackBar.open(`Đã import ${done} bản ghi, thất bại ${failed} bản ghi.`, 'Đóng', {
            duration: 4000,
            panelClass: ['error-snackbar']
          });
        } else {
          this.snackBar.open(`Đã import ${done} bản ghi.`, 'Đóng', {
            duration: 2000,
            panelClass: ['success-snackbar']
          });
        }
        this.dialogRef.close(true);
        return;
      }
      this.service.create(toCreate[index]).subscribe({
        next: () => {
          done++;
          next(index + 1);
        },
        error: () => {
          failed++;
          next(index + 1);
        }
      });
    };
    next(0);
  }

  private buildRowsFromData(
    headers: string[],
    dataRows: unknown[][],
    phanLoai: string
  ): TiepNhanThongTin[] {
    const toCreate: TiepNhanThongTin[] = [];
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i] as unknown[];
      const record: Record<string, unknown> = {};
      headers.forEach((h, colIndex) => {
        const key = HEADER_MAP[h];
        if (key) record[key] = row[colIndex];
      });
      const soTNTT = cellStr(record['soTNTT']);
      const dienAp = cellStr(record['dienAp']);
      const soLuong = Number(record['soLuong']) || 0;
      const khachHang = cellStr(record['khachHang']);
      let ngayNhan = excelDateToISO(record['ngayNhan']);
      if (!soTNTT && !khachHang && soLuong === 0 && !ngayNhan) continue;
      if (!ngayNhan) ngayNhan = new Date().toISOString().slice(0, 10);
      toCreate.push({
        phanLoai: phanLoai || null,
        soTNTT: soTNTT || `Row${i + 2}`,
        dienAp: dienAp || '-',
        soLuong,
        khachHang: khachHang || '-',
        ngayNhan,
        thangNam: cellStr(record['thangNam']) || null,
        tenNVPKD: cellStr(record['tenNVPKD']) || null,
        skVA: cellStr(record['skVA']) || null,
        tieuChuan: cellStr(record['tieuChuan']) || null,
        phuKienKemTheo: cellStr(record['phuKienKemTheo']) || null,
        ngayGiao: excelDateToISO(record['ngayGiao']) ?? null,
        ngayLuu: excelDateToISO(record['ngayLuu']) ?? null,
        nguoiThucHien: cellStr(record['nguoiThucHien']) || null,
        ngayHoanThanh: excelDateToISO(record['ngayHoanThanh']) ?? null,
        ghiChu: cellStr(record['ghiChu']) || null
      });
    }
    return toCreate;
  }

  /** Map theo thứ tự cột: cột 0 = Số TNTT, 1 = Tháng/Năm, 2 = Tên P.KD, 3 = S(kVA), 4 = Biến áp, 5 = Số lượng, 6 = Tiêu chuẩn, 7 = Khách hàng, 8 = Ngày nhận, ... */
  private buildRowsByColumnIndex(dataRows: unknown[][], phanLoai: string): TiepNhanThongTin[] {
    const toCreate: TiepNhanThongTin[] = [];
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i] as unknown[];
      const hasAnyCell = row.some((cell) => cell != null && String(cell).trim() !== '');
      if (!hasAnyCell) continue;
      const record: Record<string, unknown> = {};
      DEFAULT_COLUMN_ORDER.forEach((key, colIndex) => {
        if (colIndex < row.length) record[key] = row[colIndex];
      });
      const soTNTT = cellStr(record['soTNTT']);
      const dienAp = cellStr(record['dienAp']);
      const soLuong = Number(record['soLuong']) || 0;
      const khachHang = cellStr(record['khachHang']);
      let ngayNhan = excelDateToISO(record['ngayNhan']);
      if (!ngayNhan) ngayNhan = new Date().toISOString().slice(0, 10);
      toCreate.push({
        phanLoai: phanLoai || null,
        soTNTT: soTNTT || `Row${i + 2}`,
        dienAp: dienAp || '-',
        soLuong,
        khachHang: khachHang || '-',
        ngayNhan,
        thangNam: cellStr(record['thangNam']) || null,
        tenNVPKD: cellStr(record['tenNVPKD']) || null,
        skVA: cellStr(record['skVA']) || null,
        tieuChuan: cellStr(record['tieuChuan']) || null,
        phuKienKemTheo: cellStr(record['phuKienKemTheo']) || null,
        ngayGiao: excelDateToISO(record['ngayGiao']) ?? null,
        ngayLuu: excelDateToISO(record['ngayLuu']) ?? null,
        nguoiThucHien: cellStr(record['nguoiThucHien']) || null,
        ngayHoanThanh: excelDateToISO(record['ngayHoanThanh']) ?? null,
        ghiChu: cellStr(record['ghiChu']) || null
      });
    }
    return toCreate;
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
