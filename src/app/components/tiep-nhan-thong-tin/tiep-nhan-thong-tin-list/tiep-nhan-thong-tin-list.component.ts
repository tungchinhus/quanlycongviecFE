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
import { MatCheckboxModule } from '@angular/material/checkbox';
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
    MatCheckboxModule,
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
  /** Năm lọc theo Ngày nhận (2023–2026) */
  readonly selectedYear = signal<number>(Math.min(2026, Math.max(2023, new Date().getFullYear())));
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;
  /** Danh sách đầy đủ từ API (trước khi lọc phân loại) */
  private allData: TiepNhanThongTin[] = [];

  private readonly columnsStorageKey = 'tiep-nhan-thong-tin.visible-columns.v1';
  readonly columnOptions: ReadonlyArray<{ id: string; label: string; togglable: boolean }> = [
    { id: 'soTNTT',    label: 'Số TNTT',        togglable: false },
    { id: 'thangNam',  label: 'Tháng/Năm',       togglable: true },
    { id: 'tenNVPKD',  label: 'Tên (P. KD)',      togglable: true },
    { id: 'skVA',      label: 'S (kVA)',           togglable: true },
    { id: 'dienAp',    label: 'Biến áp',           togglable: true },
    { id: 'soLuong',   label: 'Số lượng',          togglable: true },
    { id: 'tieuChuan', label: 'Tiêu chuẩn',        togglable: true },
    { id: 'khachHang', label: 'Khách hàng',        togglable: true },
    { id: 'ngayNhan',  label: 'Ngày nhận',         togglable: true },
    { id: 'ngayGiao',  label: 'Ngày giao P. KD',   togglable: true },
    { id: 'ngayLuu',   label: 'Ngày lưu',          togglable: true },
    { id: 'actions',   label: 'Menu',              togglable: false }
  ] as const;

  readonly visibleColumnIds = signal<string[]>([
    'soTNTT', 'thangNam', 'tenNVPKD', 'skVA', 'dienAp',
    'soLuong', 'tieuChuan', 'khachHang', 'ngayNhan', 'ngayGiao', 'ngayLuu', 'actions'
  ]);

  displayedColumns(): string[] {
    const set = new Set(this.visibleColumnIds());
    set.add('soTNTT');
    set.add('actions');
    return this.columnOptions.map(c => c.id).filter(id => set.has(id));
  }

  isColumnVisible(id: string): boolean {
    return this.visibleColumnIds().includes(id);
  }

  toggleColumn(id: string, checked: boolean): void {
    const option = this.columnOptions.find(c => c.id === id);
    if (!option || !option.togglable) return;
    const current = new Set(this.visibleColumnIds());
    if (checked) current.add(id);
    else current.delete(id);
    current.add('soTNTT');
    current.add('actions');
    this.visibleColumnIds.set(Array.from(current));
    this.saveVisibleColumnsToStorage();
  }

  private loadVisibleColumnsFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.columnsStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      const allowed = new Set(this.columnOptions.map(c => c.id));
      const ids = parsed.map(v => String(v)).filter(id => allowed.has(id));
      if (ids.length > 0) this.visibleColumnIds.set(ids);
    } catch {
      // ignore
    }
  }

  private saveVisibleColumnsToStorage(): void {
    try {
      localStorage.setItem(this.columnsStorageKey, JSON.stringify(this.visibleColumnIds()));
    } catch {
      // ignore
    }
  }
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(
    private service: TiepNhanThongTinService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadVisibleColumnsFromStorage();
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
        this.applyFilters();
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
    this.applyFilters();
    setTimeout(() => {
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
        this.paginator.firstPage();
      }
    }, 0);
  }

  /** Áp dụng lọc phân loại + năm và sort theo Ngày nhận (mới nhất lên trên) */
  private applyFilters(): void {
    const phanLoai = this.phanLoaiFilter().trim();
    const year = this.selectedYear();

    let filtered = this.allData;

    if (phanLoai) {
      filtered = filtered.filter((item) => (item.phanLoai ?? '').trim() === phanLoai);
    }

    filtered = filtered.filter((item) => {
      if (!item.ngayNhan) return false;
      const y = Number(item.ngayNhan.slice(0, 4));
      return !Number.isNaN(y) && y === year;
    });

    // Sort theo Ngày nhận DESC (gần nhất lên trên). Nếu không có ngày thì xuống cuối.
    const toTime = (value: string | null | undefined): number => {
      if (!value) return 0;
      const d = new Date(value);
      const t = d.getTime();
      if (!Number.isNaN(t)) return t;
      // Fallback cho định dạng dd/MM/yyyy nếu có
      const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (m) {
        const [, day, month, yearStr] = m;
        const d2 = new Date(
          Number(yearStr),
          Number(month) - 1,
          Number(day)
        );
        const t2 = d2.getTime();
        return Number.isNaN(t2) ? 0 : t2;
      }
      return 0;
    };

    filtered = [...filtered].sort((a, b) => {
      const tb = toTime(b.ngayNhan);
      const ta = toTime(a.ngayNhan);
      if (tb !== ta) return tb - ta;
      // fallback: sort theo Id desc nếu cùng ngày / không có ngày
      return (b.id ?? 0) - (a.id ?? 0);
    });

    this.dataSource.data = filtered;
  }

  onYearChange(year: number): void {
    this.selectedYear.set(year);
    this.applyFilters();
    setTimeout(() => {
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
        this.paginator.firstPage();
      }
    }, 0);
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
