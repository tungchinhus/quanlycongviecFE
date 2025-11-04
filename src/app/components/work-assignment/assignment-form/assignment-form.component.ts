import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { AssignmentService } from '../../../services/assignment.service';

@Component({
  selector: 'app-assignment-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './assignment-form.component.html',
  styleUrls: ['./assignment-form.component.css']
})
export class AssignmentFormComponent implements OnInit {
  assignmentForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private assignmentService: AssignmentService,
    private router: Router
  ) {
    this.assignmentForm = this.fb.group({
      machineName: ['', Validators.required],
      standardRequirement: [''],
      additionalRequest: [''],
      deliveryDate: [null],
      designer: [''],
      teamLeader: ['']
    });
  }

  ngOnInit() {}

  onSubmit() {
    if (this.assignmentForm.valid) {
      const formValue = this.assignmentForm.value;
      this.assignmentService.createAssignment(formValue).subscribe({
        next: (assignment) => {
          this.router.navigate(['/assignments', assignment.assignmentID]);
        },
        error: (err) => {
          console.error('Error creating assignment:', err);
          alert('Lỗi khi tạo gán công việc');
        }
      });
    }
  }

  onCancel() {
    this.router.navigate(['/assignments']);
  }
}

