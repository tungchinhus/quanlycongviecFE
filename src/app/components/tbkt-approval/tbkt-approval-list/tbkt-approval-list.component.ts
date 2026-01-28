import { Component, OnInit, signal, inject, Inject, ChangeDetectorRef } from '@angular/core';
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
import { MatExpansionModule } from '@angular/material/expansion';
import { AssignmentService } from '../../../services/assignment.service';
import { FileService } from '../../../services/file.service';
import { TechnicalSheet, MachineAssignment, WorkItem } from '../../../models/machine-assignment.model';
import { FileDocument } from '../../../models/file.model';
import { AuthService } from '../../../services/auth.service';
import { UserRole } from '../../../constants/enums';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

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
        
        // Kiểm tra "tất cả công đoạn thiết kế đã hoàn thành" theo WorkItems, không theo assignment.Status.
        // Assignment.Status = 3 chỉ khi đã ManagerL1+Manager duyệt → nếu dựa vào đó thì ManagerL1
        // không bao giờ thấy TBKT để ký (vòng lặp). Do đó dùng: mọi assignment của TBKT có
        // tất cả work items đã xác nhận (personConfirmation === true) = sẵn sàng cho ManagerL1.
        assignmentsByTBKT.forEach((tbktAssignments, tbktId) => {
          const allWorkItemsConfirmed = tbktAssignments.length > 0 &&
            tbktAssignments.every(assignment => {
              const items = assignment.workItems ?? [];
              return items.length > 0 && items.every(wi => wi.personConfirmation === true);
            });
          this.tbktCompletionMap.set(tbktId, allWorkItemsConfirmed);
        });
        
        // Đối với các TBKT không có assignment, đánh dấu là chưa hoàn thành
        sheets.forEach(sheet => {
          const tbktId = String(sheet.tbkt_ID || '').trim();
          if (tbktId && !this.tbktCompletionMap.has(tbktId)) {
            this.tbktCompletionMap.set(tbktId, false);
          }
        });
        
        // Lấy các TBKT cần/sẵn sàng cho ký duyệt:
        // 1. Có ArchivedDate (đã được đánh dấu hoàn thành thủ công), HOẶC
        // 2. Tất cả công đoạn thiết kế (work items) đã xác nhận hoàn thành — khi đó ManagerL1 thấy TBKT tổng để ký
        const completedSheets = sheets.filter(sheet => {
          const tbktId = String(sheet.tbkt_ID || '').trim();
          const hasArchivedDate = sheet.archivedDate != null;
          const allAssignmentsCompleted = this.tbktCompletionMap.get(tbktId) === true;
          
          // Hiển thị nếu có archivedDate HOẶC tất cả assignments đã hoàn thành
          return hasArchivedDate || allAssignmentsCompleted;
        });
        
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
    
    // Kiểm tra nếu đã bị từ chối ở bất kỳ cấp nào thì không thể approve lại
    if (sheet.managerL1ApprovalStatus === 'Rejected' || sheet.managerApprovalStatus === 'Rejected') {
      return false;
    }

    // QUAN TRỌNG: Kiểm tra xem tất cả assignments (workitems) của TBKT đã hoàn thành chưa
    // Tất cả các khâu của máy (workitems) phải hoàn thành hết mới cho phép ký duyệt
    const isAllAssignmentsCompleted = this.tbktCompletionMap.get(tbktId);
    const hasAssignments = this.tbktCompletionMap.has(tbktId);
    
    // TBKT có thể approve nếu:
    // 1. Có archivedDate (đã được đánh dấu hoàn thành thủ công), HOẶC
    // 2. Có tất cả assignments đã hoàn thành (status = Completed/3)
    const hasArchivedDate = sheet.archivedDate != null;
    const canApproveByCompletion = hasArchivedDate || (hasAssignments && isAllAssignmentsCompleted === true);
    
    if (!canApproveByCompletion) {
      return false; // Chưa hoàn thành (không có archivedDate và không phải tất cả assignments đã hoàn thành)
    }
    
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

  openTBKTDetailDialog(sheet: TechnicalSheet): void {
    const tbktId = String(sheet.tbkt_ID || '').trim();
    forkJoin({
      sheet: this.assignmentService.getTechnicalSheet(sheet.tbkt_ID),
      assignments: this.assignmentService.getAllAssignments()
    }).subscribe({
      next: ({ sheet: fullSheet, assignments }) => {
        const assignmentsForTbkt = (assignments || []).filter(
          a => String(a.tbkt_ID || '').trim() === tbktId
        );
        this.dialog.open(TBKTDetailDialogComponent, {
          width: '800px',
          maxWidth: '90vw',
          data: { sheet: fullSheet, assignments: assignmentsForTbkt }
        });
      },
      error: () => {
        this.snackBar.open('Không thể tải thông tin chi tiết TBKT', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
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

// Dialog Component for Viewing TBKT Details
@Component({
  selector: 'app-tbkt-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatExpansionModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>info</mat-icon>
      Thông tin chi tiết TBKT: {{ data.sheet.tbkt_ID }}
    </h2>
    
    <mat-dialog-content>
      <div class="detail-container">
        <!-- Thông tin cơ bản -->
        <div class="detail-section">
          <h3 class="section-title">Thông tin cơ bản</h3>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">TBKT ID:</span>
              <span class="detail-value">{{ data.sheet.tbkt_ID || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Công suất (kVA):</span>
              <span class="detail-value">{{ data.sheet.power_kVA || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Điện áp:</span>
              <span class="detail-value">{{ data.sheet.voltageSpec || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Pha:</span>
              <span class="detail-value">{{ data.sheet.phase || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Mã tiêu chuẩn:</span>
              <span class="detail-value">{{ data.sheet.standardCode || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Ngày giao hàng:</span>
              <span class="detail-value">{{ formatDate(data.sheet.deliveryDate) }}</span>
            </div>
          </div>
        </div>

        <!-- Thông tin người phụ trách: panel expand/collapse Thiết kế vỏ, Thiết kế ruột -->
        <div class="detail-section">
          <h3 class="section-title">Thông tin người phụ trách</h3>
          <mat-accordion class="responsible-accordion">
            <mat-expansion-panel>
              <mat-expansion-panel-header>
                <mat-panel-title>{{ getCasingPanelTitle() }}</mat-panel-title>
              </mat-expansion-panel-header>
              <div class="work-items-list" *ngIf="getCasingWorkItems().length > 0; else emptyCasing">
                <ng-container *ngFor="let wi of getCasingWorkItems()">
                <div class="work-item-row" *ngIf="hasWorkItemData(wi)">
                  <div class="wi-dates">
                    <span class="wi-date"><strong>Ngày bắt đầu:</strong> {{ formatDate(wi.startDate) }}</span>
                    <span class="wi-date"><strong>Ngày hoàn thành:</strong> {{ formatDate(wi.actualFinish) || formatDate(wi.expectedFinish) }}</span>
                  </div>
                  <div class="wi-files" *ngIf="getFilesForWorkItem(wi).length > 0">
                    <span class="wi-files-label">File thiết kế:</span>
                    <span class="wi-file-link" *ngFor="let f of getFilesForWorkItem(wi)">
                      <button type="button" mat-button color="primary" (click)="downloadFile(f)">
                        <mat-icon>download</mat-icon>
                        {{ f.fileName || ('File ' + (f.id || f.fileID)) }}
                      </button>
                    </span>
                  </div>
                </div>
                </ng-container>
              </div>
              <ng-template #emptyCasing>
                <p class="empty-hint">Chưa có thông tin thiết kế vỏ</p>
              </ng-template>
            </mat-expansion-panel>
            <mat-expansion-panel>
              <mat-expansion-panel-header>
                <mat-panel-title>{{ getCorePanelTitle() }}</mat-panel-title>
              </mat-expansion-panel-header>
              <div class="work-items-list" *ngIf="getCoreWorkItems().length > 0; else emptyCore">
                <ng-container *ngFor="let wi of getCoreWorkItems()">
                <div class="work-item-row" *ngIf="hasWorkItemData(wi)">
                  <div class="wi-dates">
                    <span class="wi-date"><strong>Ngày bắt đầu:</strong> {{ formatDate(wi.startDate) }}</span>
                    <span class="wi-date"><strong>Ngày hoàn thành:</strong> {{ formatDate(wi.actualFinish) || formatDate(wi.expectedFinish) }}</span>
                  </div>
                  <div class="wi-files" *ngIf="getFilesForWorkItem(wi).length > 0">
                    <span class="wi-files-label">File thiết kế:</span>
                    <span class="wi-file-link" *ngFor="let f of getFilesForWorkItem(wi)">
                      <button type="button" mat-button color="primary" (click)="downloadFile(f)">
                        <mat-icon>download</mat-icon>
                        {{ f.fileName || ('File ' + (f.id || f.fileID)) }}
                      </button>
                    </span>
                  </div>
                </div>
                </ng-container>
              </div>
              <ng-template #emptyCore>
                <p class="empty-hint">Chưa có thông tin thiết kế ruột</p>
              </ng-template>
            </mat-expansion-panel>
          </mat-accordion>
        </div>

        <!-- Thông tin ký duyệt: 2 cột Trưởng phòng (trái) | Giám đốc khối (phải) -->
        <div class="detail-section">
          <h3 class="section-title">Thông tin ký duyệt</h3>
          <div class="approval-info approval-info-two-cols">
            <div class="approval-col">
              <div class="approval-item">
                <span class="approval-label">Trưởng phòng</span>
                <span [class]="getStatusClass(data.sheet.managerL1ApprovalStatus)">
                  {{ getStatusText(data.sheet.managerL1ApprovalStatus) }}
                </span>
                <span *ngIf="data.sheet.managerL1ApprovalDate" class="approval-date">
                  ({{ formatDate(data.sheet.managerL1ApprovalDate) }})
                </span>
              </div>
              <div class="approval-item" *ngIf="data.sheet.managerL1ApprovalNotes">
                <span class="approval-label">Ghi chú:</span>
                <span class="approval-notes">{{ data.sheet.managerL1ApprovalNotes }}</span>
              </div>
            </div>
            <div class="approval-col">
              <div class="approval-item">
                <span class="approval-label">Giám đốc khối</span>
                <span [class]="getStatusClass(data.sheet.managerApprovalStatus)">
                  {{ getStatusText(data.sheet.managerApprovalStatus) }}
                </span>
                <span *ngIf="data.sheet.managerApprovalDate" class="approval-date">
                  ({{ formatDate(data.sheet.managerApprovalDate) }})
                </span>
              </div>
              <div class="approval-item" *ngIf="data.sheet.managerApprovalNotes">
                <span class="approval-label">Ghi chú:</span>
                <span class="approval-notes">{{ data.sheet.managerApprovalNotes }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Ghi chú -->
        <div class="detail-section" *ngIf="data.sheet.notes">
          <h3 class="section-title">Ghi chú</h3>
          <div class="notes-content">{{ data.sheet.notes }}</div>
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onClose()">
        <mat-icon>close</mat-icon>
        Đóng
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 mat-dialog-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .detail-container {
      padding: 16px 0;
    }
    .detail-section {
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #1976d2;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e0e0e0;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .detail-label {
      font-weight: 500;
      color: #666;
      font-size: 14px;
    }
    .detail-value {
      font-size: 15px;
      color: #333;
      word-break: break-word;
    }
    .approval-info {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .approval-info-two-cols {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px 24px;
    }
    .approval-col {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 0;
    }
    .approval-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .approval-label {
      font-weight: 500;
      color: #666;
      font-size: 14px;
    }
    .approval-date {
      font-size: 12px;
      color: #999;
      margin-left: 8px;
    }
    .approval-notes {
      font-size: 14px;
      color: #333;
      font-style: italic;
    }
    .notes-content {
      padding: 12px;
      background-color: #f5f5f5;
      border-radius: 4px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .responsible-accordion {
      display: block;
      margin-top: 8px;
    }
    .responsible-accordion mat-expansion-panel {
      margin-bottom: 8px;
    }
    .work-items-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .work-item-row {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      background: #f9f9f9;
      border-radius: 4px;
    }
    .work-item-row .wi-dates {
      display: flex;
      flex-wrap: wrap;
      gap: 12px 24px;
      font-size: 13px;
      color: #555;
    }
    .work-item-row .wi-date {
      white-space: nowrap;
    }
    .work-item-row .wi-files {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .work-item-row .wi-files-label {
      font-size: 13px;
      color: #666;
      font-weight: 500;
    }
    .work-item-row .wi-file-link button {
      padding: 0 4px;
      min-width: auto;
      line-height: 32px;
    }
    .work-item-row .wi-file-link mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      vertical-align: middle;
      margin-right: 4px;
    }
    .empty-hint {
      margin: 0;
      color: #999;
      font-style: italic;
      padding: 8px 0;
    }
    .status-approved {
      color: #4caf50;
      font-weight: bold;
    }
    .status-rejected {
      color: #f44336;
      font-weight: bold;
    }
    .status-pending {
      color: #ff9800;
      font-weight: bold;
    }
    mat-dialog-content {
      max-height: 70vh;
      overflow-y: auto;
    }
    mat-dialog-actions {
      padding: 16px 24px;
    }
    @media (max-width: 768px) {
      .detail-grid {
        grid-template-columns: 1fr;
      }
      .approval-info-two-cols {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class TBKTDetailDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<TBKTDetailDialogComponent>);
  private readonly fileService = inject(FileService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly filesByAssignmentMap = signal<Map<number, FileDocument[]>>(new Map());

  private readonly workTypeLabel: Record<string, string> = {
    'Casing Design': 'Thiết kế vỏ',
    'Casing Review': 'Kiểm soát vỏ',
    'Core Design': 'Thiết kế ruột',
    'Core Review': 'Kiểm soát ruột',
    'Material Leveling': 'Định mức vật tư'
  };

  constructor(@Inject(MAT_DIALOG_DATA) public data: { sheet: TechnicalSheet; assignments?: MachineAssignment[] }) {}

  ngOnInit(): void {
    const assignments = this.data.assignments ?? [];
    if (assignments.length === 0) return;
    forkJoin(
      assignments.map(a =>
        this.fileService.getFilesByAssignment(a.assignmentID).pipe(catchError(() => of([])))
      )
    ).subscribe(results => {
      const map = new Map<number, FileDocument[]>();
      assignments.forEach((a, i) => map.set(a.assignmentID, results[i] ?? []));
      this.filesByAssignmentMap.set(map);
      this.cdr.markForCheck();
    });
  }

  getCasingPanelTitle(): string {
    const design = this.getCasingWorkItems().find(wi => wi.workType === 'Casing Design');
    const name = design ? (design.fullName ?? design.personName ?? '').trim() : '';
    return name ? `Thiết kế vỏ - ${name}` : 'Thiết kế vỏ';
  }

  getCorePanelTitle(): string {
    const design = this.getCoreWorkItems().find(wi => wi.workType === 'Core Design');
    const name = design ? (design.fullName ?? design.personName ?? '').trim() : '';
    return name ? `Thiết kế ruột - ${name}` : 'Thiết kế ruột';
  }

  hasWorkItemData(wi: WorkItem): boolean {
    return !!(wi.startDate || wi.actualFinish || wi.expectedFinish || (this.getFilesForWorkItem(wi).length > 0));
  }

  getCasingWorkItems(): WorkItem[] {
    const ass = this.data.assignments ?? [];
    return ass.flatMap(a => (a.workItems ?? []).filter(wi => (wi.workType === 'Casing Design' || wi.workType === 'Casing Review')));
  }

  getCoreWorkItems(): WorkItem[] {
    const ass = this.data.assignments ?? [];
    return ass.flatMap(a => (a.workItems ?? []).filter(wi => (wi.workType === 'Core Design' || wi.workType === 'Core Review')));
  }

  getFilesForWorkItem(wi: WorkItem): FileDocument[] {
    const map = this.filesByAssignmentMap();
    const files = map.get(wi.assignmentID) ?? [];
    const ids = this.parseFileIds(wi.file_ID);
    if (ids.length === 0) return [];
    return files.filter(f => {
      const id = f.id ?? f.fileID;
      return id != null && ids.includes(Number(id));
    });
  }

  private parseFileIds(fileIds: string | undefined): number[] {
    if (!fileIds || !fileIds.trim()) return [];
    return fileIds.split(',')
      .map(id => id.trim())
      .filter(id => id !== '')
      .map(id => { const n = parseInt(id, 10); return isNaN(n) ? null : n; })
      .filter((n): n is number => n !== null);
  }

  downloadFile(file: FileDocument): void {
    const fileId = file.id ?? file.fileID;
    if (fileId == null) return;
    this.fileService.downloadFile(fileId).subscribe({
      next: (blob) => {
        if (blob.type === 'application/json' || blob.size < 100) {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const err = JSON.parse(reader.result as string);
              this.snackBar.open(err.message || err.error || 'Lỗi khi tải file', 'Đóng', {
                duration: 5000, horizontalPosition: 'center', verticalPosition: 'top', panelClass: ['error-snackbar']
              });
            } catch {
              this.snackBar.open('Lỗi khi tải file', 'Đóng', { duration: 3000, horizontalPosition: 'center', verticalPosition: 'top' });
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
        this.snackBar.open(err.error?.message || err.message || 'Lỗi khi tải file', 'Đóng', {
          duration: 5000, horizontalPosition: 'center', verticalPosition: 'top', panelClass: ['error-snackbar']
        });
      }
    });
  }

  getWorkTypeDisplayName(workType: string | undefined): string {
    if (!workType) return '';
    return this.workTypeLabel[workType] ?? workType;
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
    if (!status) return 'status-pending';
    switch (status.toLowerCase()) {
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      case 'pending': return 'status-pending';
      default: return 'status-pending';
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
