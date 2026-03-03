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
import { HoSoThauService } from '../../../services/ho-so-thau.service';
import { HoSoThau } from '../../../models/ho-so-thau.model';
import { DD_MM_YYYY_FORMAT, CustomDateAdapter } from '../../../config/date-format.config';
import { parseDateSafe, formatDateOnly } from '../../../utils/date.util';

/** Validator: chỉ chấp nhận giá trị là Date hợp lệ hoặc chuỗi ngày dd/MM/yyyy */
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
  selector: 'app-ho-so-thau-form-dialog',
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
  templateUrl: './ho-so-thau-form-dialog.component.html',
  styleUrls: ['./ho-so-thau-form-dialog.component.css']
})
export class HoSoThauFormDialogComponent implements OnInit {
  form: FormGroup;
  isSaving = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<HoSoThauFormDialogComponent>,
    private service: HoSoThauService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { mode: 'add' | 'edit'; item?: HoSoThau }
  ) {
    const dateValidators = [dateOnlyValidator()];
    this.form = this.fb.group({
      soHST: ['', Validators.required],
      donViMoiThau: ['', Validators.required],
      soTBMTIB: [''],
      ngayNhan: [null as Date | null, [Validators.required, ...dateValidators]],
      ngayGiaoPhongKD: [null as Date | null, dateValidators],
      ghiChu: ['']
    });
  }

  ngOnInit(): void {
    if (this.data.mode === 'edit' && this.data.item) {
      const item = this.data.item;
      this.form.patchValue({
        soHST: item.soHST ?? '',
        donViMoiThau: item.donViMoiThau ?? '',
        soTBMTIB: item.soTBMTIB ?? '',
        ngayNhan: parseDateSafe(item.ngayNhan),
        ngayGiaoPhongKD: parseDateSafe(item.ngayGiaoPhongKD ?? null),
        ghiChu: item.ghiChu ?? ''
      });
    }
  }

  get title(): string {
    return this.data.mode === 'add' ? 'Thêm hồ sơ thầu' : 'Sửa hồ sơ thầu';
  }

  save(): void {
    if (this.form.invalid || this.isSaving) return;
    const v = this.form.value;
    const payload: HoSoThau = {
      soHST: v.soHST,
      donViMoiThau: v.donViMoiThau,
      soTBMTIB: v.soTBMTIB || null,
      ngayNhan: formatDateOnly(v.ngayNhan) ?? '',
      ngayGiaoPhongKD: formatDateOnly(v.ngayGiaoPhongKD) ?? null,
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
