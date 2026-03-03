import { Component, OnInit, signal, inject, Inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MAT_DATE_FORMATS, DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { DD_MM_YYYY_FORMAT, CustomDateAdapter } from '../../config/date-format.config';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AssignmentService } from '../../services/assignment.service';
import { TechnicalSheet } from '../../models/machine-assignment.model';
import { AuthUser, AuthService } from '../../services/auth.service';
import { UserRole } from '../../constants/enums';

@Component({
  selector: 'app-tbkt-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatDialogModule,
    MatMenuModule,
    MatSnackBarModule
  ],
  providers: [
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMAT },
    { provide: MAT_DATE_LOCALE, useValue: 'vi-VN' }
  ],
  templateUrl: './tbkt-management.component.html',
  styleUrls: ['./tbkt-management.component.css']
})
export class TBKTManagementComponent implements OnInit {
  private readonly assignmentService = inject(AssignmentService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly tbktList = signal<TechnicalSheet[]>([]);
  readonly filteredList = signal<TechnicalSheet[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly searchTerm = signal<string>('');
  
  readonly displayedColumns: string[] = [
    'tbkt_ID',
    'phase',
    'power_kVA',
    'voltageSpec',
    'drawingDate',
    'actions'
  ];

  ngOnInit(): void {
    this.loadTBKTData();
  }

  loadTBKTData(): void {
    this.loading.set(true);
    this.error.set(null);

    // Nếu là Admin/Manager, không truyền firebaseUID để xem tất cả
    // Nếu không phải Admin/Manager, truyền firebaseUID để chỉ xem của mình
    const currentUser = this.authService.user();
    const isAdminOrManager = this.authService.hasAnyRole([
      UserRole.Administrator, 
      'Administrator', 
      'Admin',
      UserRole.Manager,
      'Manager'
    ]);
    const firebaseUID = isAdminOrManager ? undefined : currentUser?.firebaseUid;

    this.assignmentService.getAllTechnicalSheets(firebaseUID).subscribe({
      next: (sheets) => {
        // Sort by TBKT_ID
        const sorted = sheets.sort((a, b) => {
          const aId = String(a.tbkt_ID || '');
          const bId = String(b.tbkt_ID || '');
          return aId.localeCompare(bId);
        });
        this.tbktList.set(sorted);
        this.applyFilter();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading TBKT data:', err);
        this.error.set('Không thể tải dữ liệu TBKT. Vui lòng thử lại sau.');
        this.loading.set(false);
      }
    });
  }

  openAddDialog(): void {
    const dialogRef = this.dialog.open(TBKTFormDialogComponent, {
      width: '90%',
      maxWidth: '1000px',
      minWidth: '320px',
      disableClose: false,
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Clear search and reload data after successful save
        this.searchTerm.set('');
        // Reload immediately - backend should have processed the request
        this.loadTBKTData();
      }
    });
  }

  openEditDialog(sheet: TechnicalSheet): void {
    const dialogRef = this.dialog.open(TBKTFormDialogComponent, {
      width: '90%',
      maxWidth: '1000px',
      minWidth: '320px',
      disableClose: false,
      data: { 
        sheet: { ...sheet }
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Clear search and reload data after successful update
        this.searchTerm.set('');
        // Reload immediately - backend should have processed the request
        this.loadTBKTData();
      }
    });
  }

  deleteTBKT(sheet: TechnicalSheet): void {
    const tbktId = String(sheet.tbkt_ID || '');
    if (!confirm(`Bạn có chắc muốn xóa đề nghị TBKT "${tbktId}"?`)) {
      return;
    }

    this.assignmentService.deleteTechnicalSheet(sheet.tbkt_ID).subscribe({
      next: () => {
        this.snackBar.open('Xóa đề nghị TBKT thành công!', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
        // Clear search and reload
        this.searchTerm.set('');
        this.loadTBKTData();
      },
      error: (err) => {
        console.error('Error deleting TBKT:', err);
        let errorMessage = 'Không thể xóa đề nghị TBKT. ';
        
        if (err.status === 500) {
          const backendError = err.error?.message || err.error?.error || '';
          if (backendError.includes('foreign key') || backendError.includes('constraint')) {
            errorMessage += 'Đề nghị TBKT này đang được sử dụng trong các gán công việc. Vui lòng xóa các gán công việc liên quan trước.';
          } else if (backendError) {
            errorMessage += backendError;
          } else {
            errorMessage += 'Lỗi server. Vui lòng thử lại sau.';
          }
        } else if (err.status === 404) {
          errorMessage += 'Không tìm thấy đề nghị TBKT cần xóa.';
        } else if (err.error?.message) {
          errorMessage += err.error.message;
        } else {
          errorMessage += 'Vui lòng thử lại sau.';
        }
        
        this.snackBar.open(errorMessage, 'Đóng', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  /**
   * Format date to ISO string with local timezone offset
   * This ensures the date saved matches what the user entered in the UI
   * Format: YYYY-MM-DDTHH:mm:ss+HH:mm (local time at midnight with timezone offset)
   */
  formatLocalDate(date: Date): string {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Get timezone offset in minutes and convert to HH:mm format
    const offsetMinutes = date.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
    const offsetMins = Math.abs(offsetMinutes) % 60;
    const offsetSign = offsetMinutes <= 0 ? '+' : '-';
    const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
    
    // Return ISO string with local midnight and timezone offset
    return `${year}-${month}-${day}T00:00:00${offsetString}`;
  }

  formatDate(date: Date | string | null | undefined): string {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';
    
    // Format as DD/MM/YYYY
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    return `${('00' + day).slice(-2)}/${('00' + month).slice(-2)}/${year}`;
  }

  refresh(): void {
    this.loadTBKTData();
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.applyFilter();
  }

  applyFilter(): void {
    const search = this.searchTerm().toLowerCase().trim();
    const list = this.tbktList();
    
    if (!search) {
      this.filteredList.set(list);
      return;
    }

    const filtered = list.filter(sheet => {
      const tbktId = String(sheet.tbkt_ID || '').toLowerCase();
      const phase = String(sheet.phase || '').toLowerCase();
      const power = String(sheet.power_kVA || '').toLowerCase();
      const voltage = String(sheet.voltageSpec || '').toLowerCase();
      const proposer = sheet.proposer ? String(sheet.proposer).toLowerCase() : '';
      const notes = String(sheet.notes || '').toLowerCase();
      
      return tbktId.includes(search) ||
             phase.includes(search) ||
             power.includes(search) ||
             voltage.includes(search) ||
             proposer.includes(search) ||
             notes.includes(search);
    });
    
    this.filteredList.set(filtered);
  }
}

// Dialog Component for Add/Edit TBKT
@Component({
  selector: 'app-tbkt-form-dialog',
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
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  providers: [
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMAT },
    { provide: MAT_DATE_LOCALE, useValue: 'vi-VN' }
  ],
  template: `
    <h2 mat-dialog-title>
      {{ isEditMode ? 'Sửa Đề Nghị TBKT' : 'Thêm Đề Nghị TBKT Mới' }}
    </h2>
    
    <mat-dialog-content>
      <form [formGroup]="tbktForm" class="tbkt-form">
        <div class="form-row">
          <mat-form-field appearance="outline" class="tbkt-field" [class.mat-form-field-invalid]="tbktForm.get('tbktNumber')?.hasError('duplicate')">
            <mat-label>Số TBKT *</mat-label>
            <input #tbktNumberInput matInput formControlName="tbktNumber" placeholder="Nhập số TBKT" [readonly]="isEditMode" required (input)="onTbktNumberInput($event)" type="text" inputmode="numeric">
            <mat-hint *ngIf="!isEditMode && nextTbktNumber()">Gợi ý tiếp theo: {{ nextTbktNumber() }}</mat-hint>
            <mat-error *ngIf="tbktForm.get('tbktNumber')?.hasError('required')">
              Số TBKT là bắt buộc
            </mat-error>
            <mat-error *ngIf="tbktForm.get('tbktNumber')?.hasError('pattern')">
              Chỉ được nhập số
            </mat-error>
            <mat-error *ngIf="tbktForm.get('tbktNumber')?.hasError('duplicate')">
              TBKT này đã tồn tại. Vui lòng nhập số hoặc chữ cái khác.
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="tbkt-field uppercase-field" [class.mat-form-field-invalid]="tbktForm.get('tbktLetter')?.hasError('duplicate')">
            <mat-label>TBKT (In hoa) *</mat-label>
            <input #tbktLetterInput matInput formControlName="tbktLetter" placeholder="Nhập chữ cái" required (input)="onTbktLetterInput($event)" type="text">
            <mat-hint *ngIf="!isEditMode && nextTbktLetter()">Gợi ý tiếp theo: {{ nextTbktLetter() }}</mat-hint>
            <mat-error *ngIf="tbktForm.get('tbktLetter')?.hasError('required')">
              Chữ cái TBKT là bắt buộc
            </mat-error>
            <mat-error *ngIf="tbktForm.get('tbktLetter')?.hasError('pattern')">
              Chỉ được nhập chữ cái
            </mat-error>
            <mat-error *ngIf="tbktForm.get('tbktLetter')?.hasError('duplicate')">
              TBKT này đã tồn tại. Vui lòng nhập số hoặc chữ cái khác.
            </mat-error>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Số Pha</mat-label>
            <input matInput formControlName="phase" placeholder="1 hoặc 3" maxlength="10">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Công Suất</mat-label>
            <input matInput type="number" formControlName="power_kVA" placeholder="Nhập công suất">
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>ĐIỆN ÁP</mat-label>
            <input matInput formControlName="voltageSpec" placeholder="Ví dụ: 35±2x2.5%/0,4kV Dyn11" maxlength="255">
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>SO (Nếu có)</mat-label>
            <input matInput formControlName="salesOrder" placeholder="Nhập số đơn hàng" maxlength="100">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>TIÊU CHUẨN (Nếu có)</mat-label>
            <input matInput formControlName="standardCode" placeholder="Ví dụ: IEEE/DOE" maxlength="100">
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>NGÀY GIAO</mat-label>
            <input matInput [matDatepicker]="drawingDatePicker" formControlName="drawingDate">
            <mat-datepicker-toggle matIconSuffix [for]="drawingDatePicker"></mat-datepicker-toggle>
            <mat-datepicker #drawingDatePicker></mat-datepicker>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>GHI CHÚ</mat-label>
            <textarea matInput formControlName="notes" rows="3" placeholder="Nhập ghi chú"></textarea>
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">
        <mat-icon>close</mat-icon>
        Hủy
      </button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="tbktForm.invalid || saving()">
        <mat-icon *ngIf="!saving()">save</mat-icon>
        <mat-spinner *ngIf="saving()" diameter="20" style="display: inline-block; margin-right: 8px;"></mat-spinner>
        Lưu
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .tbkt-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px 0;
    }

    .form-row {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }

    .form-row mat-form-field {
      flex: 1;
    }

    .tbkt-field {
      flex: 1;
    }

    .mat-form-field-invalid .mat-form-field-outline {
      color: #f44336 !important;
    }

    .mat-form-field-invalid .mat-form-field-label {
      color: #f44336 !important;
    }

    .uppercase-field input {
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .full-width {
      width: 100%;
    }

    mat-dialog-content {
      min-height: 400px;
      max-height: 80vh;
      overflow-y: auto;
    }

    mat-dialog-actions {
      padding: 16px 24px;
    }
  `]
})
export class TBKTFormDialogComponent implements AfterViewInit {
  private readonly assignmentService = inject(AssignmentService);
  private readonly dialogRef = inject(MatDialogRef<TBKTFormDialogComponent>);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  @ViewChild('tbktNumberInput', { static: false }) tbktNumberInput!: ElementRef<HTMLInputElement>;
  @ViewChild('tbktLetterInput', { static: false }) tbktLetterInput!: ElementRef<HTMLInputElement>;

  readonly saving = signal(false);
  readonly isEditMode: boolean;
  readonly currentUser: AuthUser | null = null;
  readonly nextTbktId = signal<string | null>(null);
  readonly nextTbktNumber = signal<string | null>(null);
  readonly nextTbktLetter = signal<string | null>(null);

  tbktForm: FormGroup;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    this.isEditMode = !!data?.sheet;
    this.currentUser = this.authService.user();

    const sheet = data?.sheet || {};
    
    // Split tbkt_ID into number and letter parts
    const tbktIdStr = String(sheet.tbkt_ID || '');
    const tbktNumber = tbktIdStr.replace(/[^0-9]/g, ''); // Extract only numbers
    const tbktLetter = tbktIdStr.replace(/[^A-Za-z]/g, '').toUpperCase(); // Extract only letters and uppercase

    this.tbktForm = this.fb.group({
      tbktNumber: [tbktNumber, [Validators.required, Validators.pattern(/^[0-9]*$/)]],
      tbktLetter: [tbktLetter, [Validators.required, Validators.pattern(/^[A-Za-z]*$/)]],
      phase: [sheet.phase || '', Validators.maxLength(10)],
      power_kVA: [sheet.power_kVA || null],
      voltageSpec: [sheet.voltageSpec || '', Validators.maxLength(255)],
      salesOrder: [sheet.salesOrder || '', Validators.maxLength(100)],
      standardCode: [sheet.standardCode || '', Validators.maxLength(100)],
      drawingDate: [sheet.drawingDate ? new Date(sheet.drawingDate) : null],
      notes: [sheet.notes || '']
    });

    // Load next TBKT ID suggestion only when adding new (not editing)
    if (!this.isEditMode) {
      this.assignmentService.getNextTechnicalSheetId().subscribe({
        next: (result) => {
          this.nextTbktId.set(result.nextTbktId);
          // Split the suggestion into number and letter parts
          const suggestedId = String(result.nextTbktId || '');
          const suggestedNumber = suggestedId.replace(/[^0-9]/g, '');
          const suggestedLetter = suggestedId.replace(/[^A-Za-z]/g, '').toUpperCase();
          this.nextTbktNumber.set(suggestedNumber || null);
          this.nextTbktLetter.set(suggestedLetter || null);
        },
        error: (err) => {
          console.error('Error getting next TBKT ID:', err);
          // Don't show error to user, just log it
        }
      });
    }
  }

  ngAfterViewInit(): void {
    // Focus on TBKT number input after view init if not in edit mode
    if (!this.isEditMode && this.tbktNumberInput) {
      setTimeout(() => {
        this.tbktNumberInput.nativeElement.focus();
      }, 100);
    }
  }

  onTbktNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;
    // Remove any non-numeric characters
    value = value.replace(/[^0-9]/g, '');
    // Update the form control value
    this.tbktForm.patchValue({ tbktNumber: value }, { emitEvent: false });
    // Update the input field directly to prevent non-numeric characters
    if (input.value !== value) {
      input.value = value;
    }
    // Clear duplicate error from both fields when user starts typing
    const tbktNumberControl = this.tbktForm.get('tbktNumber');
    const tbktLetterControl = this.tbktForm.get('tbktLetter');
    if (tbktNumberControl?.hasError('duplicate')) {
      const errors = { ...tbktNumberControl.errors };
      delete errors['duplicate'];
      tbktNumberControl.setErrors(Object.keys(errors).length > 0 ? errors : null);
    }
    if (tbktLetterControl?.hasError('duplicate')) {
      const errors = { ...tbktLetterControl.errors };
      delete errors['duplicate'];
      tbktLetterControl.setErrors(Object.keys(errors).length > 0 ? errors : null);
    }
  }

  onTbktLetterInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;
    // Remove any non-letter characters and convert to uppercase
    value = value.replace(/[^A-Za-z]/g, '').toUpperCase();
    // Update the form control value
    this.tbktForm.patchValue({ tbktLetter: value }, { emitEvent: false });
    // Update the input field directly to prevent non-letter characters
    if (input.value !== value) {
      input.value = value;
    }
    // Clear duplicate error from both fields when user starts typing
    const tbktNumberControl = this.tbktForm.get('tbktNumber');
    const tbktLetterControl = this.tbktForm.get('tbktLetter');
    if (tbktNumberControl?.hasError('duplicate')) {
      const errors = { ...tbktNumberControl.errors };
      delete errors['duplicate'];
      tbktNumberControl.setErrors(Object.keys(errors).length > 0 ? errors : null);
    }
    if (tbktLetterControl?.hasError('duplicate')) {
      const errors = { ...tbktLetterControl.errors };
      delete errors['duplicate'];
      tbktLetterControl.setErrors(Object.keys(errors).length > 0 ? errors : null);
    }
  }

  /**
   * Format date to ISO string with local timezone offset
   * This ensures the date saved matches what the user entered in the UI
   * Format: YYYY-MM-DDTHH:mm:ss+HH:mm (local time at midnight with timezone offset)
   */
  formatLocalDate(date: Date): string {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Get timezone offset in minutes and convert to HH:mm format
    const offsetMinutes = date.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
    const offsetMins = Math.abs(offsetMinutes) % 60;
    const offsetSign = offsetMinutes <= 0 ? '+' : '-';
    const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
    
    // Return ISO string with local midnight and timezone offset
    return `${year}-${month}-${day}T00:00:00${offsetString}`;
  }

  onSave(): void {
    if (this.tbktForm.invalid) {
      return;
    }

    this.saving.set(true);
    const formValue = this.tbktForm.value;

    // Proposer is always the current logged-in user's FirebaseUID (as string)
    const proposerFirebaseUID = this.currentUser?.firebaseUid;

    // Combine number and letter parts to form tbkt_ID
    const tbktNumber = String(formValue.tbktNumber || '').trim();
    const tbktLetter = String(formValue.tbktLetter || '').trim().toUpperCase();
    const combinedTbktId = tbktNumber + tbktLetter;

    const sheetData: Partial<TechnicalSheet> = {
      tbkt_ID: combinedTbktId,
      phase: formValue.phase || undefined,
      power_kVA: formValue.power_kVA || undefined,
      voltageSpec: formValue.voltageSpec || undefined,
      salesOrder: formValue.salesOrder || undefined,
      standardCode: formValue.standardCode || undefined,
      proposer: proposerFirebaseUID, // Store FirebaseUID as string
      drawingDate: formValue.drawingDate ? this.formatLocalDate(formValue.drawingDate) : undefined,
      // archivedDate will be set automatically by backend when creating new (not when editing)
      archivedDate: this.isEditMode ? undefined : this.formatLocalDate(new Date()),
      notes: formValue.notes || undefined
    };

    const operation = this.isEditMode
      ? this.assignmentService.updateTechnicalSheet(sheetData.tbkt_ID!, sheetData)
      : this.assignmentService.createTechnicalSheet(sheetData);

    operation.subscribe({
      next: (result) => {
        this.snackBar.open(
          this.isEditMode ? 'Cập nhật đề nghị TBKT thành công!' : 'Thêm đề nghị TBKT thành công!',
          'Đóng',
          {
            duration: 2000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['success-snackbar']
          }
        );
        // Close dialog after showing success message
        setTimeout(() => {
          this.dialogRef.close(true);
        }, 100);
      },
      error: (err) => {
        console.error('Error saving TBKT:', err);
        let errorMessage = this.isEditMode 
          ? 'Không thể cập nhật đề nghị TBKT. ' 
          : 'Không thể thêm đề nghị TBKT. ';
        
        const errorMsg = err.error?.message || '';
        const isDuplicateError = err.status === 409 || 
                                 errorMsg.toLowerCase().includes('already exists') ||
                                 errorMsg.toLowerCase().includes('đã tồn tại');
        
        if (err.status === 400) {
          errorMessage += errorMsg || 'Dữ liệu không hợp lệ.';
        } else if (isDuplicateError) {
          errorMessage += 'Số TBKT đã tồn tại.';
          
          // Set error on both TBKT number and letter fields
          const tbktNumberControl = this.tbktForm.get('tbktNumber');
          const tbktLetterControl = this.tbktForm.get('tbktLetter');
          
          if (tbktNumberControl) {
            // Preserve existing errors and add duplicate error
            const currentErrors = tbktNumberControl.errors || {};
            tbktNumberControl.setErrors({ ...currentErrors, duplicate: true });
            tbktNumberControl.markAsTouched();
          }
          
          if (tbktLetterControl) {
            // Preserve existing errors and add duplicate error
            const currentErrors = tbktLetterControl.errors || {};
            tbktLetterControl.setErrors({ ...currentErrors, duplicate: true });
            tbktLetterControl.markAsTouched();
          }
          
          // Focus on TBKT number input field (first field)
          setTimeout(() => {
            if (this.tbktNumberInput?.nativeElement) {
              this.tbktNumberInput.nativeElement.focus();
              this.tbktNumberInput.nativeElement.select();
            }
          }, 100);
        } else if (errorMsg) {
          errorMessage += errorMsg;
        } else {
          errorMessage += 'Vui lòng thử lại sau.';
        }
        
        this.snackBar.open(errorMessage, 'Đóng', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
        this.saving.set(false);
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}

