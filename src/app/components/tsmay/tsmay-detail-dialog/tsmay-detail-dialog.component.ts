import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { TSMayService } from '../../../services/tsmay.service';
import { TSMay, CreateTSMayRequest } from '../../../models/tsmay.model';

@Component({
  selector: 'app-tsmay-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSnackBarModule,
    MatIconModule
  ],
  templateUrl: './tsmay-detail-dialog.component.html',
  styleUrls: ['./tsmay-detail-dialog.component.css']
})
export class TSMayDetailDialogComponent implements OnInit {
  tsMayForm: FormGroup;
  mode: 'view' | 'edit' = 'view';
  tsMay: TSMay | null = null;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<TSMayDetailDialogComponent>,
    private tsMayService: TSMayService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: {
      tsMay?: TSMay;
      mode?: 'view' | 'edit';
    }
  ) {
    this.mode = data.mode || 'view';
    this.tsMay = data.tsMay || null;

    this.tsMayForm = this.fb.group({
      congSuat: [{ value: null, disabled: this.mode === 'view' }],
      soMay: [{ value: '', disabled: this.mode === 'view' }, Validators.required],
      sbb: [{ value: '', disabled: this.mode === 'view' }],
      lsx: [{ value: '', disabled: this.mode === 'view' }],
      tChuanLSX: [{ value: '', disabled: this.mode === 'view' }],
      tbkt: [{ value: '', disabled: this.mode === 'view' }],
      po: [{ value: '', disabled: this.mode === 'view' }],
      io: [{ value: '', disabled: this.mode === 'view' }],
      pk75H1: [{ value: '', disabled: this.mode === 'view' }],
      pk75H2: [{ value: '', disabled: this.mode === 'view' }],
      uk75H1: [{ value: '', disabled: this.mode === 'view' }],
      uk75H2: [{ value: '', disabled: this.mode === 'view' }],
      udmHVH1: [{ value: '', disabled: this.mode === 'view' }],
      udmHVH2: [{ value: '', disabled: this.mode === 'view' }],
      udmLV: [{ value: '', disabled: this.mode === 'view' }],
      phase: [{ value: '', disabled: this.mode === 'view' }]
    });
  }

  ngOnInit() {
    if (this.tsMay) {
      this.tsMayForm.patchValue({
        congSuat: this.tsMay.congSuat || null,
        soMay: this.tsMay.soMay || '',
        sbb: this.tsMay.sbb || '',
        lsx: this.tsMay.lsx || '',
        tChuanLSX: this.tsMay.tChuanLSX || '',
        tbkt: this.tsMay.tbkt || '',
        po: this.tsMay.po || '',
        io: this.tsMay.io || '',
        pk75H1: this.tsMay.pk75H1 || '',
        pk75H2: this.tsMay.pk75H2 || '',
        uk75H1: this.tsMay.uk75H1 || '',
        uk75H2: this.tsMay.uk75H2 || '',
        udmHVH1: this.tsMay.udmHVH1 || '',
        udmHVH2: this.tsMay.udmHVH2 || '',
        udmLV: this.tsMay.udmLV || '',
        phase: this.tsMay.phase || ''
      });
    }
  }

  getTitle(): string {
    return this.mode === 'view' ? 'Xem Thông Số Máy' : 'Chỉnh Sửa Thông Số Máy';
  }

  isViewMode(): boolean {
    return this.mode === 'view';
  }

  onSave() {
    if (this.tsMayForm.invalid) {
      this.snackBar.open('Vui lòng điền đầy đủ thông tin bắt buộc.', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    if (!this.tsMay?.id) {
      this.snackBar.open('Không thể cập nhật: Thiếu ID của bản ghi.', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.isLoading = true;
    const formValue = this.tsMayForm.getRawValue();
    const updateData: Partial<CreateTSMayRequest> = {
      congSuat: formValue.congSuat || null,
      soMay: formValue.soMay || null,
      sbb: formValue.sbb || null,
      lsx: formValue.lsx || null,
      tChuanLSX: formValue.tChuanLSX || null,
      tbkt: formValue.tbkt || null,
      po: formValue.po || null,
      io: formValue.io || null,
      pk75H1: formValue.pk75H1 || null,
      pk75H2: formValue.pk75H2 || null,
      uk75H1: formValue.uk75H1 || null,
      uk75H2: formValue.uk75H2 || null,
      udmHVH1: formValue.udmHVH1 || null,
      udmHVH2: formValue.udmHVH2 || null,
      udmLV: formValue.udmLV || null,
      phase: formValue.phase || null
    };

    this.tsMayService.update(this.tsMay.id, updateData).subscribe({
      next: () => {
        this.snackBar.open('Cập nhật thành công!', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
        });
        this.dialogRef.close(true);
      },
      error: (error) => {
        console.error('Error updating TSMay:', error);
        this.isLoading = false;
        this.snackBar.open('Không thể cập nhật. Vui lòng thử lại sau.', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  onCancel() {
    this.dialogRef.close();
  }
}

