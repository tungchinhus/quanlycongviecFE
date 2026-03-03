import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { TiepNhanThongTinService } from '../../../services/tiep-nhan-thong-tin.service';
import { TiepNhanThongTin } from '../../../models/tiep-nhan-thong-tin.model';
import { formatDate } from '../../../utils/date.util';
import { TiepNhanThongTinFormDialogComponent } from '../tiep-nhan-thong-tin-form-dialog/tiep-nhan-thong-tin-form-dialog.component';
import { TiepNhanThongTinImportDialogComponent } from '../tiep-nhan-thong-tin-import-dialog/tiep-nhan-thong-tin-import-dialog.component';

@Component({
  selector: 'app-tiep-nhan-thong-tin-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatPaginatorModule,
    MatSelectModule
  ],
  templateUrl: './tiep-nhan-thong-tin-list.component.html',
  styleUrls: ['./tiep-nhan-thong-tin-list.component.css']
})
export class TiepNhanThongTinListComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  readonly dataSource = new MatTableDataSource<TiepNhanThongTin>([]);
  readonly searchTerm = signal('');
  /** Phân loại: '' = Tất cả, hoặc Xuất Khẩu | DVKH | VPMB | Đơn Hàng */
  readonly phanLoaiFilter = signal<string>('');
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;
  /** Danh sách đầy đủ từ API (trước khi lọc phân loại) */
  private allData: TiepNhanThongTin[] = [];
  /** Thứ tự cột: Số TNTT → Tháng/Năm → Tên (P.KD) → S (kVA) → Biến áp → Số lượng → Tiêu chuẩn → Phụ kiện → Khách hàng → Ngày nhận → Ngày giao → Ngày lưu → Menu (bỏ hiển thị Người thực hiện, Ngày hoàn thành) */
  readonly displayedColumns = [
    'soTNTT',
    'thangNam',
    'tenNVPKD',
    'skVA',
    'dienAp',
    'soLuong',
    'tieuChuan',
    'khachHang',
    'ngayNhan',
    'ngayGiao',
    'ngayLuu',
    'actions'
  ];
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(
    private service: TiepNhanThongTinService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
  }

  loadData(): void {
    this.isLoading.set(true);
    this.error.set(null);
    const search = this.searchTerm().trim() || undefined;
    this.service.getAll(search).subscribe({
      next: (list) => {
        this.allData = list;
        this.applyPhanLoaiFilter();
        this.isLoading.set(false);
        // Paginator nằm trong @if, cần chờ view render xong rồi mới gán
        setTimeout(() => {
          if (this.paginator) {
            this.dataSource.paginator = this.paginator;
            this.paginator.firstPage();
          }
        }, 0);
      },
      error: () => {
        this.error.set('Không thể tải danh sách. Vui lòng thử lại sau.');
        this.snackBar.open('Không thể tải danh sách.', 'Đóng', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        this.isLoading.set(false);
      }
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.loadData(), 400);
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.loadData();
  }

  onPhanLoaiChange(value: string): void {
    this.phanLoaiFilter.set(value ?? '');
    this.applyPhanLoaiFilter();
    setTimeout(() => {
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
        this.paginator.firstPage();
      }
    }, 0);
  }

  /** Áp dụng lọc phân loại từ allData vào dataSource */
  private applyPhanLoaiFilter(): void {
    const filter = this.phanLoaiFilter().trim();
    const filtered = !filter
      ? this.allData
      : this.allData.filter((item) => (item.phanLoai ?? '').trim() === filter);
    this.dataSource.data = filtered;
  }

  ngOnDestroy(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
  }

  formatDateValue(value: string | null | undefined): string {
    return formatDate(value ?? null);
  }

  openAdd(): void {
    const ref = this.dialog.open(TiepNhanThongTinFormDialogComponent, {
      width: '90%',
      maxWidth: '1000px',
      minWidth: '320px',
      maxHeight: '90vh',
      data: { mode: 'add' }
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) this.loadData();
    });
  }

  openImportExcel(): void {
    const ref = this.dialog.open(TiepNhanThongTinImportDialogComponent, {
      width: '520px',
      minWidth: '320px',
      disableClose: false
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) this.loadData();
    });
  }

  openEdit(item: TiepNhanThongTin): void {
    const ref = this.dialog.open(TiepNhanThongTinFormDialogComponent, {
      width: '90%',
      maxWidth: '1000px',
      minWidth: '320px',
      maxHeight: '90vh',
      data: { mode: 'edit', item }
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) this.loadData();
    });
  }

  delete(item: TiepNhanThongTin): void {
    if (item.id == null) return;
    if (!confirm('Bạn có chắc muốn xóa bản ghi này?')) return;
    this.isLoading.set(true);
    this.service.delete(item.id).subscribe({
      next: () => {
        this.snackBar.open('Đã xóa.', 'Đóng', { duration: 2000, panelClass: ['success-snackbar'] });
        this.loadData();
      },
      error: () => {
        this.snackBar.open('Không thể xóa.', 'Đóng', { duration: 3000, panelClass: ['error-snackbar'] });
        this.isLoading.set(false);
      }
    });
  }
}
