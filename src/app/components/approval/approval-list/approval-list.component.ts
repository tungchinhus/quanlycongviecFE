import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ApprovalService } from '../../../services/approval.service';
import { AssignmentApproval } from '../../../models/machine-assignment.model';
import { ApprovalDialogComponent } from '../approval-dialog/approval-dialog.component';
import { AssignmentService } from '../../../services/assignment.service';

@Component({
  selector: 'app-approval-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule
  ],
  templateUrl: './approval-list.component.html',
  styleUrls: ['./approval-list.component.css']
})
export class ApprovalListComponent implements OnInit {
  approvals: AssignmentApproval[] = [];
  displayedColumns: string[] = ['assignmentID', 'approverRole', 'approverName', 'approvalDate', 'notes', 'actions'];

  constructor(
    private approvalService: ApprovalService,
    private assignmentService: AssignmentService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadApprovals();
  }

  loadApprovals() {
    this.approvalService.getAllApprovals().subscribe({
      next: (approvals) => {
        this.approvals = approvals;
      },
      error: (err) => {
        console.error('Error loading approvals:', err);
        this.approvals = [];
      }
    });
  }

  openApprovalDialog() {
    // Get available assignments for selection
    this.assignmentService.getAllAssignments().subscribe({
      next: (assignments) => {
        const dialogRef = this.dialog.open(ApprovalDialogComponent, {
          width: '500px',
          data: { assignments }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            this.loadApprovals();
          }
        });
      },
      error: (err) => {
        console.error('Error loading assignments:', err);
        const dialogRef = this.dialog.open(ApprovalDialogComponent, {
          width: '500px',
          data: { assignments: [] }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            this.loadApprovals();
          }
        });
      }
    });
  }

  deleteApproval(approval: AssignmentApproval) {
    if (confirm('Bạn có chắc muốn xóa ký duyệt này?')) {
      this.approvalService.deleteApproval(approval.approvalID).subscribe({
        next: () => this.loadApprovals(),
        error: (err) => console.error('Error deleting approval:', err)
      });
    }
  }
}

