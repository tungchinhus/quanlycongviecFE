import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AssignmentService } from '../../../services/assignment.service';
import { UsersService } from '../../../services/users.service';
import { AuthUser, AuthService } from '../../../services/auth.service';
import { FileService } from '../../../services/file.service';
import { UserRole } from '../../../constants/enums';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { WorkItem, WorkChange } from '../../../models/machine-assignment.model';
import { FileDocument } from '../../../models/file.model';

@Component({
  selector: 'app-assignment-form-dialog',
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
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatCheckboxModule
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './assignment-form-dialog.component.html',
  styleUrls: ['./assignment-form-dialog.component.css']
})
export class AssignmentFormDialogComponent implements OnInit {
  assignmentForm: FormGroup;
  users: AuthUser[] = [];
  managers: AuthUser[] = [];
  isLoadingUsers = false;
  currentUser: AuthUser | null = null;
  readonly selectedFiles = signal<File[]>([]);
  readonly existingFiles = signal<FileDocument[]>([]);
  readonly filesToDelete = signal<number[]>([]);
  readonly isUploading = signal<boolean>(false);
  readonly isLoadingFiles = signal<boolean>(false);
  isEditMode: boolean = false;
  assignmentId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AssignmentFormDialogComponent>,
    private assignmentService: AssignmentService,
    private usersService: UsersService,
    private authService: AuthService,
    private fileService: FileService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    // Lấy current user
    this.currentUser = this.authService.user();
    
