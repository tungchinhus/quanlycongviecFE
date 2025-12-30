import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { ApprovalWorkflowService } from '../../../services/approval-workflow.service';
import { ApprovalWorkflow, ApprovalWorkflowStatus } from '../../../models/approval-workflow.model';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-approval-workflow-action-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTabsModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatSelectModule,
    MatStepperModule,
    MatProgressBarModule,
    MatIconModule
  ],
  templateUrl: './approval-workflow-action-dialog.component.html',
  styleUrls: ['./approval-workflow-action-dialog.component.css']
})
export class ApprovalWorkflowActionDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly workflowService = inject(ApprovalWorkflowService);
  private readonly authService = inject(AuthService);

  workflow: ApprovalWorkflow;
  actionForm: FormGroup;
  currentUser = this.authService.user();
  canPerformAction = false;
  userRole: 'controller' | 'approver' | null = null;
  selectedStepIndex: number = 0;

  constructor(
    public dialogRef: MatDialogRef<ApprovalWorkflowActionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { workflow: ApprovalWorkflow }
  ) {
    this.workflow = data.workflow;
    this.actionForm = this.fb.group({
      action: ['approve', Validators.required],
      notes: ['']
    });
  }

  ngOnInit() {
    this.checkPermissions();
    // Set selected step dựa trên trạng thái hiện tại
    this.selectedStepIndex = this.getCurrentStepIndex();
  }

  checkPermissions() {
    if (!this.currentUser) {
      this.canPerformAction = false;
      return;
    }

    const userFirebaseUID = this.currentUser.firebaseUid;
    const isAdminOrManager = this.authService.hasAnyRole(['Administrator', 'Admin', 'Manager']);

    if (isAdminOrManager) {
      // Admin/Manager có thể thực hiện hành động ở bất kỳ cấp nào
      if (this.workflow.overallStatus === ApprovalWorkflowStatus.PendingControl) {
        this.userRole = 'controller';
        this.canPerformAction = true;
      } else if (this.workflow.overallStatus === ApprovalWorkflowStatus.PendingApproval) {
        this.userRole = 'approver';
        this.canPerformAction = true;
      }
    } else {
      // User thường chỉ có thể thực hiện hành động nếu là controller hoặc approver
      if (this.workflow.overallStatus === ApprovalWorkflowStatus.PendingControl &&
          this.workflow.controllerFirebaseUID === userFirebaseUID) {
        this.userRole = 'controller';
        this.canPerformAction = true;
      } else if (this.workflow.overallStatus === ApprovalWorkflowStatus.PendingApproval &&
                 this.workflow.approverFirebaseUID === userFirebaseUID) {
        this.userRole = 'approver';
        this.canPerformAction = true;
      }
    }
  }

  onSubmit(): void {
    if (this.actionForm.valid && this.userRole) {
      const formValue = this.actionForm.value;
      this.workflowService.submitAction(
        this.workflow.workflowID,
        formValue.action,
        formValue.notes,
        this.userRole
      ).subscribe({
        next: (updatedWorkflow) => {
          this.dialogRef.close(updatedWorkflow);
        },
        error: (err) => {
          console.error('Error submitting action:', err);
          alert('Không thể thực hiện hành động. Vui lòng thử lại.');
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
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
      default:
        return '';
    }
  }

  // Xác định bước hiện tại dựa trên trạng thái
  getCurrentStepIndex(): number {
    if (this.workflow.overallStatus === ApprovalWorkflowStatus.Rejected) {
      // Nếu bị từ chối, xác định bước nào bị từ chối
      if (this.workflow.controlStatus === 'Rejected') {
        return 1; // Bị từ chối ở bước kiểm soát
      } else if (this.workflow.approvalStatus === 'Rejected') {
        return 2; // Bị từ chối ở bước xét duyệt
      }
    }
    
    if (this.workflow.overallStatus === ApprovalWorkflowStatus.Completed) {
      return 2; // Hoàn tất ở bước cuối
    }
    
    if (this.workflow.overallStatus === ApprovalWorkflowStatus.PendingApproval) {
      return 2; // Đang ở bước xét duyệt
    }
    
    if (this.workflow.overallStatus === ApprovalWorkflowStatus.PendingControl) {
      return 1; // Đang ở bước kiểm soát
    }
    
    return 0; // Mặc định ở bước gửi yêu cầu
  }

  // Kiểm tra bước đã hoàn thành
  isStepCompleted(stepIndex: number): boolean {
    const currentStep = this.getCurrentStepIndex();
    return stepIndex < currentStep || 
           (stepIndex === currentStep && this.workflow.overallStatus === ApprovalWorkflowStatus.Completed);
  }

  // Kiểm tra bước đang active
  isStepActive(stepIndex: number): boolean {
    return stepIndex === this.getCurrentStepIndex() && 
           this.workflow.overallStatus !== ApprovalWorkflowStatus.Completed &&
           this.workflow.overallStatus !== ApprovalWorkflowStatus.Rejected;
  }

  // Kiểm tra bước bị từ chối
  isStepRejected(stepIndex: number): boolean {
    if (this.workflow.overallStatus !== ApprovalWorkflowStatus.Rejected) {
      return false;
    }
    if (stepIndex === 1 && this.workflow.controlStatus === 'Rejected') {
      return true;
    }
    if (stepIndex === 2 && this.workflow.approvalStatus === 'Rejected') {
      return true;
    }
    return false;
  }

  // Chọn bước để xem thông tin
  selectStep(index: number) {
    this.selectedStepIndex = index;
  }

  // Helper methods cho control status
  getControlStatusLabel(): string {
    switch (this.workflow.controlStatus) {
      case 'Approved':
        return 'Đã phê duyệt';
      case 'Rejected':
        return 'Đã từ chối';
      case 'Pending':
        return 'Chờ xử lý';
      default:
        return this.workflow.controlStatus || 'Chờ xử lý';
    }
  }

  getControlStatusColor(): string {
    switch (this.workflow.controlStatus) {
      case 'Approved':
        return 'primary';
      case 'Rejected':
        return 'warn';
      case 'Pending':
        return 'accent';
      default:
        return '';
    }
  }

  // Helper methods cho approval status
  getApprovalStatusLabel(): string {
    switch (this.workflow.approvalStatus) {
      case 'Approved':
        return 'Đã phê duyệt';
      case 'Rejected':
        return 'Đã từ chối';
      case 'Pending':
        return 'Chờ xử lý';
      default:
        return this.workflow.approvalStatus || 'Chờ xử lý';
    }
  }

  getApprovalStatusColor(): string {
    switch (this.workflow.approvalStatus) {
      case 'Approved':
        return 'primary';
      case 'Rejected':
        return 'warn';
      case 'Pending':
        return 'accent';
      default:
        return '';
    }
  }
}

