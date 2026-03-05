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
import { HoSoThauService } from '../../../services/ho-so-thau.service';
import { HoSoThau } from '../../../models/ho-so-thau.model';
import { formatDate } from '../../../utils/date.util';
import { HoSoThauFormDialogComponent } from '../ho-so-thau-form-dialog/ho-so-thau-form-dialog.component';
import { HoSoThauImportDialogComponent } from '../ho-so-thau-import-dialog/ho-so-thau-import-dialog.component';

@Component({
  selector: 'app-ho-so-thau-list',
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
  templateUrl: './ho-so-thau-list.component.html',
  styleUrls: ['./ho-so-thau-list.component.css']
})
export class HoSoThauListComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  readonly dataSource = new MatTableDataSource<HoSoThau>([]);
  readonly searchTerm = signal('');
  readonly selectedYear = signal<number>(Math.min(2026, Math.max(2023, new Date().getFullYear())));
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;
  readonly displayedColumns = ['soHST', 'donViMoiThau', 'soTBMTIB', 'ngayNhan', 'ngayGiaoPhongKD', 'actions'];
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  private allData: HoSoThau[] = [];

  constructor(
    private service: HoSoThauService,
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
        this.applyYearFilter();
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

  onYearChange(year: number): void {
    this.selectedYear.set(year);
    this.applyYearFilter();
    setTimeout(() => {
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
        this.paginator.firstPage();
      }
    }, 0);
  }

  /** Lấy năm từ Số HST (định dạng "số/năm", VD: "15/2026" -> 2026). */
  private getYearFromSoHST(soHST: string | null | undefined): number | null {
    if (!soHST || typeof soHST !== 'string') return null;
    const parts = soHST.trim().split('/');
    if (parts.length < 2) return null;
    const y = Number(parts[parts.length - 1]);
    return Number.isNaN(y) ? null : y;
  }

  private applyYearFilter(): void {
    const year = this.selectedYear();
    // Lọc theo năm trích từ cột Số HST (số/năm)
    const filtered = this.allData.filter((item) => {
      const y = this.getYearFromSoHST(item.soHST);
      return y !== null && y === year;
    });
    this.dataSource.data = filtered;
  }

  ngOnDestroy(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
  }

  formatDateValue(value: string | null | undefined): string {
    return formatDate(value ?? null);
  }

  openAdd(): void {
    const ref = this.dialog.open(HoSoThauFormDialogComponent, {
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

  openImport(): void {
    const ref = this.dialog.open(HoSoThauImportDialogComponent, {
      width: '520px',
      minWidth: '320px',
      disableClose: false
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) this.loadData();
    });
  }

  openEdit(item: HoSoThau): void {
    const ref = this.dialog.open(HoSoThauFormDialogComponent, {
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

  delete(item: HoSoThau): void {
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
