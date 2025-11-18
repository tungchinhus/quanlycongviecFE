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
    private dialog: MatDialog
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
}

