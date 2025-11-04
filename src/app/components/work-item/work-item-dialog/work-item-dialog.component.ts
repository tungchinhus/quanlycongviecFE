import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { WorkItemService } from '../../../services/work-item.service';
import { MachineAssignment } from '../../../models/machine-assignment.model';

@Component({
  selector: 'app-work-item-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule
  ],
  templateUrl: './work-item-dialog.component.html',
  styleUrls: ['./work-item-dialog.component.css']
})
export class WorkItemDialogComponent {
  workItemForm: FormGroup;
  assignments: MachineAssignment[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<WorkItemDialogComponent>,
    private workItemService: WorkItemService,
    @Inject(MAT_DIALOG_DATA) public data: { assignments: MachineAssignment[] }
  ) {
    this.assignments = data.assignments || [];
    this.workItemForm = this.fb.group({
      assignmentID: ['', Validators.required],
      workType: ['', Validators.required],
      personName: ['', Validators.required],
      startDate: [null],
      expectedFinish: [null],
      actualFinish: [null],
      personConfirmation: [false],
      notes: ['']
    });
  }

  onSave() {
    if (this.workItemForm.valid) {
      this.workItemService.createWorkItem(this.workItemForm.value).subscribe({
        next: () => {
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error('Error creating work item:', err);
          alert('Lỗi khi tạo công việc');
        }
      });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}

