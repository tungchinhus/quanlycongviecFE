import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { WorkItemService } from '../../../services/work-item.service';
import { FileService } from '../../../services/file.service';
import { AuthService } from '../../../services/auth.service';
import { WorkItemWithAssignment } from '../../../models/machine-assignment.model';
import { FileDocument } from '../../../models/file.model';

@Component({
  selector: 'app-work-item-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './work-item-dialog.component.html',
  styleUrls: ['./work-item-dialog.component.css']
})
export class WorkItemDialogComponent implements OnInit {
  workItemForm: FormGroup;
  mode: 'view' | 'edit' | 'create' = 'create';
  workItem: WorkItemWithAssignment | null = null;
  currentUserName: string = '';
  readonly selectedFiles = signal<File[]>([]);
  readonly isUploading = signal<boolean>(false);
  files: FileDocument[] = [];

  // Mapping workType sang tiếng Việt
  private workTypeMap: { [key: string]: string } = {
    'Core Design': 'Thiết kế ruột',
    'Core Review': 'Kiểm soát ruột',
    'Casing Design': 'Thiết kế vỏ',
    'Casing Review': 'Kiểm soát vỏ',
    'Material Leveling': 'Định mức vật tư'
  };

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<WorkItemDialogComponent>,
    private workItemService: WorkItemService,
    private fileService: FileService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { 
      workItem?: WorkItemWithAssignment;
      mode?: 'view' | 'edit' | 'create';
      assignments?: any[];
    }
  ) {
    this.mode = data.mode || 'create';
    this.workItem = data.workItem || null;
    
    // Lấy tên user đang login
    const currentUser = this.authService.user();
    this.currentUserName = currentUser?.name || currentUser?.userName || '';

    // Loại công việc luôn disabled (chỉ hiển thị)
    this.workItemForm = this.fb.group({
      workType: [{ value: '', disabled: true }], // Luôn disabled
      startDate: [{ value: null, disabled: this.mode === 'view' }],
      expectedFinish: [{ value: null, disabled: this.mode === 'view' }],
      actualFinish: [{ value: null, disabled: this.mode === 'view' }],
      personConfirmation: [{ value: false, disabled: this.mode === 'view' }],
      notes: [{ value: '', disabled: this.mode === 'view' }]
    });
  }

  ngOnInit() {
    if (this.workItem) {
      // Populate form với data từ workItem
      this.workItemForm.patchValue({
        workType: this.getWorkTypeDisplayName(this.workItem.workType || ''),
        startDate: this.workItem.startDate ? new Date(this.workItem.startDate) : null,
        expectedFinish: this.workItem.expectedFinish ? new Date(this.workItem.expectedFinish) : null,
        actualFinish: this.workItem.actualFinish ? new Date(this.workItem.actualFinish) : null,
        personConfirmation: this.workItem.personConfirmation || false,
        notes: this.workItem.notes || ''
      });

      // Load files nếu có assignmentID
      if (this.workItem.assignmentID) {
        this.loadFiles();
      }
    }
  }

  getWorkTypeDisplayName(workType: string): string {
    return this.workTypeMap[workType] || workType;
  }

  loadFiles() {
    if (!this.workItem?.assignmentID) return;
    
    this.fileService.getFilesByAssignment(this.workItem.assignmentID).subscribe({
      next: (files) => {
        this.files = files;
      },
      error: (err) => {
        console.error('Error loading files:', err);
      }
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const newFiles = Array.from(input.files);
      this.selectedFiles.set([...this.selectedFiles(), ...newFiles]);
      // Reset input để có thể chọn lại file giống nhau
      input.value = '';
    }
  }

  removeFile(index: number) {
    const files = this.selectedFiles();
    files.splice(index, 1);
    this.selectedFiles.set([...files]);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  uploadFiles() {
    const files = this.selectedFiles();
    if (files.length === 0 || !this.workItem?.assignmentID) return;

    this.isUploading.set(true);
    const assignmentID = this.workItem.assignmentID;
    
    const uploadObservables = files.map(file => 
      this.fileService.uploadFile(
        file, 
        assignmentID, 
        `File đính kèm cho công việc #${this.workItem?.workItemID}`
      ).pipe(
        catchError(error => {
          console.error(`Error uploading file ${file.name}:`, error);
          return of(null);
        })
      )
    );

    forkJoin(uploadObservables).subscribe({
      next: (results) => {
        const successFiles = results.filter(r => r !== null) as FileDocument[];
        const successCount = successFiles.length;
        const failCount = results.length - successCount;

        this.isUploading.set(false);
        this.selectedFiles.set([]);

        // Reload files list
        this.loadFiles();

        if (failCount === 0) {
          this.snackBar.open(`Upload ${successCount} file thành công!`, 'Đóng', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          });
        } else {
          this.snackBar.open(
            `Upload ${successCount}/${results.length} file thành công.`,
            'Đóng',
            {
              duration: 5000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
              panelClass: ['warning-snackbar']
            }
          );
        }
      },
      error: (err) => {
        this.isUploading.set(false);
        console.error('Error uploading files:', err);
        this.snackBar.open('Lỗi khi upload file. Vui lòng thử lại.', 'Đóng', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  deleteFile(file: FileDocument) {
    const fileId = file.id || file.fileID;
    if (!fileId) return;

    if (confirm('Bạn có chắc muốn xóa file này?')) {
      this.fileService.deleteFile(fileId).subscribe({
        next: () => {
          this.snackBar.open('Xóa file thành công!', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          });
          this.loadFiles();
        },
        error: (err) => {
          console.error('Error deleting file:', err);
          this.snackBar.open('Lỗi khi xóa file. Vui lòng thử lại.', 'Đóng', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  downloadFile(file: FileDocument) {
    const fileId = file.id || file.fileID;
    if (!fileId) return;

    this.fileService.downloadFile(fileId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.fileName || 'download';
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error downloading file:', err);
        this.snackBar.open('Lỗi khi tải file. Vui lòng thử lại.', 'Đóng', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  onSave() {
    if (this.mode === 'view') {
      this.dialogRef.close();
      return;
    }

    if (this.workItemForm.valid && this.workItem) {
      const formValue = this.workItemForm.getRawValue();
      const updateData: any = {
        workType: formValue.workType,
        startDate: formValue.startDate ? new Date(formValue.startDate).toISOString() : null,
        expectedFinish: formValue.expectedFinish ? new Date(formValue.expectedFinish).toISOString() : null,
        actualFinish: formValue.actualFinish ? new Date(formValue.actualFinish).toISOString() : null,
        personConfirmation: formValue.personConfirmation,
        notes: formValue.notes
      };

      this.workItemService.updateWorkItem(this.workItem.workItemID, updateData).subscribe({
        next: () => {
          this.snackBar.open('Cập nhật công việc thành công!', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          });
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error('Error updating work item:', err);
          const errorMessage = err.error?.message || 'Lỗi khi cập nhật công việc';
          this.snackBar.open(errorMessage, 'Đóng', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

  getTitle(): string {
    if (this.mode === 'view') {
      return 'Chi Tiết Công Việc';
    } else if (this.mode === 'edit') {
      return 'Cập nhật';
    }
    return 'Tạo Công Việc Mới';
  }

  isViewMode(): boolean {
    return this.mode === 'view';
  }
}

