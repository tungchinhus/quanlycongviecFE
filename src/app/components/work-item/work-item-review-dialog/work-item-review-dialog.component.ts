import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { WorkItemWithAssignment, WorkItem } from '../../../models/machine-assignment.model';
import { FileService } from '../../../services/file.service';
import { WorkItemService } from '../../../services/work-item.service';
import { FileDocument } from '../../../models/file.model';
import { AuthService, AuthUser } from '../../../services/auth.service';
import { UsersService } from '../../../services/users.service';

@Component({
  selector: 'app-work-item-review-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './work-item-review-dialog.component.html',
  styleUrls: ['./work-item-review-dialog.component.css']
})
export class WorkItemReviewDialogComponent implements OnInit {
  reviewWorkItem: WorkItemWithAssignment;
  designWorkItem: WorkItem | null = null;
  files: FileDocument[] = [];
  assignmentFiles: FileDocument[] = []; // File giao việc (file của designer)
  designFiles: FileDocument[] = []; // File thiết kế (file của user thiết kế)
  isLoading = true;
  isConfirming = signal<boolean>(false);
  currentUser: any = null;
  users: AuthUser[] = [];

  // Mapping workType sang tiếng Việt
  private workTypeMap: { [key: string]: string } = {
    'Core Design': 'Thiết kế ruột',
    'Core Review': 'Kiểm soát ruột',
    'Casing Design': 'Thiết kế vỏ',
    'Casing Review': 'Kiểm soát vỏ',
    'Material Leveling': 'Định mức vật tư'
  };

  constructor(
    private dialogRef: MatDialogRef<WorkItemReviewDialogComponent>,
    private fileService: FileService,
    private workItemService: WorkItemService,
    private authService: AuthService,
    private usersService: UsersService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { 
      workItem: WorkItemWithAssignment;
    }
  ) {
    this.reviewWorkItem = data.workItem;
    this.currentUser = this.authService.user();
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    
    // Load users trước
    this.usersService.loadUsers(1, 100).subscribe({
      next: (users) => {
        this.users = users;
        this.findDesignWorkItem();
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.findDesignWorkItem();
      }
    });
  }

  findDesignWorkItem() {
    const assignment = this.reviewWorkItem.assignment;
    
    // Nếu assignment có workItems, tìm ngay
    if (assignment && assignment.workItems && assignment.workItems.length > 0) {
      this.findDesignWorkItemInList(assignment.workItems);
      // Load files từ assignment
      if (this.reviewWorkItem.assignmentID) {
        this.loadFiles();
      } else {
        this.isLoading = false;
      }
    } else {
      // Nếu chưa có workItems, load từ API
      if (this.reviewWorkItem.assignmentID) {
        this.workItemService.getWorkItemsByAssignment(this.reviewWorkItem.assignmentID).subscribe({
          next: (workItems) => {
            // Cập nhật assignment.workItems nếu chưa có
            if (assignment && !assignment.workItems) {
              assignment.workItems = workItems;
            }
            this.findDesignWorkItemInList(workItems);
            this.loadFiles();
          },
          error: (err) => {
            console.error('Error loading work items:', err);
            this.isLoading = false;
          }
        });
      } else {
        this.isLoading = false;
      }
    }
  }

  findDesignWorkItemInList(workItems: any[]) {
    const reviewWorkType = this.reviewWorkItem.workType;
    let designWorkType: string | null = null;
    
    // Xác định workType design tương ứng
    if (reviewWorkType === 'Core Review') {
      designWorkType = 'Core Design';
    } else if (reviewWorkType === 'Casing Review') {
      designWorkType = 'Casing Design';
    }
    
    // Tìm workItem design (có thể chưa xác nhận) để lấy thông tin personName cho filter files
    if (designWorkType) {
      this.designWorkItem = workItems.find(
        item => item.workType === designWorkType
      ) || null;
      
      console.log('Design work item found:', {
        designWorkType,
        found: !!this.designWorkItem,
        personName: this.designWorkItem?.personName,
        personConfirmation: this.designWorkItem?.personConfirmation
      });
    }
  }

  // Kiểm tra xem design work item đã được xác nhận chưa
  isDesignWorkItemConfirmed(): boolean {
    if (!this.designWorkItem) {
      return false;
    }
    const confirmationValue: any = this.designWorkItem.personConfirmation;
    return confirmationValue === true || 
           confirmationValue === 1 || 
           (typeof confirmationValue === 'string' && confirmationValue === '1');
  }

