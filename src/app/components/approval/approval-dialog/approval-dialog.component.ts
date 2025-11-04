import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ApprovalService } from '../../../services/approval.service';
import { MachineAssignment } from '../../../models/machine-assignment.model';

@Component({
  selector: 'app-approval-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  templateUrl: './approval-dialog.component.html',
  styleUrls: ['./approval-dialog.component.css']
})
export class ApprovalDialogComponent {
  approvalForm: FormGroup;
  assignments: MachineAssignment[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ApprovalDialogComponent>,
    private approvalService: ApprovalService,
    @Inject(MAT_DIALOG_DATA) public data: { assignments: MachineAssignment[] }
  ) {
    this.assignments = data.assignments || [];
    this.approvalForm = this.fb.group({
      assignmentID: ['', Validators.required],
      approverRole: ['', Validators.required],
      approverName: ['', Validators.required],
      notes: ['']
    });
  }

  onApprove() {
    if (this.approvalForm.valid) {
      const formValue = this.approvalForm.value;
      this.approvalService.approve(
        formValue.assignmentID,
        formValue.approverRole,
        formValue.approverName,
        formValue.notes
      ).subscribe({
        next: () => {
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error('Error creating approval:', err);
          alert('Lỗi khi tạo ký duyệt');
        }
      });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}

