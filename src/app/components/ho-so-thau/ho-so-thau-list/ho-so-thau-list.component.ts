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
import { HoSoThauService } from '../../../services/ho-so-thau.service';
import { HoSoThau } from '../../../models/ho-so-thau.model';
import { formatDate } from '../../../utils/date.util';
import { HoSoThauFormDialogComponent } from '../ho-so-thau-form-dialog/ho-so-thau-form-dialog.component';

@Component({
  selector: 'app-ho-so-thau-list',
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
  templateUrl: './ho-so-thau-list.component.html',
  styleUrls: ['./ho-so-thau-list.component.css']
})
export class HoSoThauListComponent implements OnInit {
  readonly dataSource = new MatTableDataSource<HoSoThau>([]);
  readonly displayedColumns = ['soHST', 'donViMoiThau', 'soTBMTIB', 'ngayNhan', 'ngayGiaoPhongKD', 'actions'];
  readonly isLoading = signal(false);

  constructor(
    private service: HoSoThauService,
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
    const ref = this.dialog.open(HoSoThauFormDialogComponent, {
      width: '600px',
      data: { mode: 'add' }
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) this.loadData();
    });
  }

  openEdit(item: HoSoThau): void {
    const ref = this.dialog.open(HoSoThauFormDialogComponent, {
      width: '600px',
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
