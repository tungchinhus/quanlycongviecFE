import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AssignmentService } from '../../../services/assignment.service';
import { WorkItemWithAssignment } from '../../../models/machine-assignment.model';
import { AuthService } from '../../../services/auth.service';
import { UserRole } from '../../../constants/enums';
import { WorkItemDialogComponent } from '../work-item-dialog/work-item-dialog.component';
import { WorkItemReviewDialogComponent } from '../work-item-review-dialog/work-item-review-dialog.component';
import { WorkItemReviewDetailDialogComponent } from '../work-item-review-detail-dialog/work-item-review-detail-dialog.component';
import { WorkItemRejectDialogComponent } from '../work-item-reject-dialog/work-item-reject-dialog.component';
import { WorkItemService } from '../../../services/work-item.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-work-item-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatMenuModule,
    MatDividerModule,
    MatDialogModule
  ],
  templateUrl: './work-item-list.component.html',
  styleUrls: ['./work-item-list.component.css']
})
export class WorkItemListComponent implements OnInit {
  workItems: WorkItemWithAssignment[] = [];
  displayedColumns: string[] = ['machineName', 'startDate', 'expectedFinish', 'personConfirmation', 'actions'];
  isLoading = false;
  
  // Properties thay vì methods để tránh gọi lại mỗi change detection cycle
  isManagerOrAdminValue: boolean = false;

  constructor(
    private assignmentService: AssignmentService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private workItemService: WorkItemService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    // Tính toán isManagerOrAdmin một lần và lưu vào property
    this.updateIsManagerOrAdmin();
    this.loadWorkItems();
  }
  
  // Tính toán isManagerOrAdmin và lưu vào property
  private updateIsManagerOrAdmin(): void {
    const currentUser = this.authService.user();
    if (!currentUser) {
      this.isManagerOrAdminValue = false;
      return;
    }
    
    // Check exact match với Manager hoặc Administrator
    const hasExactRole = this.authService.hasAnyRole([UserRole.Manager, UserRole.Administrator]);
    
    // Check Manager variants (ManagerL1, ManagerL2, ManagerL3, etc.)
    const hasManagerVariant = currentUser.roles?.some(role => 
      role && (role === UserRole.Manager || role.startsWith('Manager'))
    ) || false;
    
    const hasAdminRole = this.authService.hasRole(UserRole.Administrator);
    this.isManagerOrAdminValue = hasExactRole || hasManagerVariant || hasAdminRole;
  }

