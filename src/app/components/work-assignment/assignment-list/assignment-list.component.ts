import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AssignmentService } from '../../../services/assignment.service';
import { MachineAssignment, AssignmentStatus } from '../../../models/machine-assignment.model';
import { AssignmentFormDialogComponent } from '../assignment-form-dialog/assignment-form-dialog.component';
import { AssignmentDetailDialogComponent } from '../assignment-detail-dialog/assignment-detail-dialog.component';
import { AuthService } from '../../../services/auth.service';
import { UserRole } from '../../../constants/enums';

interface ColumnVisibility {
  [key: string]: boolean;
}

@Component({
  selector: 'app-assignment-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatTooltipModule,
    MatBadgeModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatCheckboxModule,
    MatMenuModule,
    MatDividerModule
  ],
  templateUrl: './assignment-list.component.html',
  styleUrls: ['./assignment-list.component.css']
})

export class AssignmentListComponent implements OnInit {
  assignments: MachineAssignment[] = [];
  filteredAssignments: MachineAssignment[] = [];
  readonly searchTerm = signal<string>('');
  readonly displayedColumns = signal<string[]>([]);
  readonly allColumns = signal<string[]>([]);
  readonly columnVisibility = signal<ColumnVisibility>({});
  isUserRole: boolean = false;

  constructor(
    private assignmentService: AssignmentService,
    private dialog: MatDialog,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.checkUserRole();
    this.setupDisplayedColumns();
  }

  ngOnInit() {
    this.loadAssignments();
  }

  checkUserRole() {
    const currentUser = this.authService.user();
    this.isUserRole = currentUser?.roles?.includes(UserRole.User) || false;
  }

  setupDisplayedColumns() {
    let columns: string[] = [];
    if (this.isUserRole) {
      // Ẩn cột Công Việc và Ký Duyệt cho role User
      columns = ['machineName', 'deliveryDate', 'actions'];
    } else {
      columns = ['machineName', 'deliveryDate', 'workItems', 'approvals', 'actions'];
    }
    
    this.allColumns.set(columns);
    
    // Khởi tạo column visibility - tất cả đều hiển thị
    const visibility: ColumnVisibility = {};
    columns.forEach(col => {
      visibility[col] = true;
    });
    this.columnVisibility.set(visibility);
    this.displayedColumns.set(columns);
  }

  readonly filteredData = computed(() => {
    const data = this.assignments;
    const search = this.searchTerm().toLowerCase().trim();
    const visibleColumns = this.displayedColumns();
    
    if (!search) {
      return data;
    }
    
    // Tìm kiếm chỉ trong các cột đang hiển thị
    return data.filter(assignment => {
      return visibleColumns.some(col => {
        let value: any = '';
        
        switch(col) {
          case 'machineName':
            value = assignment.machineName;
            break;
          case 'deliveryDate':
            value = assignment.deliveryDate ? new Date(assignment.deliveryDate).toLocaleDateString('vi-VN') : '';
            break;
          case 'workItems':
            value = assignment.workItems?.length || 0;
            break;
          case 'approvals':
            value = assignment.approvals?.length || 0;
            break;
          default:
            // Tìm kiếm trong các trường khác nếu có
            value = assignment.standardRequirement || assignment.additionalRequest || '';
        }
        
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(search);
      });
    });
  });

  onSearchChange(value: string) {
    this.searchTerm.set(value);
    this.updateFilteredAssignments();
  }

  private updateFilteredAssignments() {
    this.filteredAssignments = this.filteredData();
  }

  loadAssignments() {
    this.assignmentService.getAllAssignments().subscribe({
      next: (assignments) => {
        // Normalize API response: map assignmentApprovals to approvals for backward compatibility
        assignments = assignments.map(assignment => {
          if (assignment.assignmentApprovals && !assignment.approvals) {
            assignment.approvals = assignment.assignmentApprovals;
          }
          return assignment;
        });

        // Filter assignments by logged-in user
        const currentUser = this.authService.user();
        if (currentUser && this.isUserRole) {
          // Chỉ hiển thị assignments có work items được gán cho user đăng nhập
          this.assignments = assignments.filter(assignment => {
            if (!assignment.workItems || assignment.workItems.length === 0) {
              return false;
            }
            // Kiểm tra xem có work item nào được gán cho user hiện tại không
            return assignment.workItems.some(item => {
              const personId = item.personName;
              return personId && (
                personId === currentUser.id ||
                personId === currentUser.id?.toString() ||
                personId === currentUser.userId?.toString() ||
                personId === currentUser.name
              );
            });
          });
        } else {
          // Admin/Manager: hiển thị tất cả assignments
          this.assignments = assignments;
        }

        this.updateFilteredAssignments();
        // Apply search filter if exists
        if (this.searchTerm()) {
          this.updateFilteredAssignments();
        }
      },
      error: (err) => {
        console.error('Error loading assignments:', err);
        this.assignments = [];
        this.filteredAssignments = [];
      }
    });
  }

