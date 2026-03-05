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
import { MaySuaChuaService } from '../../../services/may-sua-chua.service';
import { MaySuaChua } from '../../../models/may-sua-chua.model';
import { formatDate } from '../../../utils/date.util';
import { MaySuaChuaFormDialogComponent } from '../may-sua-chua-form-dialog/may-sua-chua-form-dialog.component';
import { MaySuaChuaImportDialogComponent } from '../may-sua-chua-import-dialog/may-sua-chua-import-dialog.component';

@Component({
  selector: 'app-may-sua-chua-list',
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
  templateUrl: './may-sua-chua-list.component.html',
  styleUrls: ['./may-sua-chua-list.component.css']
})
export class MaySuaChuaListComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  readonly dataSource = new MatTableDataSource<MaySuaChua>([]);
  readonly searchTerm = signal('');
  readonly selectedYear = signal<number>(Math.min(2026, Math.max(2023, new Date().getFullYear())));
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;
  readonly displayedColumns = [
    'soTNTT_DV_DH_PKD',
    'thongTinKhachHang',
    'skVA',
    'dienAp',
    'ngayNhan',
    'nguoiThucHien',
    'soMay',
    'soTBKTSua',
    'giaoPKD',
    'ghiChu',
    'actions'
  ];
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(
    private service: MaySuaChuaService,
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
    const nam = this.selectedYear();
    const search = this.searchTerm().trim() || undefined;
    this.service.getAll(nam, search).subscribe({
      next: (list) => {
        this.dataSource.data = list;
        this.isLoading.set(false);
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

  onYearChange(year: number): void {
    this.selectedYear.set(year);
    this.loadData();
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

  ngOnDestroy(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
  }

  formatDateValue(value: string | null | undefined): string {
    return formatDate(value ?? null);
  }

  openAdd(): void {
    const ref = this.dialog.open(MaySuaChuaFormDialogComponent, {
      width: '90%',
      maxWidth: '1000px',
      minWidth: '320px',
      maxHeight: '90vh',
      data: { mode: 'add', nam: this.selectedYear() }
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) this.loadData();
    });
  }

  openImport(): void {
    const ref = this.dialog.open(MaySuaChuaImportDialogComponent, {
      width: '520px',
      minWidth: '320px',
      disableClose: false,
      data: { nam: this.selectedYear() }
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) this.loadData();
    });
  }

  openEdit(item: MaySuaChua): void {
    const ref = this.dialog.open(MaySuaChuaFormDialogComponent, {
      width: '90%',
      maxWidth: '1000px',
      minWidth: '320px',
      maxHeight: '90vh',
      data: { mode: 'edit', item, nam: this.selectedYear() }
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) this.loadData();
    });
  }

  delete(item: MaySuaChua): void {
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
