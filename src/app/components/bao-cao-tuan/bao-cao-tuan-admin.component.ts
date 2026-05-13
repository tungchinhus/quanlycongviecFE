import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepicker, MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DATE_FORMATS, MatNativeDateModule } from '@angular/material/core';
import { MM_YYYY_FORMAT } from '../../config/date-format.config';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BaoCaoTuanAdminService } from '../../services/bao-cao-tuan-admin.service';
import type { BaoCaoTuanAdminListItem, BaoCaoTuanMonthlyMatrix, BaoCaoTuanMonthlyStaffColumn, BaoCaoTuanMonthlyMatrixRow } from '../../models/bao-cao-tuan.model';

@Component({
  selector: 'app-bao-cao-tuan-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './bao-cao-tuan-admin.component.html',
  styleUrls: ['./bao-cao-tuan-admin.component.css'],
  providers: [{ provide: MAT_DATE_FORMATS, useValue: MM_YYYY_FORMAT }]
})
export class BaoCaoTuanAdminComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly isExporting = signal(false);
  readonly items = signal<BaoCaoTuanAdminListItem[]>([]);
  readonly matrix = signal<BaoCaoTuanMonthlyMatrix | null>(null);

  /** Ngày 1 của tháng đang lọc (ô hiển thị MM/YYYY; đổi tháng → tải lại danh sách). */
  monthAnchor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  readonly displayedColumns = ['capNhat', 'nguoiLap', 'tuanBaoCao', 'userId'];

  constructor(
    private readonly adminService: BaoCaoTuanAdminService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.load();
  }

  onMonthSelected(normalizedMonth: Date, datepicker: MatDatepicker<Date>): void {
    this.monthAnchor = new Date(normalizedMonth.getFullYear(), normalizedMonth.getMonth(), 1);
    datepicker.close();
    this.load();
  }

  load(): void {
    const y = this.monthAnchor.getFullYear();
    const m = this.monthAnchor.getMonth() + 1;
    this.isLoading.set(true);
    this.adminService.getForMonth(y, m).subscribe({
      next: (rows) => {
        this.items.set(rows);
        this.loadMatrix();
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.snackBar.open(err.error?.message || 'Không tải được danh sách.', 'Đóng', { duration: 5000 });
      }
    });
  }

  private loadMatrix(): void {
    const y = this.monthAnchor.getFullYear();
    const m = this.monthAnchor.getMonth() + 1;
    this.adminService.getMatrixForMonth(y, m).subscribe({
      next: (data) => this.matrix.set(data),
      error: () => this.matrix.set({ staffColumns: [], rows: [] })
    });
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportWeeklyExcelCurrentWeek(): void {
    this.isExporting.set(true);
    this.adminService.exportWeeklyExcelCurrentWeek().subscribe({
      next: (blob) => {
        this.isExporting.set(false);
        this.downloadBlob(blob, this.currentWeekExcelFileName());
        this.snackBar.open('Đã tải Excel báo cáo tuần hiện tại.', 'Đóng', { duration: 3000 });
      },
      error: (err) => {
        this.isExporting.set(false);
        if (err.error instanceof Blob) {
          err.error.text().then((t: string) => {
            try {
              const j = JSON.parse(t);
              this.snackBar.open(j.message || 'Lỗi xuất file.', 'Đóng', { duration: 5000 });
            } catch {
              this.snackBar.open('Lỗi xuất file.', 'Đóng', { duration: 5000 });
            }
          });
        } else {
          this.snackBar.open(err.error?.message || 'Lỗi xuất Excel.', 'Đóng', { duration: 5000 });
        }
      }
    });
  }

  /** Thứ Hai–Chủ Nhật theo ngày máy user (thường trùng VN); tên file gần khớp backend. */
  private currentWeekExcelFileName(): string {
    const d = new Date();
    const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dow = local.getDay();
    const fromMonday = (dow + 6) % 7;
    const monday = new Date(local);
    monday.setDate(local.getDate() - fromMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (x: Date) =>
      `${String(x.getDate()).padStart(2, '0')}${String(x.getMonth() + 1).padStart(2, '0')}${x.getFullYear()}`;
    return `BaoCaoTuan_Tuan_${fmt(monday)}_${fmt(sunday)}.xlsx`;
  }

  exportMonthlyWorkbook(): void {
    const y = this.monthAnchor.getFullYear();
    const m = this.monthAnchor.getMonth() + 1;
    this.isExporting.set(true);
    this.adminService.exportMonthlyWorkbook(y, m).subscribe({
      next: (blob) => {
        this.isExporting.set(false);
        this.downloadBlob(blob, `BaoCaoTongHop_Thang${m}_${y}.xlsx`);
        this.snackBar.open('Đã tải Excel báo cáo tháng (mẫu Chinh + sheet chi tiết).', 'Đóng', { duration: 3500 });
      },
      error: (err) => {
        this.isExporting.set(false);
        if (err.error instanceof Blob) {
          err.error.text().then((t: string) => {
            try {
              const j = JSON.parse(t);
              this.snackBar.open(j.message || 'Lỗi xuất file.', 'Đóng', { duration: 5000 });
            } catch {
              this.snackBar.open('Lỗi xuất file.', 'Đóng', { duration: 5000 });
            }
          });
        } else {
          this.snackBar.open(err.error?.message || 'Lỗi xuất Excel.', 'Đóng', { duration: 5000 });
        }
      }
    });
  }

  formatCapNhat(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
  }

  staffColumns(): BaoCaoTuanMonthlyStaffColumn[] {
    return this.matrix()?.staffColumns ?? [];
  }

  matrixRows(): BaoCaoTuanMonthlyMatrixRow[] {
    return this.matrix()?.rows ?? [];
  }

  matrixValue(row: BaoCaoTuanMonthlyMatrixRow, col: BaoCaoTuanMonthlyStaffColumn): string {
    const key = String(col.columnIndex);
    const v = row.values?.[key] ?? 0;
    if (!v) return '';
    return Number.isInteger(v) ? String(v) : v.toFixed(2);
  }

  isBlockHeaderRow(row: BaoCaoTuanMonthlyMatrixRow): boolean {
    return !!row.stt?.trim();
  }

  hasDanhMuc1Text(row: BaoCaoTuanMonthlyMatrixRow): boolean {
    return !!row.danhMuc1?.trim();
  }
}
