import { Component, ViewChild, ElementRef, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import * as XLSX from 'xlsx';
import { MaySuaChuaService } from '../../../services/may-sua-chua.service';
import { MaySuaChua } from '../../../models/may-sua-chua.model';

/** Map Excel header (normalized) -> model key */
const HEADER_MAP: Record<string, keyof MaySuaChua> = {
  'số tntt': 'soTNTT_DV_DH_PKD',
  'so tntt': 'soTNTT_DV_DH_PKD',
  'số tntt/dv/đh-p.kd': 'soTNTT_DV_DH_PKD',
  'so tntt/dv/đh-p kd': 'soTNTT_DV_DH_PKD',
  'số tntt/dv/đh-p kd': 'soTNTT_DV_DH_PKD',
  'thông tin khách hàng': 'thongTinKhachHang',
  'thong tin khach hang': 'thongTinKhachHang',
  'khách hàng': 'thongTinKhachHang',
  'khach hang': 'thongTinKhachHang',
  's (kva)': 'skVA',
  'skva': 'skVA',
  'biến áp': 'dienAp',
  'bien ap': 'dienAp',
  'điện áp': 'dienAp',
  'dien ap': 'dienAp',
  'ngày nhận': 'ngayNhan',
  'ngay nhan': 'ngayNhan',
  'người thực hiện': 'nguoiThucHien',
  'nguoi thuc hien': 'nguoiThucHien',
  'số máy': 'soMay',
  'so may': 'soMay',
  'số tbkt sửa': 'soTBKTSua',
  'so tbkt sua': 'soTBKTSua',
  'giao p.kd': 'giaoPKD',
  'giao pkd': 'giaoPKD',
  'ghi chú': 'ghiChu',
  'ghi chu': 'ghiChu'
};

/** Thứ tự cột mặc định khi map theo index */
const DEFAULT_COLUMN_ORDER: (keyof MaySuaChua)[] = [
  'soTNTT_DV_DH_PKD',
  'thongTinKhachHang',
  'skVA',
  'dienAp',
  'ngayNhan',
  'nguoiThucHien',
  'soMay',
  'soTBKTSua',
  'giaoPKD',
  'ghiChu'
];

function normalizeHeader(h: string): string {
  return h.replace(/\s+/g, ' ').trim().toLowerCase();
}

function excelDateToISO(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') {
    const d = new Date((value - 25569) * 86400 * 1000);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
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

/** Chuẩn hóa ngày về YYYY-MM-DD để so sánh trùng (API có thể trả DD/MM/YYYY hoặc ISO). */
function normalizeDateForSignature(value: string | null | undefined): string {
  if (value == null || String(value).trim() === '') return '';
  const s = String(value).trim();
  const ddmmyyyy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return s;
}

/** Chuỗi đại diện toàn bộ cột data để so sánh trùng (bỏ id). */
function dataSignature(row: MaySuaChua): string {
  const n = (v: string | null | undefined) => (v == null || String(v).trim() === '' ? '' : String(v).trim());
  return [
    row.nam,
    n(row.soTNTT_DV_DH_PKD),
    n(row.thongTinKhachHang),
    n(row.skVA),
    n(row.dienAp),
    normalizeDateForSignature(row.ngayNhan),
    n(row.nguoiThucHien),
    n(row.soMay),
    n(row.soTBKTSua),
    normalizeDateForSignature(row.giaoPKD),
    n(row.ghiChu)
  ].join('|');
}

@Component({
  selector: 'app-may-sua-chua-import-dialog',
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
  templateUrl: './may-sua-chua-import-dialog.component.html',
  styleUrls: ['./may-sua-chua-import-dialog.component.css']
})
export class MaySuaChuaImportDialogComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  selectedFile: File | null = null;
  sheetNames: string[] = [];
  selectedSheetName = '';
  workbook: XLSX.WorkBook | null = null;
  isImporting = false;
  previewRowCount = 0;

  constructor(
    private dialogRef: MatDialogRef<MaySuaChuaImportDialogComponent>,
    private service: MaySuaChuaService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { nam: number }
  ) {}

  /** Năm dùng cho import và so sánh trùng (trùng với dữ liệu theo năm). */
  private get nam(): number {
    return this.data?.nam ?? new Date().getFullYear();
  }

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
      } catch {
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
    this.previewRowCount = Math.max(0, rows.length - 1);
  }

  get canImport(): boolean {
    return !!(
      this.selectedFile &&
      this.workbook &&
      this.selectedSheetName &&
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

    let headerRow = rows[0] as unknown[];
    let dataRows = rows.slice(1) as unknown[][];
    let headers = headerRow.map((h) => normalizeHeader(String(h ?? '')));
    let toCreate = this.buildRowsFromData(headers, dataRows);

    // Fallback 1: nếu dòng đầu chỉ là tiêu đề nhóm, thử dùng dòng 2 làm header
    if (toCreate.length === 0 && rows.length >= 3) {
      headerRow = rows[1] as unknown[];
      dataRows = rows.slice(2) as unknown[][];
      headers = headerRow.map((h) => normalizeHeader(String(h ?? '')));
      toCreate = this.buildRowsFromData(headers, dataRows);
    }

    // Fallback 2: map theo thứ tự cột
    if (toCreate.length === 0 && dataRows.length > 0) {
      toCreate = this.buildRowsByColumnIndex(dataRows);
    }

    if (toCreate.length === 0) {
      this.snackBar.open('Không có dòng dữ liệu hợp lệ để import.', 'Đóng', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Loại bỏ trùng trong file: chỉ giữ bản ghi đầu tiên khi mọi cột data giống nhau
    const seenInFile = new Set<string>();
    const deduped: MaySuaChua[] = [];
    for (const row of toCreate) {
      const sig = dataSignature(row);
      if (seenInFile.has(sig)) continue;
      seenInFile.add(sig);
      deduped.push(row);
    }
    const skippedInFile = toCreate.length - deduped.length;

    this.isImporting = true;
    this.service.getAll(this.nam).subscribe({
      next: (existingList) => {
        const existingSigs = new Set(existingList.map((r) => dataSignature(r)));
        // Bỏ qua dòng trùng với dữ liệu đã có trên hệ thống (tất cả cột data giống nhau)
        const toInsert = deduped.filter((row) => !existingSigs.has(dataSignature(row)));
        const skippedExisting = deduped.length - toInsert.length;

        if (toInsert.length === 0) {
          this.isImporting = false;
          const parts = [];
          if (skippedInFile > 0) parts.push(`${skippedInFile} dòng trùng trong file`);
          if (skippedExisting > 0) parts.push(`${skippedExisting} dòng đã tồn tại trên hệ thống`);
          this.snackBar.open(
            'Không có bản ghi nào được thêm. ' + (parts.length ? parts.join(', ') + '.' : ''),
            'Đóng',
            { duration: 4000, panelClass: ['error-snackbar'] }
          );
          return;
        }

        let done = 0;
        let failed = 0;
        const total = toInsert.length;

        const next = (index: number) => {
          if (index >= total) {
            this.isImporting = false;
            const extra =
              (skippedInFile > 0 ? ` Bỏ qua ${skippedInFile} dòng trùng trong file.` : '') +
              (skippedExisting > 0 ? ` Bỏ qua ${skippedExisting} dòng trùng với dữ liệu hiện có.` : '');
            if (failed > 0) {
              this.snackBar.open(
                `Đã import ${done} bản ghi, thất bại ${failed} bản ghi.${extra}`,
                'Đóng',
                { duration: 5000, panelClass: ['error-snackbar'] }
              );
            } else {
              this.snackBar.open(`Đã import ${done} bản ghi.${extra}`, 'Đóng', {
                duration: 3000,
                panelClass: ['success-snackbar']
              });
            }
            this.dialogRef.close(true);
            return;
          }
          this.service.create(toInsert[index]).subscribe({
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
      },
      error: () => {
        this.isImporting = false;
        this.snackBar.open('Không thể kiểm tra dữ liệu hiện có. Thử lại sau.', 'Đóng', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  private buildRowsFromData(
    headers: string[],
    dataRows: unknown[][]
  ): MaySuaChua[] {
    const toCreate: MaySuaChua[] = [];
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i] as unknown[];
      const record: Record<string, unknown> = {};

      headers.forEach((h, colIndex) => {
        const key = HEADER_MAP[h];
        if (key) record[key] = row[colIndex];
      });

      const soTNTT = cellStr(record['soTNTT_DV_DH_PKD']);
      const thongTinKhachHang = cellStr(record['thongTinKhachHang']);
      const skVA = cellStr(record['skVA']);
      const dienAp = cellStr(record['dienAp']);
      let ngayNhan = excelDateToISO(record['ngayNhan']);
      const nguoiThucHien = cellStr(record['nguoiThucHien']);
      const soMay = cellStr(record['soMay']);
      const soTBKTSua = cellStr(record['soTBKTSua']);
      const giaoPKD = cellStr(record['giaoPKD']);
      const ghiChu = cellStr(record['ghiChu']);

      if (
        !soTNTT &&
        !thongTinKhachHang &&
        !skVA &&
        !dienAp &&
        !ngayNhan &&
        !nguoiThucHien &&
        !soMay &&
        !soTBKTSua
      ) {
        continue;
      }
      if (!ngayNhan) ngayNhan = new Date().toISOString().slice(0, 10);

      toCreate.push({
        nam: this.nam,
        soTNTT_DV_DH_PKD: soTNTT || `Row${i + 2}`,
        thongTinKhachHang: thongTinKhachHang || null,
        skVA: skVA || null,
        dienAp: dienAp || null,
        ngayNhan,
        nguoiThucHien: nguoiThucHien || null,
        soMay: soMay || null,
        soTBKTSua: soTBKTSua || null,
        giaoPKD: giaoPKD || null,
        ghiChu: ghiChu || null
      });
    }
    return toCreate;
  }

  private buildRowsByColumnIndex(dataRows: unknown[][]): MaySuaChua[] {
    const toCreate: MaySuaChua[] = [];
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i] as unknown[];
      const hasAnyCell = row.some((cell) => cell != null && String(cell).trim() !== '');
      if (!hasAnyCell) continue;

      const record: Record<string, unknown> = {};
      DEFAULT_COLUMN_ORDER.forEach((key, colIndex) => {
        if (colIndex < row.length) record[key] = row[colIndex];
      });

      const soTNTT = cellStr(record['soTNTT_DV_DH_PKD']);
      const thongTinKhachHang = cellStr(record['thongTinKhachHang']);
      const skVA = cellStr(record['skVA']);
      const dienAp = cellStr(record['dienAp']);
      let ngayNhan = excelDateToISO(record['ngayNhan']);
      const nguoiThucHien = cellStr(record['nguoiThucHien']);
      const soMay = cellStr(record['soMay']);
      const soTBKTSua = cellStr(record['soTBKTSua']);
      const giaoPKD = cellStr(record['giaoPKD']);
      const ghiChu = cellStr(record['ghiChu']);

      if (!ngayNhan) ngayNhan = new Date().toISOString().slice(0, 10);

      toCreate.push({
        nam: this.nam,
        soTNTT_DV_DH_PKD: soTNTT || `Row${i + 2}`,
        thongTinKhachHang: thongTinKhachHang || null,
        skVA: skVA || null,
        dienAp: dienAp || null,
        ngayNhan,
        nguoiThucHien: nguoiThucHien || null,
        soMay: soMay || null,
        soTBKTSua: soTBKTSua || null,
        giaoPKD: giaoPKD || null,
        ghiChu: ghiChu || null
      });
    }
    return toCreate;
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}