  loadFiles() {
    this.fileService.getFilesByAssignment(this.reviewWorkItem.assignmentID).subscribe({
      next: (files) => {
        // Tách files thành 2 nhóm: file giao việc và file thiết kế
        this.separateFiles(files);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading files:', err);
        this.assignmentFiles = [];
        this.designFiles = [];
        this.files = [];
        this.isLoading = false;
      }
    });
  }

  separateFiles(files: FileDocument[]) {
    // Reset
    this.assignmentFiles = [];
    this.designFiles = [];
    
    if (!this.reviewWorkItem) {
      this.files = files;
      return;
    }

    const assignment = this.reviewWorkItem.assignment;
    if (!assignment) {
      this.files = files;
      return;
    }

    console.log('Separating files:', {
      totalFiles: files.length,
      designWorkItem: this.designWorkItem,
      designWorkItemPersonName: this.designWorkItem?.personName,
      assignmentDesigner: assignment.designer
    });

    // Lấy ID của người giao việc (designer)
    const designerId = assignment.designer;
    
    // Tìm user designer từ danh sách users
    let designerUser: AuthUser | undefined;
    if (designerId && this.users.length > 0) {
      designerUser = this.users.find(u => 
        u.id === designerId ||
        u.id?.toString() === designerId ||
        u.userId?.toString() === designerId
      );
    }

    // Lấy ID của user thiết kế (người làm design work item) - có thể chưa xác nhận
    let designUserId: string | undefined;
    if (this.designWorkItem && this.designWorkItem.personName) {
      designUserId = this.designWorkItem.personName;
    }

    // Tìm user thiết kế từ danh sách users
    let designUser: AuthUser | undefined;
    if (designUserId && this.users.length > 0) {
      designUser = this.users.find(u => 
        u.id === designUserId ||
        u.id?.toString() === designUserId ||
        u.userId?.toString() === designUserId ||
        u.userName === designUserId ||
        u.name === designUserId
      );
    }

    // Tạo danh sách các identifier có thể của designer
    const designerIdentifiers: string[] = [];
    if (designerId) {
      designerIdentifiers.push(designerId.toString());
    }
    if (designerUser) {
      if (designerUser.userName) designerIdentifiers.push(designerUser.userName);
      if (designerUser.name) designerIdentifiers.push(designerUser.name);
      if (designerUser.email) designerIdentifiers.push(designerUser.email);
      if (designerUser.id) designerIdentifiers.push(designerUser.id.toString());
      if (designerUser.userId) designerIdentifiers.push(designerUser.userId.toString());
    }

    // Tạo danh sách các identifier có thể của design user
    const designUserIdentifiers: string[] = [];
    if (designUserId) {
      designUserIdentifiers.push(designUserId.toString());
    }
    if (designUser) {
      if (designUser.userName) designUserIdentifiers.push(designUser.userName);
      if (designUser.name) designUserIdentifiers.push(designUser.name);
      if (designUser.email) designUserIdentifiers.push(designUser.email);
      if (designUser.id) designUserIdentifiers.push(designUser.id.toString());
      if (designUser.userId) designUserIdentifiers.push(designUser.userId.toString());
    }
    
    files.forEach(file => {
      const uploadedBy = file.uploadedBy || file.uploadBy;
      
      // Kiểm tra nếu là file của designer (người giao việc)
      let isDesignerFile = false;
      
      // Nếu không có uploadedBy, coi như file giao việc (an toàn)
      if (!uploadedBy) {
        isDesignerFile = true;
      } else if (designerIdentifiers.length > 0) {
        // So sánh với tất cả các identifier của designer
        isDesignerFile = designerIdentifiers.some(id => 
          id && uploadedBy && id.toString().toLowerCase() === uploadedBy.toString().toLowerCase()
        );
      }

      // Kiểm tra nếu là file của user thiết kế
      let isDesignUserFile = false;
      if (uploadedBy && designUserIdentifiers.length > 0) {
        // So sánh với tất cả các identifier của design user
        isDesignUserFile = designUserIdentifiers.some(id => 
          id && uploadedBy && id.toString().toLowerCase() === uploadedBy.toString().toLowerCase()
        );
      }

      // Phân loại file
      if (isDesignerFile) {
        // File giao việc
        this.assignmentFiles.push(file);
      } else if (isDesignUserFile) {
        // File thiết kế
        this.designFiles.push(file);
      }
    });

    // Set files để hiển thị (bao gồm cả file giao việc và file thiết kế)
    this.files = [...this.assignmentFiles, ...this.designFiles];
    
    console.log('Files separated:', {
      assignmentFiles: this.assignmentFiles.length,
      designFiles: this.designFiles.length,
      totalFiles: this.files.length
    });
  }


