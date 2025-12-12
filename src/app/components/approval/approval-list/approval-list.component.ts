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
import { AuthService } from '../../../services/auth.service';
import { UserRole } from '../../../constants/enums';

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
  isAdminOrManager: boolean = false;

  constructor(
    private approvalService: ApprovalService,
    private assignmentService: AssignmentService,
    private dialog: MatDialog,
    private authService: AuthService
  ) {
    // Kiểm tra nếu user là Admin hoặc Manager
    this.isAdminOrManager = this.authService.hasAnyRole([
      UserRole.Administrator, 
      'Administrator', 
      'Admin',
      UserRole.Manager,
      'Manager'
    ]);
  }

  ngOnInit() {
    this.loadApprovals();
  }

  loadApprovals() {
    this.approvalService.getAllApprovals().subscribe({
      next: (approvals) => {
        // Admin và Manager: hiển thị tất cả approvals
        if (this.isAdminOrManager) {
          this.approvals = approvals;
        } else {
          // User thường: chỉ hiển thị approvals của user đăng nhập
          const currentUser = this.authService.user();
          if (currentUser) {
            const userIdentifiers = [
              currentUser.id,
              currentUser.id?.toString(),
              currentUser.userId?.toString(),
              currentUser.userName,
              currentUser.name,
              currentUser.email
            ].filter(id => id);
            
            this.approvals = approvals.filter(approval => {
              const approverName = approval.approverName;
              if (!approverName) return false;
              
              return userIdentifiers.some(id => 
                id && approverName.toString().toLowerCase() === id.toString().toLowerCase()
              );
            });
          } else {
            this.approvals = [];
          }
        }
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
        // Filter assignments by logged-in user (same logic as assignment-list)
        let filteredAssignments = assignments;
        const currentUser = this.authService.user();
        
        // Admin và Manager: hiển thị tất cả assignments
        if (!this.isAdminOrManager && currentUser) {
          // User thường: chỉ hiển thị assignments có work items được gán cho user đăng nhập
          filteredAssignments = assignments.filter(assignment => {
            if (!assignment.workItems || assignment.workItems.length === 0) {
              return false;
            }
            // Kiểm tra xem có work item nào được gán cho user hiện tại không
            return assignment.workItems.some(item => {
              const personName = item.personName;
              if (!personName) return false;
              
              const userIdentifiers = [
                currentUser.id,
                currentUser.id?.toString(),
                currentUser.userId?.toString(),
                currentUser.userName,
                currentUser.name,
                currentUser.email
              ].filter(id => id);
              
              return userIdentifiers.some(id => 
                id && personName.toString().toLowerCase() === id.toString().toLowerCase()
              );
            });
          });
        }
        
        const dialogRef = this.dialog.open(ApprovalDialogComponent, {
          width: '500px',
          data: { assignments: filteredAssignments }
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

