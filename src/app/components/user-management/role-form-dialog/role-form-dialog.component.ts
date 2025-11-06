import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RolesService, Role, CreateRoleRequest, UpdateRoleRequest } from '../../../services/roles.service';

export interface RoleFormData {
  role?: Role;
  mode: 'create' | 'edit';
}

@Component({
  selector: 'app-role-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './role-form-dialog.component.html',
  styleUrl: './role-form-dialog.component.css'
})
export class RoleFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<RoleFormDialogComponent>);
  private readonly data = inject<RoleFormData>(MAT_DIALOG_DATA);
  private readonly rolesService = inject(RolesService);
  private readonly snackBar = inject(MatSnackBar);

  readonly roleForm: FormGroup;
  readonly mode: 'create' | 'edit';
  isSubmitting = false;

  constructor() {
    this.mode = this.data.mode;
    const role = this.data.role;

    this.roleForm = this.fb.group({
      roleName: [role?.roleName || '', [Validators.required, Validators.minLength(2)]],
      description: [role?.description || '']
    });

    if (this.mode === 'edit' && role) {
      // Khi edit, roleName có thể không được phép thay đổi (tùy backend)
      // Nếu cần, có thể disable roleName ở đây
    }
  }

  onSubmit(): void {
    if (this.roleForm.invalid) {
      Object.keys(this.roleForm.controls).forEach(key => {
        this.roleForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    const formValue = this.roleForm.value;

    if (this.mode === 'create') {
      const roleData: CreateRoleRequest = {
        roleName: formValue.roleName.trim(),
        description: formValue.description?.trim() || undefined
      };

      this.rolesService.createRole(roleData).subscribe({
        next: (createdRole) => {
          this.isSubmitting = false;
          console.log('Role created successfully:', createdRole);
          this.snackBar.open('Tạo role thành công!', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          });
          this.dialogRef.close('success');
        },
        error: (error) => {
          this.isSubmitting = false;
          console.error('Error creating role:', error);
          
          let errorMsg = 'Tạo role thất bại. Vui lòng thử lại.';
          if (error.error?.message) {
            errorMsg = error.error.message;
          } else if (error.message) {
            errorMsg = error.message;
          }
          
          this.snackBar.open(errorMsg, 'Đóng', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        }
      });
    } else {
      // Edit mode - update role
      if (!this.data.role) {
        this.snackBar.open('Không tìm thấy role cần chỉnh sửa.', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
        this.isSubmitting = false;
        return;
      }

      const roleData: UpdateRoleRequest = {
        roleName: formValue.roleName.trim(),
        description: formValue.description?.trim() || undefined
      };

      this.rolesService.updateRole(this.data.role.roleId, roleData).subscribe({
        next: (updatedRole) => {
          this.isSubmitting = false;
          console.log('Role updated successfully:', updatedRole);
          this.snackBar.open('Cập nhật role thành công!', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          });
          this.dialogRef.close('success');
        },
        error: (error) => {
          this.isSubmitting = false;
          console.error('Error updating role:', error);
          
          let errorMsg = 'Cập nhật role thất bại. Vui lòng thử lại.';
          if (error.error?.message) {
            errorMsg = error.error.message;
          } else if (error.message) {
            errorMsg = error.message;
          }
          
          this.snackBar.open(errorMsg, 'Đóng', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getErrorMessage(controlName: string): string {
    const control = this.roleForm.get(controlName);
    if (!control || !control.errors) {
      return '';
    }

    if (control.hasError('required')) {
      return `${this.getFieldLabel(controlName)} là bắt buộc`;
    }
    if (control.hasError('minlength')) {
      const minLength = control.errors['minlength'].requiredLength;
      return `${this.getFieldLabel(controlName)} phải có ít nhất ${minLength} ký tự`;
    }

    return 'Giá trị không hợp lệ';
  }

  private getFieldLabel(controlName: string): string {
    const labels: { [key: string]: string } = {
      roleName: 'Tên role',
      description: 'Mô tả'
    };
    return labels[controlName] || controlName;
  }
}

