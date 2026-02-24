import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TiepNhanThongTinService } from '../../../services/tiep-nhan-thong-tin.service';
import { TiepNhanThongTin } from '../../../models/tiep-nhan-thong-tin.model';
import { formatDate } from '../../../utils/date.util';
import { TiepNhanThongTinFormDialogComponent } from '../tiep-nhan-thong-tin-form-dialog/tiep-nhan-thong-tin-form-dialog.component';

@Component({
  selector: 'app-tiep-nhan-thong-tin-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './tiep-nhan-thong-tin-list.component.html',
  styleUrls: ['./tiep-nhan-thong-tin-list.component.css']
})
export class TiepNhanThongTinListComponent implements OnInit {
  readonly dataSource = new MatTableDataSource<TiepNhanThongTin>([]);
  readonly displayedColumns = [
    'soTNTT',
    'dienAp',
    'soLuong',
    'khachHang',
    'ngayNhan',
    'ngayGiao',
    'ngayLuu',
    'actions'
  ];
  readonly isLoading = signal(false);

  constructor(
    private service: TiepNhanThongTinService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.service.getAll().subscribe({
      next: (list) => {
        this.dataSource.data = list;
        this.isLoading.set(false);
      },
      error: () => {
        this.snackBar.open('Không thể tải danh sách.', 'Đóng', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        this.isLoading.set(false);
      }
    });
  }

  formatDateValue(value: string | null | undefined): string {
    return formatDate(value ?? null);
  }

  openAdd(): void {
    const ref = this.dialog.open(TiepNhanThongTinFormDialogComponent, {
      width: '700px',
      data: { mode: 'add' }
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) this.loadData();
    });
  }

  openEdit(item: TiepNhanThongTin): void {
    const ref = this.dialog.open(TiepNhanThongTinFormDialogComponent, {
      width: '700px',
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
