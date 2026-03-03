import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MAT_DATE_FORMATS, DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MaySuaChuaService } from '../../../services/may-sua-chua.service';
import { MaySuaChua } from '../../../models/may-sua-chua.model';
import { DD_MM_YYYY_FORMAT, CustomDateAdapter } from '../../../config/date-format.config';
import { parseDateSafe, formatDateOnly } from '../../../utils/date.util';

function dateOnlyValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = control.value;
    if (v == null || v === '') return null;
    if (v instanceof Date && !isNaN(v.getTime())) return null;
    const parsed = parseDateSafe(typeof v === 'string' ? v : String(v));
    return parsed != null ? null : { invalidDate: { value: v } };
  };
}

@Component({
  selector: 'app-may-sua-chua-form-dialog',
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
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  providers: [
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMAT },
    { provide: MAT_DATE_LOCALE, useValue: 'vi-VN' }
  ],
  templateUrl: './may-sua-chua-form-dialog.component.html',
  styleUrls: ['./may-sua-chua-form-dialog.component.css']
})
export class MaySuaChuaFormDialogComponent implements OnInit {
  form: FormGroup;
  isSaving = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<MaySuaChuaFormDialogComponent>,
    private service: MaySuaChuaService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { mode: 'add' | 'edit'; item?: MaySuaChua; nam: number }
  ) {
    const dateValidators = [dateOnlyValidator()];
    this.form = this.fb.group({
      soTNTT_DV_DH_PKD: [''],
      thongTinKhachHang: [''],
      skVA: [''],
      dienAp: [''],
      ngayNhan: [null as Date | null, dateValidators],
      nguoiThucHien: [''],
      soMay: [''],
      soTBKTSua: [''],
      giaoPKD: [''],
      ghiChu: ['']
    });
  }

  ngOnInit(): void {
    if (this.data.mode === 'edit' && this.data.item) {
      const item = this.data.item;
      this.form.patchValue({
        soTNTT_DV_DH_PKD: item.soTNTT_DV_DH_PKD ?? '',
        thongTinKhachHang: item.thongTinKhachHang ?? '',
        skVA: item.skVA ?? '',
        dienAp: item.dienAp ?? '',
        ngayNhan: parseDateSafe(item.ngayNhan ?? null),
        nguoiThucHien: item.nguoiThucHien ?? '',
        soMay: item.soMay ?? '',
        soTBKTSua: item.soTBKTSua ?? '',
        giaoPKD: item.giaoPKD ?? '',
        ghiChu: item.ghiChu ?? ''
      });
    }
  }

  get title(): string {
    return this.data.mode === 'add' ? 'Thêm máy sửa chữa' : 'Sửa máy sửa chữa';
  }

  save(): void {
    if (this.form.invalid || this.isSaving) return;
    const v = this.form.value;
    const payload: MaySuaChua = {
      nam: this.data.nam,
      soTNTT_DV_DH_PKD: v.soTNTT_DV_DH_PKD || null,
      thongTinKhachHang: v.thongTinKhachHang || null,
      skVA: v.skVA || null,
      dienAp: v.dienAp || null,
      ngayNhan: formatDateOnly(v.ngayNhan) ?? null,
      nguoiThucHien: v.nguoiThucHien || null,
      soMay: v.soMay || null,
      soTBKTSua: v.soTBKTSua || null,
      giaoPKD: v.giaoPKD || null,
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
