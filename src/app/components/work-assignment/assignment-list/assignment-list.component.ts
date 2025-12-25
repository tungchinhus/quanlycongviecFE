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
import { TechnicalSheet, MachineAssignment, AssignmentStatus } from '../../../models/machine-assignment.model';
import { AuthService } from '../../../services/auth.service';
import { UserRole } from '../../../constants/enums';
import { AssignmentFormDialogComponent } from '../assignment-form-dialog/assignment-form-dialog.component';

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
  readonly technicalSheets = signal<TechnicalSheet[]>([]);
  filteredTechnicalSheets: TechnicalSheet[] = [];
  assignments: MachineAssignment[] = []; // Để kiểm tra xem technical sheet có assignments chưa
  readonly searchTerm = signal<string>('');
  readonly displayedColumns = signal<string[]>([]);
  readonly allColumns = signal<string[]>([]);
  readonly columnVisibility = signal<ColumnVisibility>({});
  isUserRole: boolean = false;
  isAdminOrManager: boolean = false;

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
    this.loadTechnicalSheets();
  }

  checkUserRole() {
    const currentUser = this.authService.user();
    this.isUserRole = currentUser?.roles?.includes(UserRole.User) || false;
    // Kiểm tra nếu user là Admin hoặc Manager (bao gồm ManagerL1, ManagerL2, v.v.)
    this.isAdminOrManager = this.authService.hasAnyRole([
      UserRole.Administrator, 
      'Administrator', 
      'Admin',
      UserRole.Manager,
      'Manager',
      'ManagerL1',
      'ManagerL2',
      'ManagerL3'
    ]);
  }

  setupDisplayedColumns() {
    // Các cột hiển thị cho technical sheets (đã bỏ: phase, salesOrder, drawingDate, deliveryDate, requesterElectrical, requesterMechanical)
    const columns: string[] = [
      'tbkt_ID',
      'power_kVA',
      'voltageSpec',
      'standardCode',
      'actions'
    ];
    
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
    const data = this.technicalSheets();
    const search = this.searchTerm().toLowerCase().trim();
    const visibleColumns = this.displayedColumns();
    
    if (!search) {
      return data;
    }
    
    // Tìm kiếm chỉ trong các cột đang hiển thị
    return data.filter(sheet => {
      return visibleColumns.some(col => {
        let value: any = '';
        
        switch(col) {
          case 'tbkt_ID':
            value = sheet.tbkt_ID;
            break;
          case 'power_kVA':
            value = sheet.power_kVA;
            break;
          case 'voltageSpec':
            value = sheet.voltageSpec;
            break;
          case 'standardCode':
            value = sheet.standardCode;
            break;
          default:
            value = '';
        }
        
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(search);
      });
    });
  });

  onSearchChange(value: string) {
    this.searchTerm.set(value);
    this.updateFilteredTechnicalSheets();
  }

  private updateFilteredTechnicalSheets() {
    this.filteredTechnicalSheets = this.filteredData();
  }

  loadTechnicalSheets() {
    // Load cả technical sheets và assignments để kiểm tra trạng thái
    // Nếu là Admin/Manager, không truyền firebaseUID để xem tất cả
    // Nếu không phải Admin/Manager, truyền firebaseUID để chỉ xem của mình
    const currentUser = this.authService.user();
    const firebaseUID = this.isAdminOrManager ? undefined : currentUser?.firebaseUid;
    
    console.log('Loading TechnicalSheets - isAdminOrManager:', this.isAdminOrManager, 'firebaseUID:', firebaseUID);
    
    this.assignmentService.getAllTechnicalSheets(firebaseUID).subscribe({
      next: (sheets) => {
        console.log('Received TechnicalSheets:', sheets.length, sheets);
        this.technicalSheets.set(sheets || []);
        this.updateFilteredTechnicalSheets();
        console.log('Updated filteredTechnicalSheets:', this.filteredTechnicalSheets.length);
      },
      error: (err) => {
        console.error('Error loading technical sheets:', err);
        this.technicalSheets.set([]);
        this.filteredTechnicalSheets = [];
        this.snackBar.open('Không thể tải danh sách đề nghị. Vui lòng thử lại sau.', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });

    // Load assignments để kiểm tra xem technical sheet nào đã có assignment
    this.assignmentService.getAllAssignments().subscribe({
      next: (assignments) => {
        this.assignments = assignments;
      },
      error: (err) => {
        console.error('Error loading assignments:', err);
        // Không hiển thị lỗi vì đây chỉ để kiểm tra trạng thái
      }
    });
  }

  viewTechnicalSheet(sheet: TechnicalSheet) {
    // Có thể mở dialog để xem chi tiết technical sheet hoặc điều hướng đến trang chi tiết
    this.snackBar.open(`Xem chi tiết đề nghị: ${sheet.tbkt_ID}`, 'Đóng', {
      duration: 2000,
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
    // TODO: Implement view technical sheet detail dialog or navigation
  }

  openAssignmentDialog(sheet: TechnicalSheet) {
    // Kiểm tra xem có assignment ở trạng thái "New" không
    const newAssignment = this.getNewAssignment(sheet);
    
    // Mở dialog tạo hoặc chỉnh sửa assignment
    const dialogRef = this.dialog.open(AssignmentFormDialogComponent, {
      width: '90%',
      maxWidth: '1000px',
      minWidth: '320px',
      disableClose: false,
      data: { 
        tbktId: sheet.tbkt_ID,
        technicalSheet: sheet,
        assignment: newAssignment, // Truyền assignment nếu có để edit
        isEditMode: newAssignment !== null
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      // Reload data sau khi lưu thành công (khi dialog trả về true)
      if (result) {
        this.loadTechnicalSheets();
      }
    });
  }

  canCreateAssignment(sheet: TechnicalSheet): boolean {
    // Chỉ cho phép tạo assignment khi chưa có assignment nào (trạng thái mới)
    // Kiểm tra xem có assignment nào sử dụng technical sheet này không
    const hasAssignments = this.assignments.some(assignment => 
      assignment.tbkt_ID === sheet.tbkt_ID || 
      assignment.tbkt_ID === sheet.tbkt_ID?.toString()
    );
    return !hasAssignments;
  }

  getNewAssignment(sheet: TechnicalSheet): MachineAssignment | null {
    // Tìm assignment với trạng thái "New" liên quan đến technical sheet này
    const newAssignment = this.assignments.find(assignment => {
      const matchesTBKT = assignment.tbkt_ID === sheet.tbkt_ID || 
                          assignment.tbkt_ID === sheet.tbkt_ID?.toString();
      if (!matchesTBKT) return false;
      
      const status = assignment.status ?? AssignmentStatus.New;
      return status === AssignmentStatus.New || status === 1;
    });
    return newAssignment || null;
  }

  hasNewAssignment(sheet: TechnicalSheet): boolean {
    return this.getNewAssignment(sheet) !== null;
  }

  canDeleteTechnicalSheet(sheet: TechnicalSheet): boolean {
    // Tìm assignment liên quan đến technical sheet này
    const relatedAssignments = this.assignments.filter(assignment => 
      assignment.tbkt_ID === sheet.tbkt_ID || 
      assignment.tbkt_ID === sheet.tbkt_ID?.toString()
    );

    // Nếu chưa có assignment nào, cho phép xóa
    if (relatedAssignments.length === 0) {
      return true;
    }

    // Nếu có assignment, chỉ cho phép xóa khi:
    // 1. Tất cả assignment đều ở trạng thái "New" (status = 1)
    // 2. Không có work item nào đã được cập nhật (chưa có StartDate, ExpectedFinish, ActualFinish, PersonConfirmation, Notes, File_ID)
    return relatedAssignments.every(assignment => {
      const status = assignment.status ?? AssignmentStatus.New;
      const isNewStatus = status === AssignmentStatus.New || status === 1;
      
      if (!isNewStatus) {
        return false;
      }

      // Kiểm tra xem có work item nào đã được cập nhật chưa
      // Work item được coi là đã cập nhật nếu có bất kỳ trường nào: StartDate, ExpectedFinish, ActualFinish, PersonConfirmation, Notes, File_ID
      if (assignment.workItems && assignment.workItems.length > 0) {
        const hasUpdatedWorkItems = assignment.workItems.some(wi => 
          wi.startDate != null ||
          wi.expectedFinish != null ||
          wi.actualFinish != null ||
          wi.personConfirmation != null ||
          (wi.notes != null && wi.notes.trim() !== '') ||
          (wi.file_ID != null && wi.file_ID.trim() !== '')
        );
        
        if (hasUpdatedWorkItems) {
          return false;
        }
      }

      return true;
    });
  }

  deleteTechnicalSheet(sheet: TechnicalSheet) {
    // Tìm assignment liên quan đến technical sheet này
    const relatedAssignments = this.assignments.filter(assignment => 
      assignment.tbkt_ID === sheet.tbkt_ID || 
      assignment.tbkt_ID === sheet.tbkt_ID?.toString()
    );

    // Kiểm tra trạng thái của assignment
    if (relatedAssignments.length > 0) {
      // Kiểm tra xem có assignment nào không phải trạng thái New
      const hasNonNewStatus = relatedAssignments.some(assignment => {
        const status = assignment.status ?? AssignmentStatus.New;
        return status !== AssignmentStatus.New && status !== 1;
      });

      if (hasNonNewStatus) {
        // Tìm assignment không phải trạng thái New để hiển thị thông báo
        const nonNewAssignments = relatedAssignments.filter(assignment => {
          const status = assignment.status ?? AssignmentStatus.New;
          return status !== AssignmentStatus.New && status !== 1;
        });

        let statusText = 'đang xử lý';
        if (nonNewAssignments.length > 0) {
          const firstStatus = nonNewAssignments[0].status ?? AssignmentStatus.New;
          if (firstStatus === AssignmentStatus.Completed || firstStatus === 3) {
            statusText = 'hoàn thành';
          } else if (firstStatus === AssignmentStatus.InProgress || firstStatus === 2) {
            statusText = 'đang xử lý';
          }
        }

        this.snackBar.open(
          `Không thể xóa đề nghị "${sheet.tbkt_ID}". Gán công việc liên quan đang ở trạng thái "${statusText}". Chỉ có thể xóa khi gán công việc ở trạng thái "Mới".`,
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

      // Kiểm tra xem có work item nào đã được cập nhật chưa
      const hasUpdatedWorkItems = relatedAssignments.some(assignment => {
        if (assignment.workItems && assignment.workItems.length > 0) {
          return assignment.workItems.some(wi => 
            wi.startDate != null ||
            wi.expectedFinish != null ||
            wi.actualFinish != null ||
            wi.personConfirmation != null ||
            (wi.notes != null && wi.notes.trim() !== '') ||
            (wi.file_ID != null && wi.file_ID.trim() !== '')
          );
        }
        return false;
      });

      if (hasUpdatedWorkItems) {
        this.snackBar.open(
          `Không thể xóa đề nghị "${sheet.tbkt_ID}". Gán công việc liên quan đã có công việc con được cập nhật (đã có ngày bắt đầu, ngày hoàn thành dự kiến, ngày hoàn thành thực tế, xác nhận, ghi chú hoặc file đính kèm). Chỉ có thể xóa giao việc mới chưa có công việc con nào được cập nhật.`,
          'Đóng',
          {
            duration: 7000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          }
        );
        return;
      }
    }

    let confirmMessage = `Bạn có chắc muốn xóa đề nghị "${sheet.tbkt_ID}"?`;
    if (relatedAssignments.length > 0) {
      confirmMessage += `\n\nLưu ý: Đề nghị này đã có ${relatedAssignments.length} gán công việc ở trạng thái "Mới". Việc xóa sẽ xóa cả các gán công việc liên quan.`;
    }
    if (confirm(confirmMessage)) {
      this.assignmentService.deleteTechnicalSheet(sheet.tbkt_ID).subscribe({
        next: () => {
          this.snackBar.open('Xóa đề nghị thành công!', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          });
          this.loadTechnicalSheets();
        },
        error: (err) => {
          console.error('Error deleting technical sheet:', err);
          
          let errorMessage = 'Không thể xóa đề nghị. ';
          
          if (err.status === 500) {
            const backendError = err.error?.message || err.error?.error || '';
            if (backendError.includes('being used') || backendError.includes('assignment')) {
              errorMessage += 'Đề nghị này đang được sử dụng bởi một hoặc nhiều gán công việc. Vui lòng xóa các gán công việc trước.';
            } else if (backendError) {
              errorMessage += backendError;
            } else {
              errorMessage += 'Lỗi server. Vui lòng thử lại sau hoặc liên hệ quản trị viên.';
            }
          } else if (err.status === 404) {
            errorMessage += 'Không tìm thấy đề nghị cần xóa.';
          } else if (err.status === 403) {
            errorMessage += 'Bạn không có quyền xóa đề nghị này.';
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

  toggleColumnVisibility(column: string) {
    const visibility = { ...this.columnVisibility() };
    visibility[column] = !visibility[column];
    this.columnVisibility.set(visibility);
    
    // Cập nhật displayedColumns
    const visibleColumns = this.allColumns().filter(col => visibility[col]);
    this.displayedColumns.set(visibleColumns);
    this.updateFilteredTechnicalSheets();
  }

  showAllColumns() {
    const visibility: ColumnVisibility = {};
    this.allColumns().forEach(col => {
      visibility[col] = true;
    });
    this.columnVisibility.set(visibility);
    this.displayedColumns.set([...this.allColumns()]);
    this.updateFilteredTechnicalSheets();
  }

  hideAllColumns() {
    const visibility: ColumnVisibility = {};
    this.allColumns().forEach(col => {
      visibility[col] = false;
    });
    this.columnVisibility.set(visibility);
    this.displayedColumns.set([]);
    this.updateFilteredTechnicalSheets();
  }

  getColumnLabel(column: string): string {
    const labels: { [key: string]: string } = {
      'tbkt_ID': 'TBKT',
      'power_kVA': 'Công Suất (kVA)',
      'voltageSpec': 'Điện Áp',
      'standardCode': 'Mã Tiêu Chuẩn',
      'actions': 'Menu'
    };
    return labels[column] || column;
  }
}





