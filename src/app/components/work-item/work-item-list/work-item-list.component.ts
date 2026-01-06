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
import { WorkItemDialogComponent } from '../work-item-dialog/work-item-dialog.component';
import { WorkItemReviewDialogComponent } from '../work-item-review-dialog/work-item-review-dialog.component';
import { WorkItemReviewDetailDialogComponent } from '../work-item-review-detail-dialog/work-item-review-detail-dialog.component';
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
  displayedColumns: string[] = ['machineName', 'startDate', 'expectedFinish', 'actualFinish', 'personConfirmation', 'actions'];
  isLoading = false;

  constructor(
    private assignmentService: AssignmentService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private workItemService: WorkItemService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadWorkItems();
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

  isReviewWorkItem(item: WorkItemWithAssignment): boolean {
    // Kiểm tra nếu là Core Review hoặc Casing Review
    return item.workType === 'Core Review' || item.workType === 'Casing Review';
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

  completeWorkItem(item: WorkItemWithAssignment) {
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
}