  loadWorkItems() {
    // Sử dụng API mới để lấy work items của user đăng nhập
    // Backend sẽ tự động filter theo user từ JWT token
    // API sẽ match PersonName với UserId (string), FullName, hoặc UserName
    this.isLoading = true;
    this.assignmentService.getMyWorkItems().subscribe({
      next: (items) => {
        this.workItems = items;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading work items:', err);
        this.workItems = [];
        this.isLoading = false;
        
        let errorMessage = 'Không thể tải danh sách công việc. ';
        if (err.status === 401) {
          errorMessage += 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        } else if (err.status === 404) {
          errorMessage += 'Không tìm thấy thông tin người dùng.';
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

  viewWorkItem(item: WorkItemWithAssignment) {
    // Kiểm tra nếu là công việc review và có công việc design đã hoàn thành
    if (this.isReviewWorkItem(item)) {
      const dialogRef = this.dialog.open(WorkItemReviewDetailDialogComponent, {
        width: '90%',
        maxWidth: '900px',
        minWidth: '320px',
        data: {
          workItem: item
        },
        disableClose: false
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.loadWorkItems();
        }
      });
    } else {
      this.dialog.open(WorkItemDialogComponent, {
        width: '90%',
        maxWidth: '600px',
        minWidth: '320px',
        data: {
          workItem: item,
          mode: 'view'
        },
        disableClose: false
      });
    }
  }

  confirmWorkItem(item: WorkItemWithAssignment) {
    // Chỉ dùng cho review work items
    if (!this.isReviewWorkItem(item)) {
      return;
    }

    const dialogRef = this.dialog.open(WorkItemReviewDialogComponent, {
      width: '90%',
      maxWidth: '900px',
      minWidth: '320px',
      data: {
        workItem: item
      },
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadWorkItems();
        // Fallback: Reload unread count after confirmation (in case SignalR is not connected)
        setTimeout(() => {
          this.notificationService.getUnreadCount().subscribe({
            next: (response) => {
              // Dispatch custom event to notify app.component to update unread count
              window.dispatchEvent(new CustomEvent('unreadCountChanged', { detail: { count: response.count } }));
            },
            error: () => {
              // Error reloading unread count - silently fail
            }
          });
        }, 500);
      }
    });
  }

  rejectWorkItem(item: WorkItemWithAssignment) {
    // Chỉ dùng cho review work items
    if (!this.isReviewWorkItem(item)) {
      return;
    }

    const dialogRef = this.dialog.open(WorkItemRejectDialogComponent, {
      width: '90%',
      maxWidth: '600px',
      minWidth: '400px',
      data: {
        workItem: item
      },
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadWorkItems();
        // Fallback: Reload unread count after rejection (in case SignalR is not connected)
        setTimeout(() => {
          this.notificationService.getUnreadCount().subscribe({
            next: (response) => {
              // Dispatch custom event to notify app.component to update unread count
              window.dispatchEvent(new CustomEvent('unreadCountChanged', { detail: { count: response.count } }));
            },
            error: () => {
              // Error reloading unread count - silently fail
            }
          });
        }, 500);
      }
    });
  }

  isReviewWorkItem(item: WorkItemWithAssignment): boolean {
    // Kiểm tra nếu là Core Review hoặc Casing Review
    return item.workType === 'Core Review' || item.workType === 'Casing Review';
  }

  // (Giữ lại hàm để tương thích, hiện tại không dùng trong template)
  // Nếu cần kiểm tra trạng thái hoàn thành của design workitem ở danh sách,
  // có thể tái sử dụng logic từ WorkItemReviewDialog.
  isDesignWorkItemCompleted(_item: WorkItemWithAssignment): boolean {
    return false;
  }

  shouldUseReviewDialog(item: WorkItemWithAssignment): boolean {
    // Chỉ dùng review dialog cho Core Review hoặc Casing Review
    const isReviewType = this.isReviewWorkItem(item);
    if (!isReviewType) {
      return false;
    }

    // Kiểm tra xem có công việc design tương ứng đã hoàn thành không
    const assignment = item.assignment;
    if (!assignment || !assignment.workItems) {
      return false;
    }

    const reviewWorkType = item.workType;
    let designWorkType: string | null = null;
    
    if (reviewWorkType === 'Core Review') {
      designWorkType = 'Core Design';
    } else if (reviewWorkType === 'Casing Review') {
      designWorkType = 'Casing Design';
    }

    if (!designWorkType) {
      return false;
    }

    // Tìm workItem design đã hoàn thành
    const designWorkItem = assignment.workItems.find(
      workItem => workItem.workType === designWorkType && workItem.actualFinish != null
    );

    return designWorkItem != null;
  }

  editWorkItem(item: WorkItemWithAssignment) {
    const dialogRef = this.dialog.open(WorkItemDialogComponent, {
      width: '90%',
      maxWidth: '600px',
      minWidth: '320px',
      data: {
        workItem: item,
        mode: 'edit'
      },
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadWorkItems();
      }
    });
  }

  // Kiểm tra xem workitem đã được cập nhật đầy đủ chưa
  isWorkItemUpdated(item: WorkItemWithAssignment): boolean {
    // Kiểm tra các trường bắt buộc đã được điền
    const hasStartDate = item.startDate != null && item.startDate !== '';
    const hasExpectedFinish = item.expectedFinish != null && item.expectedFinish !== '';
    
    // Workitem được coi là đã cập nhật nếu có ít nhất ngày bắt đầu và dự kiến hoàn thành
    return hasStartDate && hasExpectedFinish;
  }

  completeWorkItem(item: WorkItemWithAssignment) {
    // Kiểm tra nếu workitem chưa được cập nhật đầy đủ
    if (!this.isWorkItemUpdated(item)) {
      this.snackBar.open('Vui lòng cập nhật đầy đủ thông tin công việc (Ngày bắt đầu, Dự kiến hoàn thành) trước khi đánh dấu hoàn thành', 'Đóng', {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Hiển thị confirm dialog
    const confirmDialog = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Xác nhận hoàn thành',
        message: 'Bạn có chắc chắn muốn đánh dấu công việc này là đã hoàn thành?',
        confirmText: 'Hoàn thành',
        cancelText: 'Hủy'
      }
    });

    confirmDialog.afterClosed().subscribe(result => {
      if (result) {
        // Cập nhật work item: set actualFinish = today, personConfirmation = true
        const today = new Date();
        const updateData = {
          actualFinish: today.toISOString(),
          personConfirmation: true
        };

        this.workItemService.updateWorkItem(item.workItemID, updateData).subscribe({
          next: () => {
            this.snackBar.open('Đã đánh dấu công việc là hoàn thành!', 'Đóng', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'top'
            });
            this.loadWorkItems(); // Reload danh sách
          },
          error: (err) => {
            console.error('Error completing work item:', err);
            let errorMessage = 'Lỗi khi cập nhật công việc. ';
            if (err.error?.message) {
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
    });
  }

  deleteWorkItem(item: WorkItemWithAssignment) {
    if (confirm('Bạn có chắc muốn xóa công việc này?')) {
      // TODO: Cần thêm deleteWorkItem vào service nếu cần
      // this.workItemService.deleteWorkItem(item.workItemID).subscribe({
      //   next: () => this.loadWorkItems(),
      //   error: (err) => console.error('Error deleting work item:', err)
      // });
      console.warn('Delete work item not implemented yet');
    }
  }

  getMachineName(item: WorkItemWithAssignment): string {
    return item.assignment?.machineName || `Assignment #${item.assignmentID}`;
  }

  isWorkItemCompleted(item: WorkItemWithAssignment): boolean {
    // Kiểm tra nếu actualFinish có giá trị (không null, không undefined, không empty string)
    if (!item.actualFinish) {
      return false;
    }
    
    // Nếu là string, kiểm tra không phải empty string
    if (typeof item.actualFinish === 'string') {
      const trimmed = item.actualFinish.trim();
      return trimmed !== '' && trimmed !== 'null' && trimmed !== 'undefined';
    }
    
    // Nếu là Date object, luôn coi là đã hoàn thành
    return true;
  }

  // Kiểm tra xem có nên hiển thị nút chỉnh sửa không
  // Cho phép chỉnh sửa khi workitem chưa xác nhận (bất kể assignment có bị khóa hay không)
  // User thiết kế cần có thể chỉnh sửa workitem của mình khi chưa xác nhận
  shouldShowEditButton(item: WorkItemWithAssignment): boolean {
    // Chỉ hiển thị cho workitem thiết kế (không phải review workitem)
    if (this.isReviewWorkItem(item)) {
      return false;
    }
    // Cho phép chỉnh sửa khi chưa xác nhận
    return !item.personConfirmation;
  }

  // Getter để tương thích với code cũ (không nên dùng trong template)
  // Sử dụng isManagerOrAdminValue property thay vì method này
  isManagerOrAdmin(): boolean {
    return this.isManagerOrAdminValue;
  }

  // Kiểm tra xem assignment có bị khóa không
  isAssignmentLocked(item: WorkItemWithAssignment): boolean {
    return item.assignment?.isLocked === true;
  }

  // Kiểm tra xem có nên hiển thị button unlock không (helper cho template)
  // User kiểm soát (review workitem) có thể mở khóa sau khi đã xác nhận
  // Manager/Admin cũng có thể mở khóa
  shouldShowUnlockButton(item: WorkItemWithAssignment): boolean {
    if (!this.isAssignmentLocked(item)) {
      return false;
    }
    
    // Nếu là user kiểm soát (review workitem), chỉ hiển thị sau khi đã xác nhận
    if (this.isReviewWorkItem(item)) {
      return item.personConfirmation === true;
    }
    
    // Manager/Admin có thể mở khóa (không cần kiểm tra personConfirmation vì họ có quyền cao hơn)
    return this.isManagerOrAdminValue;
  }

  // Kiểm tra xem có nên hiển thị chip "Đã khóa" không
  // Chỉ hiển thị khi assignment bị khóa VÀ workitem đã được xác nhận
  // User thiết kế và user kiểm soát đều chỉ thấy "Đã khóa" sau khi đã xác nhận
  shouldShowLockedChip(item: WorkItemWithAssignment): boolean {
    if (!this.isAssignmentLocked(item)) {
      return false;
    }
    
    // Chỉ hiển thị "Đã khóa" khi workitem đã được xác nhận
    // Không phân biệt user kiểm soát hay user thiết kế
    return item.personConfirmation === true;
  }

  // Mở khóa assignment để cho phép user thiết kế update workitem
  unlockAssignment(item: WorkItemWithAssignment) {
    if (!item.assignmentID) {
      this.snackBar.open('Không tìm thấy thông tin assignment', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    const confirmDialog = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Mở khóa Assignment',
        message: `Bạn có chắc chắn muốn mở khóa assignment "${this.getMachineName(item)}" để cho phép user thiết kế chỉnh sửa workitem?`,
        confirmText: 'Mở khóa',
        cancelText: 'Hủy'
      }
    });

    confirmDialog.afterClosed().subscribe(result => {
      if (result) {
        this.assignmentService.unlockAssignment(item.assignmentID).subscribe({
          next: (response) => {
            this.snackBar.open('Đã mở khóa assignment thành công!', 'Đóng', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'top'
            });
            this.loadWorkItems(); // Reload danh sách để cập nhật trạng thái
          },
          error: (err) => {
            console.error('Error unlocking assignment:', err);
            let errorMessage = 'Lỗi khi mở khóa assignment. ';
            if (err.error?.message) {
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
    });
  }
}

