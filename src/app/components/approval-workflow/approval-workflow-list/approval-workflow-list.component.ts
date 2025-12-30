import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { ApprovalWorkflowService } from '../../../services/approval-workflow.service';
import { ApprovalWorkflow, ApprovalWorkflowStatus } from '../../../models/approval-workflow.model';
import { ApprovalWorkflowDialogComponent } from '../approval-workflow-dialog/approval-workflow-dialog.component';
import { ApprovalWorkflowActionDialogComponent } from '../approval-workflow-action-dialog/approval-workflow-action-dialog.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-approval-workflow-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule
  ],
  templateUrl: './approval-workflow-list.component.html',
  styleUrls: ['./approval-workflow-list.component.css']
})
export class ApprovalWorkflowListComponent implements OnInit {
  private readonly workflowService = inject(ApprovalWorkflowService);
  private readonly dialog = inject(MatDialog);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  workflows: ApprovalWorkflow[] = [];
  displayedColumns: string[] = [
    'workflowID',
    'requestTitle',
    'requestType',
    'requestReferenceID',
    'requesterName',
    'controllerName',
    'approverName',
    'overallStatus',
    'createdAt',
    'actions'
  ];
  
  selectedStatus: string = '';
  statusOptions = [
    { value: '', label: 'Tất cả' },
    { value: ApprovalWorkflowStatus.Draft, label: 'Nháp' },
    { value: ApprovalWorkflowStatus.PendingControl, label: 'Chờ kiểm soát' },
    { value: ApprovalWorkflowStatus.PendingApproval, label: 'Chờ xét duyệt' },
    { value: ApprovalWorkflowStatus.Completed, label: 'Hoàn tất' },
    { value: ApprovalWorkflowStatus.Approved, label: 'Đã phê duyệt' },
    { value: ApprovalWorkflowStatus.Rejected, label: 'Từ chối' }
  ];

  currentUser = this.authService.user();

  ngOnInit() {
    this.loadWorkflows();
    
    // Kiểm tra query parameter để tự động mở popup
    this.route.queryParams.subscribe(params => {
      const workflowId = params['workflowId'];
      if (workflowId) {
        // Đợi workflows load xong rồi mới mở popup
        setTimeout(() => {
          this.openWorkflowById(parseInt(workflowId));
          // Xóa query parameter sau khi mở popup
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {},
            replaceUrl: true
          });
        }, 500);
      }
    });
  }
  
  openWorkflowById(workflowId: number) {
    const workflow = this.workflows.find(w => w.workflowID === workflowId);
    if (workflow) {
      this.openActionDialog(workflow);
    } else {
      // Nếu chưa có trong list, load workflow từ API
      this.workflowService.getWorkflowById(workflowId).subscribe({
        next: (workflow) => {
          if (workflow) {
            this.openActionDialog(workflow);
          }
        },
        error: (err) => {
          console.error('Error loading workflow:', err);
          alert('Không tìm thấy quy trình ký duyệt với ID: ' + workflowId);
        }
      });
    }
  }

  loadWorkflows() {
    const status = this.selectedStatus || undefined;
    this.workflowService.getAllWorkflows(status).subscribe({
      next: (workflows) => {
        this.workflows = workflows;
      },
      error: (err) => {
        console.error('Error loading workflows:', err);
        this.workflows = [];
      }
    });
  }

  onStatusChange() {
    this.loadWorkflows();
  }

  openCreateDialog() {
    const dialogRef = this.dialog.open(ApprovalWorkflowDialogComponent, {
      width: '600px',
      data: null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadWorkflows();
      }
    });
  }

  openActionDialog(workflow: ApprovalWorkflow) {
    const dialogRef = this.dialog.open(ApprovalWorkflowActionDialogComponent, {
      width: '60%',
      maxWidth: '1200px',
      data: { workflow }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadWorkflows();
      }
    });
  }

  canPerformAction(workflow: ApprovalWorkflow): boolean {
    if (!this.currentUser) return false;
    
    const userFirebaseUID = this.currentUser.firebaseUid;
    const isAdminOrManager = this.authService.hasAnyRole(['Administrator', 'Admin', 'Manager']);
    
    if (isAdminOrManager) return true;

    // Kiểm tra xem user có phải là controller hoặc approver không
    if (workflow.overallStatus === ApprovalWorkflowStatus.PendingControl) {
      return workflow.controllerFirebaseUID === userFirebaseUID;
    }
    
    if (workflow.overallStatus === ApprovalWorkflowStatus.PendingApproval) {
      return workflow.approverFirebaseUID === userFirebaseUID;
    }

    return false;
  }

  getStatusColor(status?: string): string {
    switch (status) {
      case ApprovalWorkflowStatus.PendingControl:
        return 'accent';
      case ApprovalWorkflowStatus.PendingApproval:
        return 'primary';
      case ApprovalWorkflowStatus.Completed:
        return 'primary';
      case ApprovalWorkflowStatus.Rejected:
        return 'warn';
      case ApprovalWorkflowStatus.Draft:
        return '';
      default:
        return '';
    }
  }

  getStatusLabel(status?: string): string {
    switch (status) {
      case ApprovalWorkflowStatus.Draft:
        return 'Nháp';
      case ApprovalWorkflowStatus.PendingControl:
        return 'Chờ kiểm soát';
      case ApprovalWorkflowStatus.PendingApproval:
        return 'Chờ xét duyệt';
      case ApprovalWorkflowStatus.Completed:
        return 'Hoàn tất';
      case ApprovalWorkflowStatus.Rejected:
        return 'Từ chối';
      default:
        return status || '-';
    }
  }

  deleteWorkflow(workflow: ApprovalWorkflow) {
    if (confirm(`Bạn có chắc muốn xóa quy trình ký duyệt "${workflow.requestTitle}"?`)) {
      this.workflowService.deleteWorkflow(workflow.workflowID).subscribe({
        next: () => {
          this.loadWorkflows();
        },
        error: (err) => {
          console.error('Error deleting workflow:', err);
          alert('Không thể xóa quy trình ký duyệt. Có thể quy trình đã được xử lý.');
        }
      });
    }
  }

  // Kiểm tra xem string có phải là URL không
  isUrl(value: string | undefined | null): boolean {
    if (!value) return false;
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

