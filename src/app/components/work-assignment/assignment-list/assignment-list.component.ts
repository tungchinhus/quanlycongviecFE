import { Component, OnInit } from '@angular/core';
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
import { AssignmentService } from '../../../services/assignment.service';
import { MachineAssignment } from '../../../models/machine-assignment.model';
import { AssignmentFormDialogComponent } from '../assignment-form-dialog/assignment-form-dialog.component';
import { AssignmentDetailDialogComponent } from '../assignment-detail-dialog/assignment-detail-dialog.component';
import { AuthService } from '../../../services/auth.service';
import { UserRole } from '../../../constants/enums';

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
    MatInputModule
  ],
  templateUrl: './assignment-list.component.html',
  styleUrls: ['./assignment-list.component.css']
})
export class AssignmentListComponent implements OnInit {
  assignments: MachineAssignment[] = [];
  filteredAssignments: MachineAssignment[] = [];
  searchTerm: string = '';
  displayedColumns: string[] = [];
  isUserRole: boolean = false;

  constructor(
    private assignmentService: AssignmentService,
    private dialog: MatDialog,
    private authService: AuthService
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
    if (this.isUserRole) {
      // Ẩn cột Công Việc và Ký Duyệt cho role User
      this.displayedColumns = ['machineName', 'deliveryDate', 'actions'];
    } else {
      this.displayedColumns = ['machineName', 'deliveryDate', 'workItems', 'approvals', 'actions'];
    }
  }

  onSearchChange() {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.filteredAssignments = this.assignments;
      return;
    }

    const searchLower = this.searchTerm.toLowerCase().trim();
    this.filteredAssignments = this.assignments.filter(assignment => {
      return assignment.machineName?.toLowerCase().includes(searchLower) ||
             assignment.standardRequirement?.toLowerCase().includes(searchLower) ||
             assignment.additionalRequest?.toLowerCase().includes(searchLower);
    });
  }

  loadAssignments() {
    this.assignmentService.getAllAssignments().subscribe({
      next: (assignments) => {
        this.assignments = assignments;
        this.filteredAssignments = assignments;
        // Apply search filter if exists
        if (this.searchTerm) {
          this.onSearchChange();
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

  deleteAssignment(assignment: MachineAssignment) {
    if (confirm(`Bạn có chắc muốn xóa gán công việc "${assignment.machineName}"?`)) {
      this.assignmentService.deleteAssignment(assignment.assignmentID).subscribe({
        next: () => this.loadAssignments(),
        error: (err) => console.error('Error deleting assignment:', err)
      });
    }
  }
}

