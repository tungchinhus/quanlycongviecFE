import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { DD_MM_YYYY_FORMAT, CustomDateAdapter } from '../../config/date-format.config';
import { BaoCaoTuanService } from '../../services/bao-cao-tuan.service';
import type { BaoCaoTuanListItem } from '../../models/bao-cao-tuan.model';
import { BaoCaoTuanFormDialogComponent } from './bao-cao-tuan-form-dialog.component';
import { ConfirmDialogComponent } from '../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-bao-cao-tuan',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatPaginatorModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  providers: [
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMAT },
    { provide: MAT_DATE_LOCALE, useValue: 'vi-VN' }
  ],
  templateUrl: './bao-cao-tuan.component.html',
  styleUrls: ['./bao-cao-tuan.component.css']
})
export class BaoCaoTuanComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly reports = signal<BaoCaoTuanListItem[]>([]);
  readonly displayedColumns = ['tuanBaoCao', 'updatedAt', 'actions'];

  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [10, 25, 50];

  /** Lọc theo ngày cột «Cập nhật» (Material datepicker, DD/MM/YYYY). */
  filterTuNgayDate: Date | null = null;
  filterDenNgayDate: Date | null = null;

  constructor(
    private readonly service: BaoCaoTuanService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  static toIsoDate(d: Date | null | undefined): string | undefined {
    if (d == null || !(d instanceof Date) || isNaN(d.getTime())) return undefined;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  hasDateFilter(): boolean {
    return this.filterTuNgayDate != null || this.filterDenNgayDate != null;
  }

  pagedList(): BaoCaoTuanListItem[] {
    const list = this.reports();
    const size = this.pageSize();
    const index = this.pageIndex();
    const start = index * size;
    return list.slice(start, start + size);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  loadData(): void {
    this.isLoading.set(true);
    this.service
      .getMy({
        tuNgay: BaoCaoTuanComponent.toIsoDate(this.filterTuNgayDate),
        denNgay: BaoCaoTuanComponent.toIsoDate(this.filterDenNgayDate)
      })
      .subscribe({
        next: (items) => {
          this.reports.set(items);
          this.pageIndex.set(0);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.snackBar.open(err.error?.message || 'Không tải được danh sách báo cáo.', 'Đóng', {
            duration: 4000
          });
        }
      });
  }

  applyDateFilter(): void {
    this.pageIndex.set(0);
    this.loadData();
  }

  clearDateFilter(): void {
    this.filterTuNgayDate = null;
    this.filterDenNgayDate = null;
    this.pageIndex.set(0);
    this.loadData();
  }

  openAdd(): void {
    const ref = this.dialog.open(BaoCaoTuanFormDialogComponent, {
      width: '96vw',
      maxWidth: '1400px',
      maxHeight: '92vh',
      panelClass: 'bao-cao-tuan-form-dialog-panel',
      data: { mode: 'add' as const }
    });
    ref.afterClosed().subscribe((ok: boolean) => {
      if (ok) this.loadData();
    });
  }

  openEdit(item: BaoCaoTuanListItem): void {
    const ref = this.dialog.open(BaoCaoTuanFormDialogComponent, {
      width: '96vw',
      maxWidth: '1400px',
      maxHeight: '92vh',
      panelClass: 'bao-cao-tuan-form-dialog-panel',
      data: { mode: 'edit' as const, reportId: item.id }
    });
    ref.afterClosed().subscribe((ok: boolean) => {
      if (ok) this.loadData();
    });
  }

  delete(item: BaoCaoTuanListItem): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Xóa báo cáo tuần',
        message: `Bạn có chắc muốn xóa báo cáo tuần «${item.tuanBaoCao}»?`,
        confirmText: 'Xóa',
        cancelText: 'Hủy'
      }
    });
    ref.afterClosed().subscribe((ok: boolean) => {
      if (!ok) return;
      this.service.delete(item.id).subscribe({
        next: () => {
          this.snackBar.open('Đã xóa báo cáo.', 'Đóng', { duration: 2500 });
          this.loadData();
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || 'Không xóa được báo cáo.', 'Đóng', { duration: 4000 });
        }
      });
    });
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '-';
    const text = value.includes('T') ? value.slice(0, 10) : value;
    const m = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    return text;
  }
}
