import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TiepNhanThongTinService } from '../../../services/tiep-nhan-thong-tin.service';
import { TiepNhanThongTin } from '../../../models/tiep-nhan-thong-tin.model';
import { parseDateSafe, formatDateOnly } from '../../../utils/date.util';

@Component({
  selector: 'app-tiep-nhan-thong-tin-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule
  ],
  templateUrl: './tiep-nhan-thong-tin-form-dialog.component.html',
  styleUrls: ['./tiep-nhan-thong-tin-form-dialog.component.css']
})
export class TiepNhanThongTinFormDialogComponent implements OnInit {
  form: FormGroup;
  isSaving = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<TiepNhanThongTinFormDialogComponent>,
    private service: TiepNhanThongTinService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { mode: 'add' | 'edit'; item?: TiepNhanThongTin }
  ) {
    this.form = this.fb.group({
      soTNTT: ['', Validators.required],
      dienAp: ['', Validators.required],
      soLuong: [0, [Validators.required, Validators.min(0)]],
      tieuChuan: [''],
      phuKienKemTheo: [''],
      khachHang: ['', Validators.required],
      ngayNhan: [null as Date | null, Validators.required],
      ngayGiao: [null as Date | null],
      ngayLuu: [null as Date | null],
      nguoiThucHien: [''],
      ngayHoanThanh: [null as Date | null],
      ghiChu: ['']
    });
  }

  ngOnInit(): void {
    if (this.data.mode === 'edit' && this.data.item) {
      const item = this.data.item;
      this.form.patchValue({
        soTNTT: item.soTNTT ?? '',
        dienAp: item.dienAp ?? '',
        soLuong: item.soLuong ?? 0,
        tieuChuan: item.tieuChuan ?? '',
        phuKienKemTheo: item.phuKienKemTheo ?? '',
        khachHang: item.khachHang ?? '',
        ngayNhan: parseDateSafe(item.ngayNhan),
        ngayGiao: parseDateSafe(item.ngayGiao ?? null),
        ngayLuu: parseDateSafe(item.ngayLuu ?? null),
        nguoiThucHien: item.nguoiThucHien ?? '',
        ngayHoanThanh: parseDateSafe(item.ngayHoanThanh ?? null),
        ghiChu: item.ghiChu ?? ''
      });
    }
  }

  get title(): string {
    return this.data.mode === 'add' ? 'Thêm tiếp nhận thông tin' : 'Sửa tiếp nhận thông tin';
  }

  save(): void {
    if (this.form.invalid || this.isSaving) return;
    const v = this.form.value;
    const payload: TiepNhanThongTin = {
      soTNTT: v.soTNTT,
      dienAp: v.dienAp,
      soLuong: Number(v.soLuong) || 0,
      tieuChuan: v.tieuChuan || null,
      phuKienKemTheo: v.phuKienKemTheo || null,
      khachHang: v.khachHang,
      ngayNhan: formatDateOnly(v.ngayNhan) ?? '',
      ngayGiao: formatDateOnly(v.ngayGiao) ?? null,
      ngayLuu: formatDateOnly(v.ngayLuu) ?? null,
      nguoiThucHien: v.nguoiThucHien || null,
      ngayHoanThanh: formatDateOnly(v.ngayHoanThanh) ?? null,
      ghiChu: v.ghiChu || null
    };
    this.isSaving = true;
    if (this.data.mode === 'add') {
      this.service.create(payload).subscribe({
        next: () => {
          this.snackBar.open('Đã thêm.', 'Đóng', { duration: 2000, panelClass: ['success-snackbar'] });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.isSaving = false;
          this.snackBar.open(err.error?.message || 'Không thể thêm.', 'Đóng', { duration: 3000, panelClass: ['error-snackbar'] });
        }
      });
    } else {
      const id = this.data.item?.id;
      if (id == null) {
        this.isSaving = false;
        return;
      }
      this.service.update(id, payload).subscribe({
        next: () => {
          this.snackBar.open('Đã cập nhật.', 'Đóng', { duration: 2000, panelClass: ['success-snackbar'] });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.isSaving = false;
          this.snackBar.open(err.error?.message || 'Không thể cập nhật.', 'Đóng', { duration: 3000, panelClass: ['error-snackbar'] });
        }
      });
    }
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
