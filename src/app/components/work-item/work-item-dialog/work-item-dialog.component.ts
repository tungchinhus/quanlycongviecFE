import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MAT_DATE_FORMATS, DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { DD_MM_YYYY_FORMAT, CustomDateAdapter } from '../../../config/date-format.config';
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
  providers: [
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMAT },
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_LOCALE, useValue: 'vi-VN' }
  ],
  templateUrl: './work-item-dialog.component.html',
  styleUrls: ['./work-item-dialog.component.css']
})
export class WorkItemDialogComponent implements OnInit {
  workItemForm: FormGroup;
  mode: 'view' | 'edit' | 'create' = 'create';
  workItem: WorkItemWithAssignment | null = null;
  currentUserName: string = '';
  currentUser: any = null;
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
    
    // Lấy thông tin user đang login
    this.currentUser = this.authService.user();
    this.currentUserName = this.currentUser?.name || this.currentUser?.userName || '';

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

  // Convert từ tiếng Việt về tiếng Anh (reverse mapping)
  getWorkTypeEnglish(displayName: string): string {
    const reverseMap: { [key: string]: string } = {
      'Thiết kế ruột': 'Core Design',
      'Kiểm soát ruột': 'Core Review',
      'Thiết kế vỏ': 'Casing Design',
      'Kiểm soát vỏ': 'Casing Review',
      'Định mức vật tư': 'Material Leveling'
    };
    return reverseMap[displayName] || displayName;
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
      // Không tự động upload, chỉ upload khi bấm Lưu
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

  uploadFiles(): Promise<boolean> {
    const files = this.selectedFiles();
    if (files.length === 0 || !this.workItem?.assignmentID) {
      return Promise.resolve(true);
    }

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
          // Trả về object chứa thông tin lỗi thay vì null
          return of({ error: true, fileName: file.name, errorMessage: error.error?.message || error.message || 'Lỗi không xác định' });
        })
      )
    );

    return new Promise((resolve) => {
      forkJoin(uploadObservables).subscribe({
        next: (results) => {
          const successFiles = results.filter(r => r !== null && !(r as any).error) as FileDocument[];
          const failedFiles = results.filter(r => r !== null && (r as any).error) as any[];
          const successCount = successFiles.length;
          const failCount = failedFiles.length;

          this.isUploading.set(false);
          this.selectedFiles.set([]);

          // Reload files list
          this.loadFiles();

          if (failCount === 0) {
            // Không hiển thị snackbar ở đây vì đã có thông báo ở onSave
            resolve(true);
          } else {
            // Log chi tiết lỗi
            failedFiles.forEach(f => {
              console.error(`Failed to upload ${f.fileName}: ${f.errorMessage}`);
            });
            // Trả về false để onSave có thể hiển thị cảnh báo
            resolve(false);
          }
        },
        error: (err) => {
          this.isUploading.set(false);
          console.error('Error uploading files:', err);
          // Không hiển thị snackbar ở đây, để onSave xử lý
          resolve(false);
        }
      });
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

  async onSave() {
    if (this.mode === 'view') {
      this.dialogRef.close();
      return;
    }

    if (!this.workItemForm.valid || !this.workItem) {
      this.snackBar.open('Vui lòng điền đầy đủ thông tin', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Kiểm tra workItemID có tồn tại
    if (!this.workItem.workItemID || this.workItem.workItemID <= 0) {
      this.snackBar.open('Không tìm thấy công việc cần cập nhật', 'Đóng', {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    const formValue = this.workItemForm.getRawValue();
    
    // Lấy workType từ workItem gốc (tiếng Anh) thay vì từ form (tiếng Việt)
    // Hoặc convert từ tiếng Việt về tiếng Anh nếu cần
    const workTypeEnglish = this.workItem?.workType || this.getWorkTypeEnglish(formValue.workType);
    
    // Xây dựng updateData object - chỉ gửi các field có giá trị
    const updateData: any = {};
    
    // WorkType: lấy từ workItem gốc (tiếng Anh) hoặc convert từ tiếng Việt
    if (workTypeEnglish) {
      updateData.workType = workTypeEnglish;
    }
    
    // Dates: chỉ gửi nếu có giá trị
    if (formValue.startDate) {
      updateData.startDate = new Date(formValue.startDate).toISOString();
    }
    if (formValue.expectedFinish) {
      updateData.expectedFinish = new Date(formValue.expectedFinish).toISOString();
    }
    if (formValue.actualFinish) {
      updateData.actualFinish = new Date(formValue.actualFinish).toISOString();
    }
    
    // PersonConfirmation: gửi cả false
    if (formValue.personConfirmation !== undefined && formValue.personConfirmation !== null) {
      updateData.personConfirmation = formValue.personConfirmation;
    }
    
    // Notes: chỉ gửi nếu có giá trị
    if (formValue.notes) {
      updateData.notes = formValue.notes;
    }

    // Log để debug
    console.log('Updating work item:', this.workItem.workItemID);
    console.log('Update data:', updateData);
    console.log('Original workItem.workType:', this.workItem?.workType);

    // Cập nhật work item TRƯỚC, chỉ upload file khi update thành công
    this.workItemService.updateWorkItem(this.workItem.workItemID, updateData).subscribe({
      next: async () => {
        // Chỉ upload files sau khi work item đã được cập nhật thành công
        if (this.selectedFiles().length > 0) {
          const uploadSuccess = await this.uploadFiles();
          if (!uploadSuccess) {
            // Nếu upload file thất bại, vẫn hiển thị thông báo thành công cho work item
            // nhưng cảnh báo về file
            this.snackBar.open('Cập nhật công việc thành công, nhưng có lỗi khi upload file', 'Đóng', {
              duration: 5000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
              panelClass: ['warning-snackbar']
            });
          } else {
            this.snackBar.open('Cập nhật công việc và upload file thành công!', 'Đóng', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'top'
            });
          }
        } else {
          this.snackBar.open('Cập nhật công việc thành công!', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          });
        }
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error('Error updating work item:', err);
        
        // Xử lý các loại lỗi khác nhau
        let errorMessage = 'Lỗi khi cập nhật công việc';
        
        if (err.status === 404) {
          errorMessage = 'Không tìm thấy công việc cần cập nhật. Vui lòng làm mới trang và thử lại.';
        } else if (err.status === 400) {
          errorMessage = err.error?.message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.';
        } else if (err.status === 500) {
          errorMessage = err.error?.message || 'Lỗi server. Vui lòng thử lại sau.';
        } else if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.error?.error) {
          errorMessage = err.error.error;
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

  canSave(): boolean {
    const formValue = this.workItemForm.getRawValue();
    // Nút Lưu chỉ sáng khi có đủ:
    // 1. Ngày bắt đầu
    // 2. Ngày dự kiến
    // 3. Hoàn thành thực tế
    // 4. File upload mới
    return !!(
      formValue.startDate &&
      formValue.expectedFinish &&
      formValue.actualFinish &&
      this.selectedFiles().length > 0
    );
  }

  canDeleteFile(file: FileDocument): boolean {
    // Kiểm tra user đang đăng nhập
    if (!this.currentUser) {
      return false;
    }
    
    // Lấy thông tin uploadedBy của file
    const uploadedBy = file.uploadedBy || file.uploadBy;
    if (!uploadedBy) {
      // Nếu không có thông tin uploadedBy, không cho phép xóa (an toàn)
      return false;
    }
    
    // Backend trả về uploadedBy là userName (từ ClaimTypes.Name = user.UserName)
    // So sánh uploadedBy với thông tin user đang đăng nhập
    // Nếu khác thì không hiển thị icon delete
    const isOwner = (
      uploadedBy === this.currentUser.userName ||
      uploadedBy === this.currentUser.id ||
      uploadedBy === this.currentUser.id?.toString() ||
      uploadedBy === this.currentUser.userId?.toString() ||
      uploadedBy === this.currentUser.email
    );
    
    return isOwner;
  }
}

