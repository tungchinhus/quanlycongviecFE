import { Component, Inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { WorkItemWithAssignment } from '../../../models/machine-assignment.model';
import { WorkItemService } from '../../../services/work-item.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-work-item-reject-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './work-item-reject-dialog.component.html',
  styleUrls: ['./work-item-reject-dialog.component.css']
})
export class WorkItemRejectDialogComponent {
  rejectForm: FormGroup;
  isRejecting = signal<boolean>(false);

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<WorkItemRejectDialogComponent>,
    private workItemService: WorkItemService,
    private notificationService: NotificationService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { 
      workItem: WorkItemWithAssignment;
    }
  ) {
    this.rejectForm = this.fb.group({
      notes: ['', [Validators.required, Validators.maxLength(500)]]
    });
  }

  onReject() {
    if (this.rejectForm.invalid) {
      this.rejectForm.markAllAsTouched();
      return;
    }

    if (!this.data.workItem.workItemID) {
      this.snackBar.open('Không tìm thấy công việc cần từ chối', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.isRejecting.set(true);
    
    const updateData = {
      personConfirmation: false,
      notes: this.rejectForm.value.notes
    };

    this.workItemService.updateWorkItem(this.data.workItem.workItemID, updateData).subscribe({
      next: () => {
        this.isRejecting.set(false);
        this.snackBar.open('Từ chối công việc thành công!', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
        // Reload unread count as fallback if SignalR is not connected
        setTimeout(() => {
          this.notificationService.getUnreadCount().subscribe({
            next: () => {
              // Unread count reloaded
            },
            error: () => {
              // Error reloading unread count - silently fail
            }
          });
        }, 500);
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.isRejecting.set(false);
        console.error('Error rejecting work item:', err);
        let errorMessage = 'Lỗi khi từ chối công việc';
        
        if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.error?.error) {
          errorMessage = err.error.error;
        }
        
        this.snackBar.open(errorMessage, 'Đóng', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  onClose() {
    this.dialogRef.close();
  }
}