  openAssignmentDialog() {
    const dialogRef = this.dialog.open(AssignmentFormDialogComponent, {
      width: '90%',
      maxWidth: '1000px',
      minWidth: '320px',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadAssignments();
      }
    });
  }

  viewAssignment(assignment: MachineAssignment) {
    this.dialog.open(AssignmentDetailDialogComponent, {
      width: '90%',
      maxWidth: '750px',
      minWidth: '320px',
      data: { assignmentId: assignment.assignmentID },
      disableClose: false
    });
  }

  canDeleteAssignment(assignment: MachineAssignment): boolean {
    // Chỉ cho phép xóa khi status = 1 (New)
    const assignmentStatus = assignment.status ?? AssignmentStatus.New;
    return assignmentStatus === AssignmentStatus.New || assignmentStatus === 1;
  }

  getDeleteTooltip(assignment: MachineAssignment): string {
    if (this.canDeleteAssignment(assignment)) {
      return 'Xóa';
    }
    const assignmentStatus = assignment.status ?? AssignmentStatus.New;
    let statusText = 'đang xử lý';
    if (assignmentStatus === AssignmentStatus.Completed || assignmentStatus === 3) {
      statusText = 'hoàn thành';
    } else if (assignmentStatus === AssignmentStatus.InProgress || assignmentStatus === 2) {
      statusText = 'đang xử lý';
    }
    return `Không thể xóa. Chỉ có thể xóa gán công việc ở trạng thái "Mới". Gán công việc này đang ở trạng thái "${statusText}".`;
  }

  toggleColumnVisibility(column: string) {
    const visibility = { ...this.columnVisibility() };
    visibility[column] = !visibility[column];
    this.columnVisibility.set(visibility);
    
    // Cập nhật displayedColumns
    const visibleColumns = this.allColumns().filter(col => visibility[col]);
    this.displayedColumns.set(visibleColumns);
    this.updateFilteredAssignments();
  }

  showAllColumns() {
    const visibility: ColumnVisibility = {};
    this.allColumns().forEach(col => {
      visibility[col] = true;
    });
    this.columnVisibility.set(visibility);
    this.displayedColumns.set([...this.allColumns()]);
    this.updateFilteredAssignments();
  }

  hideAllColumns() {
    const visibility: ColumnVisibility = {};
    this.allColumns().forEach(col => {
      visibility[col] = false;
    });
    this.columnVisibility.set(visibility);
    this.displayedColumns.set([]);
    this.updateFilteredAssignments();
  }

  deleteAssignment(assignment: MachineAssignment) {
    // Kiểm tra status: chỉ cho phép xóa khi status = 1 (New)
    const assignmentStatus = assignment.status ?? AssignmentStatus.New;
    if (assignmentStatus !== AssignmentStatus.New && assignmentStatus !== 1) {
      let statusText = 'đang xử lý';
      if (assignmentStatus === AssignmentStatus.Completed || assignmentStatus === 3) {
        statusText = 'hoàn thành';
      } else if (assignmentStatus === AssignmentStatus.InProgress || assignmentStatus === 2) {
        statusText = 'đang xử lý';
      }
      
      this.snackBar.open(
        `Không thể xóa gán công việc "${assignment.machineName}". Chỉ có thể xóa gán công việc ở trạng thái "Mới" (status = 1). Gán công việc này đang ở trạng thái "${statusText}".`,
        'Đóng',
        {
          duration: 6000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        }
      );
      return;
    }

    // Kiểm tra xem assignment có công việc hoặc ký duyệt liên quan không
    const hasWorkItems = assignment.workItems && assignment.workItems.length > 0;
    const hasApprovals = assignment.approvals && assignment.approvals.length > 0;
    const hasAssignmentApprovals = assignment.assignmentApprovals && assignment.assignmentApprovals.length > 0;
    
    let confirmMessage = `Bạn có chắc muốn xóa gán công việc "${assignment.machineName}"?`;
    if (hasWorkItems || hasApprovals || hasAssignmentApprovals) {
      const workCount = assignment.workItems?.length || 0;
      const approvalCount = (assignment.approvals?.length || 0) + (assignment.assignmentApprovals?.length || 0);
      confirmMessage += `\n\nLưu ý: Assignment này có ${workCount} công việc và ${approvalCount} ký duyệt. Việc xóa có thể gặp lỗi nếu backend chưa hỗ trợ xóa cascade.`;
    }

    if (confirm(confirmMessage)) {
      this.assignmentService.deleteAssignment(assignment.assignmentID).subscribe({
        next: () => {
          this.snackBar.open('Xóa gán công việc thành công!', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          });
          this.loadAssignments();
        },
        error: (err) => {
          console.error('Error deleting assignment:', err);
          
          let errorMessage = 'Không thể xóa gán công việc. ';
          
          if (err.status === 500) {
            const backendError = err.error?.message || err.error?.error || '';
            if (backendError.includes('entity changes') || backendError.includes('foreign key') || backendError.includes('constraint')) {
              errorMessage += 'Assignment này có dữ liệu liên quan (công việc, ký duyệt) không thể xóa. Vui lòng xóa các dữ liệu liên quan trước.';
            } else if (backendError) {
              errorMessage += backendError;
            } else {
              errorMessage += 'Lỗi server. Vui lòng thử lại sau hoặc liên hệ quản trị viên.';
            }
          } else if (err.status === 404) {
            errorMessage += 'Không tìm thấy assignment cần xóa.';
          } else if (err.status === 403) {
            errorMessage += 'Bạn không có quyền xóa assignment này.';
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
  }

  getColumnLabel(column: string): string {
    const labels: { [key: string]: string } = {
      'machineName': 'Tên Máy',
      'deliveryDate': 'Ngày Giao',
      'workItems': 'Công Việc',
      'approvals': 'Ký Duyệt',
      'actions': 'Thao tác'
    };
    return labels[column] || column;
  }
}

