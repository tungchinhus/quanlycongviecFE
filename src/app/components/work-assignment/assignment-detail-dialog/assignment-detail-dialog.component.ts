import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AssignmentService } from '../../../services/assignment.service';
import { MachineAssignment, WorkItem } from '../../../models/machine-assignment.model';
import { UsersService } from '../../../services/users.service';
import { AuthUser, AuthService } from '../../../services/auth.service';
import { WorkItemService } from '../../../services/work-item.service';
import { FileService } from '../../../services/file.service';
import { FileDocument } from '../../../models/file.model';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-assignment-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './assignment-detail-dialog.component.html',
  styleUrls: ['./assignment-detail-dialog.component.css']
})
export class AssignmentDetailDialogComponent implements OnInit {
  assignment: MachineAssignment | null = null;
  users: AuthUser[] = [];
  isLoading = true;
  currentUser: AuthUser | null = null;
  filteredWorkItems: WorkItem[] = [];
  workItemForms: Map<number, FormGroup> = new Map();
  readonly selectedFiles = signal<File[]>([]);
  readonly isUploading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  files: FileDocument[] = [];

  constructor(
    private dialogRef: MatDialogRef<AssignmentDetailDialogComponent>,
    private assignmentService: AssignmentService,
    private usersService: UsersService,
    private authService: AuthService,
    private workItemService: WorkItemService,
    private fileService: FileService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { assignmentId: number }
  ) {
    this.currentUser = this.authService.user();
  }

  ngOnInit() {
    this.loadUsers();
    this.loadAssignment(this.data.assignmentId);
  }

  loadUsers() {
    this.usersService.loadUsers(1, 100).subscribe({
      next: (users) => {
        this.users = users;
      },
      error: (err) => {
        console.error('Error loading users:', err);
      }
    });
  }

  loadAssignment(id: number) {
    this.isLoading = true;
    this.assignmentService.getAssignmentById(id).subscribe({
      next: (assignment) => {
        // Normalize API response: map assignmentApprovals to approvals for backward compatibility
        if (assignment.assignmentApprovals && !assignment.approvals) {
          assignment.approvals = assignment.assignmentApprovals;
        }
        
        this.assignment = assignment;
        // Lọc work items theo current user
        this.filterWorkItems();
        // Tạo form cho mỗi work item
        this.createWorkItemForms();
        // Load files
        this.loadFiles(id);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading assignment:', err);
        this.isLoading = false;
      }
    });
  }

  loadFiles(assignmentId: number) {
    this.fileService.getFilesByAssignment(assignmentId).subscribe({
      next: (files) => {
        this.files = files;
      },
      error: (err) => {
        console.error('Error loading files:', err);
      }
    });
  }

  filterWorkItems() {
    if (!this.assignment || !this.assignment.workItems) {
      this.filteredWorkItems = [];
      return;
    }

    if (this.currentUser) {
      // Chỉ hiển thị work items mà current user được gán
      this.filteredWorkItems = this.assignment.workItems.filter(item => {
        const personId = item.personName;
        return personId && (
          personId === this.currentUser?.id ||
          personId === this.currentUser?.id?.toString() ||
          personId === this.currentUser?.userId?.toString()
        );
      });
    } else {
      // Nếu không có current user, hiển thị tất cả
      this.filteredWorkItems = this.assignment.workItems;
    }
  }

  createWorkItemForms() {
    this.workItemForms.clear();
    this.filteredWorkItems.forEach(item => {
      const form = this.fb.group({
        startDate: [item.startDate ? new Date(item.startDate) : null],
        expectedFinish: [item.expectedFinish ? new Date(item.expectedFinish) : null],
        actualFinish: [item.actualFinish ? new Date(item.actualFinish) : null],
        notes: [item.notes || '']
      });
      this.workItemForms.set(item.workItemID, form);
    });
  }

  getWorkItemForm(workItemId: number): FormGroup | undefined {
    return this.workItemForms.get(workItemId);
  }

