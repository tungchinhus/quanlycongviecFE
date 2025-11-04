import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { WorkItemService } from '../../../services/work-item.service';
import { WorkItem } from '../../../models/machine-assignment.model';
import { WorkItemDialogComponent } from '../work-item-dialog/work-item-dialog.component';
import { AssignmentService } from '../../../services/assignment.service';

@Component({
  selector: 'app-work-item-list',
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
  templateUrl: './work-item-list.component.html',
  styleUrls: ['./work-item-list.component.css']
})
export class WorkItemListComponent implements OnInit {
  workItems: WorkItem[] = [];
  displayedColumns: string[] = ['workType', 'personName', 'startDate', 'expectedFinish', 'actualFinish', 'personConfirmation', 'actions'];

  constructor(
    private workItemService: WorkItemService,
    private assignmentService: AssignmentService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadWorkItems();
  }

  loadWorkItems() {
    this.workItemService.getAllWorkItems().subscribe({
      next: (items) => {
        this.workItems = items;
      },
      error: (err) => {
        console.error('Error loading work items:', err);
        this.workItems = [];
      }
    });
  }

  openWorkItemDialog() {
    this.assignmentService.getAllAssignments().subscribe({
      next: (assignments) => {
        const dialogRef = this.dialog.open(WorkItemDialogComponent, {
          width: '600px',
          data: { assignments }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            this.loadWorkItems();
          }
        });
      },
      error: (err) => {
        console.error('Error loading assignments:', err);
        const dialogRef = this.dialog.open(WorkItemDialogComponent, {
          width: '600px',
          data: { assignments: [] }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            this.loadWorkItems();
          }
        });
      }
    });
  }

  deleteWorkItem(item: WorkItem) {
    if (confirm('Bạn có chắc muốn xóa công việc này?')) {
      this.workItemService.deleteWorkItem(item.workItemID).subscribe({
        next: () => this.loadWorkItems(),
        error: (err) => console.error('Error deleting work item:', err)
      });
    }
  }
}