  getWorkTypeDisplayName(workType: string | undefined): string {
    if (!workType) return '';
    return this.workTypeMap[workType] || workType;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  downloadFile(file: FileDocument) {
    const fileId = file.id || file.fileID;
    if (!fileId) return;

    this.fileService.downloadFile(fileId).subscribe({
      next: (blob) => {
        // Kiểm tra nếu response là lỗi
        if (blob.type === 'application/json' || blob.size < 100) {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const errorText = reader.result as string;
              const errorObj = JSON.parse(errorText);
              this.snackBar.open(
                errorObj.message || errorObj.error || 'Lỗi khi tải file',
                'Đóng',
                {
                  duration: 5000,
                  horizontalPosition: 'center',
                  verticalPosition: 'top',
                  panelClass: ['error-snackbar']
                }
              );
            } catch (e) {
              this.snackBar.open('Lỗi khi tải file', 'Đóng', {
                duration: 3000,
                horizontalPosition: 'center',
                verticalPosition: 'top',
                panelClass: ['error-snackbar']
              });
            }
          };
          reader.readAsText(blob);
          return;
        }

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.fileName || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error downloading file:', err);
        const errorMessage = err.error?.message || err.error?.error || err.message || 'Lỗi khi tải file';
        this.snackBar.open(errorMessage, 'Đóng', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  viewFile(file: FileDocument) {
    const fileId = file.id || file.fileID;
    if (!fileId) return;

    this.fileService.downloadFile(fileId).subscribe({
      next: (blob) => {
        // Kiểm tra nếu response là lỗi
        if (blob.type === 'application/json' || blob.size < 100) {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const errorText = reader.result as string;
              const errorObj = JSON.parse(errorText);
              this.snackBar.open(
                errorObj.message || errorObj.error || 'Lỗi khi xem file',
                'Đóng',
                {
                  duration: 5000,
                  horizontalPosition: 'center',
                  verticalPosition: 'top',
                  panelClass: ['error-snackbar']
                }
              );
            } catch (e) {
              this.snackBar.open('Lỗi khi xem file', 'Đóng', {
                duration: 3000,
                horizontalPosition: 'center',
                verticalPosition: 'top',
                panelClass: ['error-snackbar']
              });
            }
          };
          reader.readAsText(blob);
          return;
        }

        const url = window.URL.createObjectURL(blob);
        const newWindow = window.open(url, '_blank');
        
        if (!newWindow) {
          const link = document.createElement('a');
          link.href = url;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 100);
      },
      error: (err) => {
        console.error('Error viewing file:', err);
        const errorMessage = err.error?.message || err.error?.error || err.message || 'Lỗi khi xem file';
        this.snackBar.open(errorMessage, 'Đóng', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  onConfirm() {
    if (!this.reviewWorkItem.workItemID) {
      this.snackBar.open('Không tìm thấy công việc cần xác nhận', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Hiển thị dialog xác nhận trước khi lưu
    if (!confirm('Bạn có chắc chắn muốn xác nhận công việc này?')) {
      return;
    }

    this.isConfirming.set(true);
    
    // Tự động set personConfirmation = true khi bấm nút xác nhận
    const updateData = {
      personConfirmation: true
    };

    this.workItemService.updateWorkItem(this.reviewWorkItem.workItemID, updateData).subscribe({
      next: () => {
        this.isConfirming.set(false);
        this.snackBar.open('Xác nhận công việc thành công!', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.isConfirming.set(false);
        console.error('Error confirming work item:', err);
        let errorMessage = 'Lỗi khi xác nhận công việc';
        
        if (err.error?.message) {
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

  onClose() {
    this.dialogRef.close();
  }

  getDesignPersonName(): string {
    if (!this.designWorkItem || !this.designWorkItem.personName) {
      return '-';
    }
    
    const personId = this.designWorkItem.personName;
    const user = this.users.find(u => 
      u.id === personId || 
      u.id?.toString() === personId ||
      u.userId?.toString() === personId ||
      u.userName === personId ||
      u.name === personId
    );
    
    return user ? (user.name || user.userName || personId) : personId;
  }
}