    // Validators mirror backend constraints to tránh lỗi 500 do tràn độ dài/thiếu dữ liệu
    this.assignmentForm = this.fb.group({
      tbktId: ['', [Validators.required, Validators.maxLength(50)]], // TBKT_ID để map với TechnicalSheet
      machineName: ['', [Validators.required, Validators.maxLength(255)]],
      requestDocument: ['', [Validators.required, Validators.maxLength(255)]], // ĐĐH/Giấy đề nghị - BẮT BUỘC
      standardRequirement: ['', [Validators.required, Validators.maxLength(1000)]], // BẮT BUỘC
      additionalRequest: ['', [Validators.required, Validators.maxLength(1000)]], // BẮT BUỘC
      deliveryDate: [null, Validators.required], // BẮT BUỘC
      // Lưu user ID nhưng hiển thị tên
      designer: [this.currentUser?.id || '', { disabled: true }],
      teamLeader: ['', [Validators.required, Validators.maxLength(100)]], // BẮT BUỘC
      // Danh mục với user assignment - ít nhất một trường phải được chọn
      coreDesignUser: [''],
      coreReviewUser: [''],
      casingDesignUser: [''],
      casingReviewUser: [''],
      materialLevelingUser: [''],
      // Các hạng mục thay đổi - KHÔNG BẮT BUỘC
      workChanges: ['', Validators.maxLength(1000)]
    }, { validators: this.atLeastOnePerformerValidator });
  }

  ngOnInit() {
    this.loadUsers();
    
    // Kiểm tra xem có phải edit mode không
    this.isEditMode = this.data?.isEditMode === true && this.data?.assignment;
    
    if (this.isEditMode && this.data.assignment) {
      // Edit mode: điền form với data từ assignment
      const assignment = this.data.assignment;
      this.assignmentId = assignment.assignmentID;
      
      // Điền các trường cơ bản
      this.assignmentForm.patchValue({
        tbktId: assignment.tbkt_ID || this.data.tbktId || '',
        machineName: assignment.machineName || '',
        requestDocument: assignment.requestDocument || '',
        standardRequirement: assignment.standardRequirement || '',
        additionalRequest: assignment.additionalRequest || '',
        deliveryDate: assignment.deliveryDate ? new Date(assignment.deliveryDate) : null,
        designer: assignment.designer || this.currentUser?.id || '',
        teamLeader: assignment.teamLeader || ''
      });
      
      // Disable field tbktId vì đã được chọn từ danh sách
      this.assignmentForm.get('tbktId')?.disable();
      
      // Điền work items nếu có
      if (assignment.workItems && assignment.workItems.length > 0) {
        assignment.workItems.forEach((workItem: WorkItem) => {
          switch(workItem.workType) {
            case 'Core Design':
              this.assignmentForm.patchValue({ coreDesignUser: workItem.personName || '' });
              break;
            case 'Core Review':
              this.assignmentForm.patchValue({ coreReviewUser: workItem.personName || '' });
              break;
            case 'Casing Design':
              this.assignmentForm.patchValue({ casingDesignUser: workItem.personName || '' });
              break;
            case 'Casing Review':
              this.assignmentForm.patchValue({ casingReviewUser: workItem.personName || '' });
              break;
            case 'Material Leveling':
              this.assignmentForm.patchValue({ materialLevelingUser: workItem.personName || '' });
              break;
          }
        });
      }
      
      // Điền work changes nếu có
      if (assignment.workChanges && assignment.workChanges.length > 0) {
        const workChangesText = assignment.workChanges.map((wc: WorkChange) => wc.description).filter((d: string | undefined): d is string => !!d).join('\n');
        this.assignmentForm.patchValue({ workChanges: workChangesText });
      }
      
      // Load existing files
      if (this.assignmentId) {
        this.loadExistingFiles(this.assignmentId);
      }
    } else if (this.data?.tbktId) {
      // Create mode: chỉ điền tbktId
      this.assignmentForm.patchValue({
        tbktId: this.data.tbktId
      });
      // Disable field tbktId vì đã được chọn từ danh sách
      this.assignmentForm.get('tbktId')?.disable();
    }
  }

  loadUsers() {
    this.isLoadingUsers = true;
    this.usersService.loadUsers(1, 100).subscribe({
      next: (users) => {
        // Filter users cho danh mục công việc (không có Administrator)
        this.users = users.filter(user => 
          user.isActive !== false && 
          !user.roles.includes(UserRole.Administrator)
        );
        
        // Filter managers cho dropdown "Trưởng Đ.vị" - chỉ lấy users có role ManagerL1
        this.managers = users.filter(user => 
          user.isActive !== false && 
          user.roles.includes('ManagerL1')
        );
        
        this.isLoadingUsers = false;
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.isLoadingUsers = false;
      }
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const newFiles = Array.from(input.files);
      this.selectedFiles.update(files => [...files, ...newFiles]);
      // Reset input để có thể chọn lại file cùng tên
      input.value = '';
    }
  }

  removeFile(index: number) {
    this.selectedFiles.update(files => files.filter((_, i) => i !== index));
  }

  removeExistingFile(fileId: number) {
    // Mark file for deletion
    this.filesToDelete.update(ids => [...ids, fileId]);
    // Remove from display
    this.existingFiles.update(files => files.filter(f => f.id !== fileId));
  }

  loadExistingFiles(assignmentId: number) {
    this.isLoadingFiles.set(true);
    this.fileService.getFilesByAssignment(assignmentId).subscribe({
      next: (files) => {
        this.existingFiles.set(files);
        this.isLoadingFiles.set(false);
      },
      error: (err) => {
        console.error('Error loading existing files:', err);
        this.isLoadingFiles.set(false);
        // Don't show error to user, just log it
      }
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  onSave() {
    if (!this.assignmentForm.valid) {
      this.assignmentForm.markAllAsTouched();
      this.snackBar.open('Vui lòng nhập đủ thông tin bắt buộc và không vượt quá giới hạn ký tự.', 'Đóng', {
        duration: 4000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['warning-snackbar']
      });
      return;
    }

    this.isUploading.set(true);
    // Sử dụng getRawValue() để lấy cả giá trị của các trường disabled
    const formValue = this.assignmentForm.getRawValue();
    
    // Map form data đúng format API
    const assignmentData: any = {
      tbkt_ID: (formValue.tbktId || '').trim(),
      machineName: (formValue.machineName || '').trim(),
      requestDocument: formValue.requestDocument?.trim() || '',
      standardRequirement: formValue.standardRequirement?.trim() || '',
      additionalRequest: formValue.additionalRequest?.trim() || '',
      deliveryDate: formValue.deliveryDate ? new Date(formValue.deliveryDate).toISOString() : null,
      designer: formValue.designer ? formValue.designer.toString() : '',
      teamLeader: formValue.teamLeader ? formValue.teamLeader.toString() : ''
    };

    // TODO: Thêm filePaths vào payload khi backend đã hỗ trợ column này trong database
    // Hiện tại tạm thời không gửi filePaths để tránh lỗi "Invalid column name 'FilePath'"
    // Files sẽ được upload sau khi tạo assignment thành công

    if (this.isEditMode && this.assignmentId) {
      // Delete files marked for deletion first
      const filesToDelete = this.filesToDelete();
      if (filesToDelete.length > 0) {
        const deleteObservables = filesToDelete.map(fileId =>
          this.fileService.deleteFile(fileId).pipe(
            catchError(error => {
              console.error(`Error deleting file ${fileId}:`, error);
              return of(null);
            })
          )
        );
        
        forkJoin(deleteObservables).subscribe({
          next: () => {
            // Continue with update after deletion
            this.updateAssignmentAndWorkItems(assignmentData, formValue);
          },
          error: (err) => {
            console.error('Error deleting files:', err);
            // Continue anyway
            this.updateAssignmentAndWorkItems(assignmentData, formValue);
          }
        });
      } else {
        // No files to delete, proceed directly
        this.updateAssignmentAndWorkItems(assignmentData, formValue);
      }
    } else {
      // Tạo assignment mới
      this.assignmentService.createAssignment(assignmentData).subscribe({
        next: (assignment) => {
          const assignmentId = assignment.assignmentID;
          
          // Tạo work items và work changes
          this.createWorkItemsAndChanges(assignmentId, formValue);
        },
        error: (err) => {
          this.isUploading.set(false);
          console.error('Error creating assignment:', err);
          const errorMessage = err.error?.message || err.error?.error || 'Lỗi khi tạo gán công việc';
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

  private updateAssignmentAndWorkItems(assignmentData: any, formValue: any) {
    // Update assignment
    this.assignmentService.updateAssignment(this.assignmentId!, assignmentData).subscribe({
      next: () => {
        // Reload assignment để lấy dữ liệu mới nhất
        this.assignmentService.getAssignmentById(this.assignmentId!).subscribe({
          next: (updatedAssignment) => {
            // Tạo/cập nhật work items và work changes
            this.createWorkItemsAndChanges(this.assignmentId!, formValue);
          },
          error: (err) => {
            console.error('Error reloading assignment:', err);
            // Vẫn tiếp tục với work items
            this.createWorkItemsAndChanges(this.assignmentId!, formValue);
          }
        });
      },
      error: (err) => {
        this.isUploading.set(false);
        console.error('Error updating assignment:', err);
        const errorMessage = err.error?.message || err.error?.error || 'Lỗi khi cập nhật gán công việc';
        this.snackBar.open(errorMessage, 'Đóng', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  private createWorkItemsAndChanges(assignmentId: number, formValue: any) {
    const workItemObservables: Observable<any>[] = [];

    // Tạo work items cho từng loại công việc
    if (formValue.coreDesignUser) {
      workItemObservables.push(
        this.assignmentService.createWorkItem(assignmentId, {
          assignmentID: assignmentId,
          workType: 'Core Design',
          personName: formValue.coreDesignUser.toString()
        }).pipe(catchError(error => {
          console.error('Error creating Core Design work item:', error);
          return of(null);
        }))
      );
    }

    if (formValue.coreReviewUser) {
      workItemObservables.push(
        this.assignmentService.createWorkItem(assignmentId, {
          assignmentID: assignmentId,
          workType: 'Core Review',
          personName: formValue.coreReviewUser.toString()
        }).pipe(catchError(error => {
          console.error('Error creating Core Review work item:', error);
          return of(null);
        }))
      );
    }

    if (formValue.casingDesignUser) {
      workItemObservables.push(
        this.assignmentService.createWorkItem(assignmentId, {
          assignmentID: assignmentId,
          workType: 'Casing Design',
          personName: formValue.casingDesignUser.toString()
        }).pipe(catchError(error => {
          console.error('Error creating Casing Design work item:', error);
          return of(null);
        }))
      );
    }

    if (formValue.casingReviewUser) {
      workItemObservables.push(
        this.assignmentService.createWorkItem(assignmentId, {
          assignmentID: assignmentId,
          workType: 'Casing Review',
          personName: formValue.casingReviewUser.toString()
        }).pipe(catchError(error => {
          console.error('Error creating Casing Review work item:', error);
          return of(null);
        }))
      );
    }

    if (formValue.materialLevelingUser) {
      workItemObservables.push(
        this.assignmentService.createWorkItem(assignmentId, {
          assignmentID: assignmentId,
          workType: 'Material Leveling',
          personName: formValue.materialLevelingUser.toString()
        }).pipe(catchError(error => {
          console.error('Error creating Material Leveling work item:', error);
          return of(null);
        }))
      );
    }

    // Tạo work change nếu có
    if (formValue.workChanges && formValue.workChanges.trim()) {
      workItemObservables.push(
        this.assignmentService.createWorkChange(assignmentId, {
          assignmentID: assignmentId,
          changeType: 'Change Request',
          description: formValue.workChanges
        }).pipe(catchError(error => {
          console.error('Error creating work change:', error);
          return of(null);
        }))
      );
    }

    // Đợi tất cả work items và work changes được tạo
    if (workItemObservables.length > 0) {
      forkJoin(workItemObservables).subscribe({
        next: (results) => {
          // Upload files nếu có
          const files = this.selectedFiles();
          if (files.length > 0) {
            this.uploadFiles(assignmentId, files);
          } else {
            this.isUploading.set(false);
            const successCount = results.filter(r => r !== null).length;
            const actionText = this.isEditMode ? 'Cập nhật' : 'Tạo';
            this.snackBar.open(`${actionText} gán công việc và ${successCount} công việc con thành công!`, 'Đóng', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
              panelClass: ['success-snackbar']
            });
            this.dialogRef.close(true);
          }
        },
        error: (err) => {
          console.error('Error creating work items/changes:', err);
          // Vẫn upload files nếu có, assignment đã được tạo thành công
          const files = this.selectedFiles();
          if (files.length > 0) {
            this.uploadFiles(assignmentId, files);
          } else {
            this.isUploading.set(false);
            const actionText = this.isEditMode ? 'Cập nhật' : 'Tạo';
            this.snackBar.open(`${actionText} gán công việc thành công nhưng có lỗi khi tạo một số công việc con.`, 'Đóng', {
              duration: 5000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
              panelClass: ['warning-snackbar']
            });
            this.dialogRef.close(true);
          }
        }
      });
    } else {
      // Không có work items hoặc work changes, chỉ upload files nếu có
      const files = this.selectedFiles();
      if (files.length > 0) {
        this.uploadFiles(assignmentId, files);
      } else {
        this.isUploading.set(false);
        const actionText = this.isEditMode ? 'Cập nhật' : 'Tạo';
        this.snackBar.open(`${actionText} gán công việc thành công!`, 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
        });
        this.dialogRef.close(true);
      }
    }
  }

  uploadFiles(assignmentID: number, files: File[]) {
    // Upload tất cả files với assignmentId để nhận diện theo từng máy
    // Backend sẽ tự động cập nhật MachineAssignment.FilePath
    console.log(`Starting upload of ${files.length} file(s) for assignment ${assignmentID}`);
    
    const uploadObservables = files.map(file => 
      this.fileService.uploadFile(
        file, 
        assignmentID, 
        `File đính kèm cho gán công việc #${assignmentID}`
      ).pipe(
        catchError(error => {
          console.error(`Error uploading file ${file.name}:`, error);
          const errorMessage = error.error?.message || error.error?.error || error.message || 'Lỗi không xác định';
          console.error(`Error details for ${file.name}:`, {
            status: error.status,
            statusText: error.statusText,
            message: errorMessage,
            fullError: error
          });
          // Trả về object với thông tin lỗi thay vì null
          return of({ 
            error: true, 
            fileName: file.name, 
            errorMessage: errorMessage,
            status: error.status 
          });
        })
      )
    );

    forkJoin(uploadObservables).subscribe({
      next: (results) => {
        const successFiles = results.filter(r => r !== null && !('error' in r && r.error)) as any[];
        const failedFiles = results.filter(r => r !== null && 'error' in r && r.error) as any[];
        const successCount = successFiles.length;
        const failCount = failedFiles.length;

        console.log(`Upload completed: ${successCount} success, ${failCount} failed`);

        // Backend tự động cập nhật MachineAssignment.FilePath khi upload file
        // Không cần cập nhật thủ công nữa

        this.isUploading.set(false);

        const actionText = this.isEditMode ? 'Cập nhật' : 'Tạo';
        if (failCount === 0) {
          this.snackBar.open(`${actionText} gán công việc và upload ${successCount} file thành công!`, 'Đóng', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['success-snackbar']
          });
        } else {
          // Hiển thị chi tiết lỗi
          const errorDetails = failedFiles.map(f => `${f.fileName}: ${f.errorMessage}`).join('; ');
          console.error('Failed files:', failedFiles);
          this.snackBar.open(
            `${actionText} gán công việc thành công. Upload ${successCount}/${results.length} file thành công. Lỗi: ${errorDetails}`,
            'Đóng',
            {
              duration: 8000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
              panelClass: ['warning-snackbar']
            }
          );
        }
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.isUploading.set(false);
        console.error('Error uploading files:', err);
        const errorMessage = err.error?.message || err.error?.error || err.message || 'Lỗi không xác định';
        console.error('Full error details:', {
          status: err.status,
          statusText: err.statusText,
          message: errorMessage,
          fullError: err
        });
        const actionText = this.isEditMode ? 'Cập nhật' : 'Tạo';
        this.snackBar.open(`${actionText} gán công việc thành công nhưng có lỗi khi upload file: ${errorMessage}`, 'Đóng', {
          duration: 8000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
        this.dialogRef.close(true);
      }
    });
  }

  onCancel() {
    this.dialogRef.close();
  }

  // Custom validator: Đảm bảo ít nhất một người thực hiện được chọn
  private atLeastOnePerformerValidator = (group: FormGroup): { [key: string]: any } | null => {
    const coreDesignUser = group.get('coreDesignUser')?.value;
    const coreReviewUser = group.get('coreReviewUser')?.value;
    const casingDesignUser = group.get('casingDesignUser')?.value;
    const casingReviewUser = group.get('casingReviewUser')?.value;
    const materialLevelingUser = group.get('materialLevelingUser')?.value;

    const hasAtLeastOne = !!(coreDesignUser || coreReviewUser || casingDesignUser || casingReviewUser || materialLevelingUser);
    
    return hasAtLeastOne ? null : { atLeastOnePerformerRequired: true };
  };

  // Getter để kiểm tra form có valid không (dùng trong template)
  get isFormValid(): boolean {
    return this.assignmentForm.valid;
  }
}

