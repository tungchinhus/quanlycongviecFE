import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AssignmentService } from '../../../services/assignment.service';
import { MachineAssignment } from '../../../models/machine-assignment.model';
import { AssignmentFormDialogComponent } from '../assignment-form-dialog/assignment-form-dialog.component';

@Component({
  selector: 'app-assignment-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatTooltipModule,
    MatBadgeModule,
    MatDialogModule
  ],
  templateUrl: './assignment-list.component.html',
  styleUrls: ['./assignment-list.component.css']
})
export class AssignmentListComponent implements OnInit {
  assignments: MachineAssignment[] = [];
  displayedColumns: string[] = ['machineName', 'designer', 'teamLeader', 'deliveryDate', 'workItems', 'approvals', 'actions'];

  constructor(
    private assignmentService: AssignmentService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadAssignments();
  }

  loadAssignments() {
    this.assignmentService.getAllAssignments().subscribe({
      next: (assignments) => {
        this.assignments = assignments;
      },
      error: (err) => {
        console.error('Error loading assignments:', err);
        this.assignments = [];
      }
    });
  }

  openAssignmentDialog() {
    const dialogRef = this.dialog.open(AssignmentFormDialogComponent, {
      width: '900px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadAssignments();
      }
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

