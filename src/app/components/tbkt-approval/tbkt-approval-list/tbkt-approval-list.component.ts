import { Component, OnInit, signal, inject, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AssignmentService } from '../../../services/assignment.service';
import { TechnicalSheet, MachineAssignment, AssignmentStatus } from '../../../models/machine-assignment.model';
import { AuthService } from '../../../services/auth.service';
import { UserRole } from '../../../constants/enums';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-tbkt-approval-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './tbkt-approval-list.component.html',
  styleUrls: ['./tbkt-approval-list.component.css']
})
export class TBKTApprovalListComponent implements OnInit {
  private readonly assignmentService = inject(AssignmentService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly tbktList = signal<TechnicalSheet[]>([]);
  readonly filteredList = signal<TechnicalSheet[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly isManagerL1 = signal(false);
  readonly isManager = signal(false);
  readonly isAdmin = signal(false);
  // Map để lưu trạng thái hoàn thành của từng TBKT (tbkt_ID -> isCompleted)
  private readonly tbktCompletionMap = new Map<string, boolean>();
  
  // Search and filter signals
  readonly searchTerm = signal<string>('');
  readonly filterStatus = signal<string>('all'); // 'all', 'approved', 'pending', 'rejected'
  
  readonly displayedColumns: string[] = [
    'tbkt_ID',
    'archivedDate',
    'managerL1ApprovalStatus',
    'managerApprovalStatus',
    'actions'
  ];

  ngOnInit(): void {
    // Kiểm tra role của user
    const currentUser = this.authService.user();
    const userRoles = currentUser?.roles || [];
    
    // Kiểm tra ManagerL1 - kiểm tra cả case-sensitive và case-insensitive
    const isManagerL1User = this.authService.hasAnyRole(['ManagerL1']) || 
                            userRoles.some(r => r && r.toString().toLowerCase() === 'managerl1');
    
    // Kiểm tra Manager - nhưng không phải ManagerL1
    // Manager có thể là "Manager", "ManagerL2", "ManagerL3", etc. nhưng không phải "ManagerL1"
    const isManagerUser = (this.authService.hasAnyRole([UserRole.Manager, 'Manager']) || 
                          userRoles.some(r => {
                            const roleStr = r?.toString() || '';
                            return roleStr.toLowerCase().startsWith('manager') && 
                                   roleStr.toLowerCase() !== 'managerl1';
                          })) && !isManagerL1User;
    
    const isAdminUser = this.authService.hasAnyRole([
      UserRole.Administrator,
      'Administrator',
      'Admin'
    ]);
    
    this.isManagerL1.set(isManagerL1User);
    this.isManager.set(isManagerUser);
    this.isAdmin.set(isAdminUser);
    
    this.loadTBKTData();
  }

  loadTBKTData(): void {
    this.loading.set(true);
    this.error.set(null);

    // Lấy cả TechnicalSheet và Assignments để kiểm tra status
    // Không dùng needsApproval=true để hiển thị tất cả TBKT đã hoàn thành (kể cả đã duyệt)
    forkJoin({
      sheets: this.assignmentService.getAllTechnicalSheets(undefined, false),
      assignments: this.assignmentService.getAllAssignments()
    }).subscribe({
      next: ({ sheets, assignments }) => {
        // Tạo map để kiểm tra xem tất cả assignments của mỗi TBKT đã hoàn thành chưa
        this.tbktCompletionMap.clear();
        
        // Nhóm assignments theo TBKT_ID
        const assignmentsByTBKT = new Map<string, MachineAssignment[]>();
        assignments.forEach(assignment => {
          const tbktId = String(assignment.tbkt_ID || '').trim();
          if (tbktId) {
            if (!assignmentsByTBKT.has(tbktId)) {
              assignmentsByTBKT.set(tbktId, []);
            }
            assignmentsByTBKT.get(tbktId)!.push(assignment);
          }
        });
        
        // Kiểm tra xem tất cả assignments của mỗi TBKT có status = Completed (3) không
        assignmentsByTBKT.forEach((tbktAssignments, tbktId) => {
          // TBKT được coi là hoàn thành nếu:
          // 1. Có ít nhất 1 assignment
          // 2. TẤT CẢ assignments đều có status = 3 (Completed)
          const allCompleted = tbktAssignments.length > 0 && 
            tbktAssignments.every(assignment => {
              const status = assignment.status ?? AssignmentStatus.New;
              return status === AssignmentStatus.Completed || status === 3;
            });
          this.tbktCompletionMap.set(tbktId, allCompleted);
        });
        
        // Đối với các TBKT không có assignment, đánh dấu là chưa hoàn thành
        sheets.forEach(sheet => {
          const tbktId = String(sheet.tbkt_ID || '').trim();
          if (tbktId && !this.tbktCompletionMap.has(tbktId)) {
            this.tbktCompletionMap.set(tbktId, false);
          }
        });
        
        // Chỉ lấy các TBKT đã hoàn thành (có ArchivedDate) - kể cả đã duyệt hoặc chưa duyệt
        const completedSheets = sheets.filter(sheet => sheet.archivedDate != null);
        
        // Sort by TBKT_ID
        const sorted = completedSheets.sort((a, b) => {
          const aId = String(a.tbkt_ID || '');
          const bId = String(b.tbkt_ID || '');
          return aId.localeCompare(bId);
        });
        this.tbktList.set(sorted);
        this.applyFilter();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading TBKT approval data:', err);
        this.error.set('Không thể tải dữ liệu cần duyệt. Vui lòng thử lại sau.');
        this.loading.set(false);
      }
    });
  }

  formatDate(date: Date | string | null | undefined): string {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    return `${('00' + day).slice(-2)}/${('00' + month).slice(-2)}/${year}`;
  }

  getApprovalStatus(sheet: TechnicalSheet, level: 'ManagerL1' | 'Manager'): string {
    if (level === 'ManagerL1') {
      if (!sheet.managerL1ApprovalStatus) return 'Chờ ký';
      if (sheet.managerL1ApprovalStatus === 'Approved') return 'Đã ký';
      if (sheet.managerL1ApprovalStatus === 'Rejected') return 'Đã từ chối';
      return sheet.managerL1ApprovalStatus;
    } else {
      if (!sheet.managerApprovalStatus) return 'Chờ duyệt';
      if (sheet.managerApprovalStatus === 'Approved') return 'Đã duyệt';
      if (sheet.managerApprovalStatus === 'Rejected') return 'Đã từ chối';
      return sheet.managerApprovalStatus;
    }
  }

  getApprovalStatusClass(sheet: TechnicalSheet, level: 'ManagerL1' | 'Manager'): string {
    if (level === 'ManagerL1') {
      if (!sheet.managerL1ApprovalStatus) return 'status-pending';
      if (sheet.managerL1ApprovalStatus === 'Approved') return 'status-approved';
      if (sheet.managerL1ApprovalStatus === 'Rejected') return 'status-rejected';
      return 'status-pending';
    } else {
      if (!sheet.managerApprovalStatus) return 'status-pending';
      if (sheet.managerApprovalStatus === 'Approved') return 'status-approved';
      if (sheet.managerApprovalStatus === 'Rejected') return 'status-rejected';
      return 'status-pending';
    }
  }

  canApprove(sheet: TechnicalSheet): boolean {
    const tbktId = String(sheet.tbkt_ID || '').trim();
    
    // TBKT phải có archivedDate (đã hoàn thành) mới có thể approve
    if (!sheet.archivedDate) {
      return false; // Chưa hoàn thành, không thể approve
    }

    // Kiểm tra nếu đã bị từ chối ở bất kỳ cấp nào thì không thể approve lại
    if (sheet.managerL1ApprovalStatus === 'Rejected' || sheet.managerApprovalStatus === 'Rejected') {
      return false;
    }

    // QUAN TRỌNG: Kiểm tra xem tất cả assignments (workitems) của TBKT đã hoàn thành chưa
    // Tất cả các khâu của máy (workitems) phải hoàn thành hết mới cho phép ký duyệt
    const isAllAssignmentsCompleted = this.tbktCompletionMap.get(tbktId);
    const hasAssignments = this.tbktCompletionMap.has(tbktId);
    
    // Nếu TBKT có assignments, tất cả phải hoàn thành (status = Completed/3) mới cho phép approve
    if (hasAssignments && isAllAssignmentsCompleted !== true) {
      return false; // Chưa hoàn thành tất cả assignments, không thể approve
    }

    // Nếu TBKT không có assignments nào, vẫn cho phép approve nếu có archivedDate
    // (trường hợp đặc biệt: TBKT không có workitems nhưng đã được đánh dấu hoàn thành)

    let result = false;
    let reason = '';

    if (this.isManagerL1()) {
      // ManagerL1 có thể approve khi chưa có approval hoặc đang pending
      result = !sheet.managerL1ApprovalStatus || sheet.managerL1ApprovalStatus === 'Pending';
      reason = result ? 'ManagerL1 can approve' : `ManagerL1 cannot approve (status: ${sheet.managerL1ApprovalStatus})`;
    } else if (this.isManager()) {
      // Manager chỉ có thể approve sau khi ManagerL1 đã approve
      result = sheet.managerL1ApprovalStatus === 'Approved' && 
             (!sheet.managerApprovalStatus || sheet.managerApprovalStatus === 'Pending');
      reason = result ? 'Manager can approve' : `Manager cannot approve (L1: ${sheet.managerL1ApprovalStatus}, Manager: ${sheet.managerApprovalStatus})`;
    } else if (this.isAdmin()) {
      // Admin có thể approve ở bất kỳ cấp nào
      result = (!sheet.managerL1ApprovalStatus || sheet.managerL1ApprovalStatus === 'Pending') ||
             (sheet.managerL1ApprovalStatus === 'Approved' && 
              (!sheet.managerApprovalStatus || sheet.managerApprovalStatus === 'Pending'));
      reason = result ? 'Admin can approve' : 'Admin cannot approve';
    } else {
      reason = `No matching role (isManagerL1: ${this.isManagerL1()}, isManager: ${this.isManager()}, isAdmin: ${this.isAdmin()})`;
    }

    return result;
  }

  getApprovalLevel(sheet: TechnicalSheet): 'ManagerL1' | 'Manager' | null {
    if (this.isManagerL1() || (this.isAdmin() && (!sheet.managerL1ApprovalStatus || sheet.managerL1ApprovalStatus === 'Pending'))) {
      return 'ManagerL1';
    }
    if (this.isManager() || (this.isAdmin() && sheet.managerL1ApprovalStatus === 'Approved' && (!sheet.managerApprovalStatus || sheet.managerApprovalStatus === 'Pending'))) {
      return 'Manager';
    }
    return null;
  }

  getApprovalButtonText(sheet: TechnicalSheet): string {
    const level = this.getApprovalLevel(sheet);
    if (level === 'ManagerL1') {
      return 'Ký xác nhận';
    } else if (level === 'Manager') {
      return 'Duyệt';
    }
    return 'Xử lý';
  }

  openApprovalDialog(sheet: TechnicalSheet): void {
    const approvalLevel = this.getApprovalLevel(sheet);
    if (!approvalLevel) return;

    const dialogRef = this.dialog.open(TBKTApprovalDialogComponent, {
      width: '500px',
      data: { sheet, approvalLevel }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadTBKTData();
      }
    });
  }

  refresh(): void {
    this.loadTBKTData();
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.applyFilter();
  }

  onFilterStatusChange(value: string): void {
    this.filterStatus.set(value);
    this.applyFilter();
  }

  applyFilter(): void {
    const search = this.searchTerm().toLowerCase().trim();
    const statusFilter = this.filterStatus();
    const list = this.tbktList();
    
    let filtered = list;

    // Apply search filter
    if (search) {
      filtered = filtered.filter(sheet => {
        const tbktId = String(sheet.tbkt_ID || '').toLowerCase();
        const archivedDate = this.formatDate(sheet.archivedDate).toLowerCase();
        const managerL1Status = this.getApprovalStatus(sheet, 'ManagerL1').toLowerCase();
        const managerStatus = this.getApprovalStatus(sheet, 'Manager').toLowerCase();
        
        return tbktId.includes(search) ||
               archivedDate.includes(search) ||
               managerL1Status.includes(search) ||
               managerStatus.includes(search);
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sheet => {
        // Kiểm tra nếu có bất kỳ cấp nào bị từ chối
        const isRejected = sheet.managerL1ApprovalStatus === 'Rejected' || 
                          sheet.managerApprovalStatus === 'Rejected';
        
        // Kiểm tra nếu Manager đã duyệt (cấp cuối cùng)
        const isApproved = sheet.managerApprovalStatus === 'Approved';
        
        // Kiểm tra nếu đang chờ duyệt (ManagerL1 đã approved nhưng Manager chưa, hoặc cả hai đều chưa)
        const isPending = !isRejected && !isApproved && 
                         (sheet.managerL1ApprovalStatus === 'Approved' || 
                          !sheet.managerL1ApprovalStatus || 
                          sheet.managerL1ApprovalStatus === 'Pending');
        
        if (statusFilter === 'approved') {
          return isApproved;
        } else if (statusFilter === 'pending') {
          return isPending;
        } else if (statusFilter === 'rejected') {
          return isRejected;
        }
        return true;
      });
    }

    this.filteredList.set(filtered);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.filterStatus.set('all');
    this.applyFilter();
  }
}

// Dialog Component for Approve/Reject TBKT
@Component({
  selector: 'app-tbkt-approval-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <h2 mat-dialog-title>
      {{ data.approvalLevel === 'ManagerL1' ? 'Ký Xác Nhận (ManagerL1)' : 'Duyệt Cuối Cùng (Manager)' }}
    </h2>
    
    <mat-dialog-content>
      <div class="approval-info">
        <p><strong>TBKT:</strong> {{ data.sheet.tbkt_ID }}</p>
        <p *ngIf="data.sheet.archivedDate">
          <strong>Ngày lưu trữ:</strong> {{ formatDate(data.sheet.archivedDate) }}
        </p>
        <p *ngIf="data.sheet.managerL1ApprovalStatus && data.approvalLevel === 'Manager'">
          <strong>Trạng thái ManagerL1:</strong> 
          <span [class]="getStatusClass(data.sheet.managerL1ApprovalStatus)">
            {{ getStatusText(data.sheet.managerL1ApprovalStatus) }}
          </span>
        </p>
      </div>

      <form [formGroup]="approvalForm" class="approval-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Ghi chú (tùy chọn)</mat-label>
          <textarea matInput formControlName="notes" rows="3" placeholder="Nhập ghi chú nếu có"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">
        <mat-icon>close</mat-icon>
        Hủy
      </button>
      <button mat-raised-button color="warn" (click)="onReject()" [disabled]="submitting()">
        <mat-icon>cancel</mat-icon>
        Từ chối
      </button>
      <button mat-raised-button color="primary" (click)="onApprove()" [disabled]="submitting()">
        <mat-icon *ngIf="!submitting()">check</mat-icon>
        <mat-spinner *ngIf="submitting()" diameter="20" style="display: inline-block; margin-right: 8px;"></mat-spinner>
        {{ data.approvalLevel === 'ManagerL1' ? 'Ký xác nhận' : 'Duyệt' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .approval-info {
      margin-bottom: 20px;
      padding: 16px;
      background-color: #f5f5f5;
      border-radius: 4px;
    }
    .approval-info p {
      margin: 8px 0;
    }
    .approval-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px 0;
    }
    .full-width {
      width: 100%;
    }
    .status-approved {
      color: green;
      font-weight: bold;
    }
    .status-rejected {
      color: red;
      font-weight: bold;
    }
    .status-pending {
      color: orange;
      font-weight: bold;
    }
    mat-dialog-content {
      min-height: 200px;
    }
    mat-dialog-actions {
      padding: 16px 24px;
    }
  `]
})
export class TBKTApprovalDialogComponent {
  private readonly assignmentService = inject(AssignmentService);
  private readonly dialogRef = inject(MatDialogRef<TBKTApprovalDialogComponent>);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly submitting = signal(false);
  readonly approvalForm: FormGroup;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { sheet: TechnicalSheet; approvalLevel: 'ManagerL1' | 'Manager' }) {
    this.approvalForm = this.fb.group({
      notes: ['']
    });
  }

  formatDate(date: Date | string | null | undefined): string {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    return `${('00' + day).slice(-2)}/${('00' + month).slice(-2)}/${year}`;
  }

  getStatusText(status: string | undefined): string {
    if (!status) return 'Chưa xử lý';
    switch (status.toLowerCase()) {
      case 'approved': return 'Đã duyệt';
      case 'rejected': return 'Đã từ chối';
      case 'pending': return 'Đang chờ';
      default: return status;
    }
  }

  getStatusClass(status: string | undefined): string {
    if (!status) return '';
    switch (status.toLowerCase()) {
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      case 'pending': return 'status-pending';
      default: return '';
    }
  }

  onApprove(): void {
    this.submitAction('approve');
  }

  onReject(): void {
    if (!confirm('Bạn có chắc muốn từ chối TechnicalSheet này?')) {
      return;
    }
    this.submitAction('reject');
  }

  submitAction(action: 'approve' | 'reject'): void {
    this.submitting.set(true);
    const notes = this.approvalForm.get('notes')?.value || undefined;

    this.assignmentService.approveTechnicalSheet(
      String(this.data.sheet.tbkt_ID),
      this.data.approvalLevel,
      action,
      notes
    ).subscribe({
      next: () => {
        const message = action === 'approve' 
          ? (this.data.approvalLevel === 'ManagerL1' ? 'Ký xác nhận thành công!' : 'Duyệt thành công!')
          : 'Từ chối thành công!';
        this.snackBar.open(message, 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
        });
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error('Error approving TechnicalSheet:', err);
        let errorMessage = action === 'approve' ? 'Không thể duyệt. ' : 'Không thể từ chối. ';
        
        if (err.status === 403) {
          errorMessage += err.error?.message || 'Bạn không có quyền thực hiện hành động này.';
        } else if (err.status === 400) {
          errorMessage += err.error?.message || 'Dữ liệu không hợp lệ.';
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
        this.submitting.set(false);
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
