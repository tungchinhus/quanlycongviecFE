import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatNativeDateModule, MAT_DATE_FORMATS, DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TiepNhanThongTinService } from '../../../services/tiep-nhan-thong-tin.service';
import { TiepNhanThongTin } from '../../../models/tiep-nhan-thong-tin.model';
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
    MatSelectModule,
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
    const dateValidators = [dateOnlyValidator()];
    this.form = this.fb.group({
      phanLoai: [''],
      soTNTT: ['', Validators.required],
      dienAp: ['', Validators.required],
      thangNam: [''],
      tenNVPKD: [''],
      skVA: [''],
      soLuong: [0, [Validators.required, Validators.min(0)]],
      tieuChuan: [''],
      phuKienKemTheo: [''],
      khachHang: ['', Validators.required],
      ngayNhan: [null as Date | null, [Validators.required, ...dateValidators]],
      ngayGiao: [null as Date | null, dateValidators],
      ngayLuu: [null as Date | null, dateValidators],
      nguoiThucHien: [''],
      ngayHoanThanh: [null as Date | null, dateValidators],
      ghiChu: ['']
    });
  }

  ngOnInit(): void {
    if (this.data.mode === 'edit' && this.data.item) {
      const item = this.data.item;
      this.form.patchValue({
        phanLoai: item.phanLoai ?? '',
        soTNTT: item.soTNTT ?? '',
        dienAp: item.dienAp ?? '',
        thangNam: item.thangNam ?? '',
        tenNVPKD: item.tenNVPKD ?? '',
        skVA: item.skVA ?? '',
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
      phanLoai: v.phanLoai || null,
      soTNTT: v.soTNTT,
      dienAp: v.dienAp,
      thangNam: v.thangNam || null,
      tenNVPKD: v.tenNVPKD || null,
      skVA: v.skVA || null,
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

  // #region agent log
  private static readonly _LOG_ENDPOINT = 'http://127.0.0.1:7243/ingest/57bffb22-7512-45e6-b9e1-e296b244dac3';
  private static _log(location: string, message: string, data: Record<string, unknown>, hypothesisId: string): void {
    fetch(TiepNhanThongTinFormDialogComponent._LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'd73c6a' },
      body: JSON.stringify({
        sessionId: 'd73c6a',
        location,
        message,
        data,
        timestamp: Date.now(),
        hypothesisId
      })
    }).catch(() => {});
  }
  // #endregion
}