  saveAllWorkItems() {
    if (this.filteredWorkItems.length === 0) {
      return;
    }

    this.isSaving.set(true);
    const updateObservables = this.filteredWorkItems.map(workItem => {
      const form = this.workItemForms.get(workItem.workItemID);
      if (!form) return of(null);

      const formValue = form.value;
      const updateData: any = {};
      
      if (formValue.startDate) {
        updateData.startDate = new Date(formValue.startDate).toISOString();
      }
      if (formValue.expectedFinish) {
        updateData.expectedFinish = new Date(formValue.expectedFinish).toISOString();
      }
      if (formValue.actualFinish) {
        updateData.actualFinish = new Date(formValue.actualFinish).toISOString();
      }
      if (formValue.notes !== undefined) {
        updateData.notes = formValue.notes;
      }

      return this.workItemService.updateWorkItem(workItem.workItemID, updateData).pipe(
        catchError(error => {
          console.error(`Error updating work item ${workItem.workItemID}:`, error);
          return of(null);
        })
      );
    });

    forkJoin(updateObservables).subscribe({
      next: (results) => {
        this.isSaving.set(false);
        const successCount = results.filter(r => r !== null).length;
        const failCount = results.length - successCount;

        // Cập nhật work items trong assignment
        if (this.assignment && this.assignment.workItems) {
          results.forEach((updatedItem, index) => {
            if (updatedItem) {
              const workItem = this.filteredWorkItems[index];
              const assignmentIndex = this.assignment!.workItems!.findIndex(
                item => item.workItemID === workItem.workItemID
              );
              if (assignmentIndex !== -1) {
                this.assignment!.workItems![assignmentIndex] = updatedItem;
              }
            }
          });
          // Cập nhật lại filtered work items và forms
          this.filterWorkItems();
          this.createWorkItemForms();
        }

        if (failCount === 0) {
          this.snackBar.open(`Lưu ${successCount} công việc thành công!`, 'Đóng', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['success-snackbar']
          });
        } else {
          this.snackBar.open(
            `Lưu ${successCount}/${results.length} công việc thành công.`,
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
        this.isSaving.set(false);
        console.error('Error saving work items:', err);
        this.snackBar.open('Lỗi khi lưu công việc', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  getDesignerName(designerId: string | undefined): string | null {
    if (!designerId) return null;
    const user = this.users.find(u => u.id === designerId || u.id?.toString() === designerId);
    return user ? (user.name || user.userName || null) : null;
  }

  getTeamLeaderName(teamLeaderId: string | undefined): string | null {
    if (!teamLeaderId) return null;
    const user = this.users.find(u => u.id === teamLeaderId || u.id?.toString() === teamLeaderId);
    return user ? (user.name || user.userName || null) : null;
  }

  getPersonName(personId: string | undefined): string | null {
    if (!personId) return null;
    const user = this.users.find(u => u.id === personId || u.id?.toString() === personId);
    return user ? (user.name || user.userName || null) : personId;
  }

  getWorkTypeName(workType: string | undefined): string | null {
    if (!workType) return null;
    const workTypeMap: { [key: string]: string } = {
      'Casing Review': 'Kiểm soát vỏ',
      'Core Review': 'Kiểm soát ruột',
      'Casing Design': 'Thiết kế vỏ',
      'Core Design': 'Thiết kế ruột',
      'Material Leveling': 'Định mức vật tư'
    };
    return workTypeMap[workType] || workType;
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

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  uploadFiles() {
    const files = this.selectedFiles();
    if (files.length === 0 || !this.assignment) return;

    this.isUploading.set(true);
    const assignmentID = this.assignment.assignmentID;
    
    // Upload tất cả files với assignmentId để nhận diện theo từng máy
    // Backend sẽ tự động cập nhật MachineAssignment.FilePath
    const uploadObservables = files.map(file => 
      this.fileService.uploadFile(
        file, 
        assignmentID, 
        `File đính kèm cho gán công việc #${assignmentID}`
      ).pipe(
        catchError(error => {
          console.error(`Error uploading file ${file.name}:`, error);
          return of(null);
        })
      )
    );

    forkJoin(uploadObservables).subscribe({
      next: (results) => {
        const successFiles = results.filter(r => r !== null) as any[];
        const successCount = successFiles.length;
        const failCount = results.length - successCount;

        // Backend tự động cập nhật MachineAssignment.FilePath khi upload file
        // Không cần cập nhật thủ công nữa

        this.isUploading.set(false);

        if (failCount === 0) {
          this.snackBar.open(`Upload ${successCount} file thành công!`, 'Đóng', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['success-snackbar']
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
        
        // Clear selected files và reload danh sách file
        this.selectedFiles.set([]);
        if (this.assignment) {
          this.loadFiles(this.assignment.assignmentID);
        }
      },
      error: (err) => {
        this.isUploading.set(false);
        console.error('Error uploading files:', err);
        this.snackBar.open('Lỗi khi upload file.', 'Đóng', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  deleteFile(file: FileDocument) {
    if (confirm(`Bạn có chắc muốn xóa file "${file.fileName}"?`)) {
      // Sử dụng id hoặc fileID (tương thích)
      const fileId = file.id || file.fileID;
      if (!fileId) {
        this.snackBar.open('Không tìm thấy ID file', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
        return;
      }

      this.fileService.deleteFile(fileId).subscribe({
        next: () => {
          // Backend tự động cập nhật MachineAssignment.FilePath khi xóa file
          // Không cần cập nhật thủ công nữa
          
          this.snackBar.open('Xóa file thành công!', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          });
          if (this.assignment) {
            this.loadFiles(this.assignment.assignmentID);
          }
        },
        error: (err) => {
          console.error('Error deleting file:', err);
          this.snackBar.open('Lỗi khi xóa file', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          });
        }
      });
    }
  }

  downloadFile(file: FileDocument) {
    // Sử dụng id hoặc fileID (tương thích)
    const fileId = file.id || file.fileID;
    if (!fileId) {
      this.snackBar.open('Không tìm thấy ID file', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top'
      });
      return;
    }
    
    this.fileService.downloadFile(fileId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.fileName;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error downloading file:', err);
        this.snackBar.open('Lỗi khi tải file', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
      }
    });
  }

  onClose() {
    this.dialogRef.close();
  }
}

