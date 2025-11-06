import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UsersService, CreateUserRequest } from '../../../services/users.service';
import { AuthService, UserRole } from '../../../services/auth.service';
import { ALL_USER_ROLES } from '../../../constants/enums';

export interface UserFormData {
  user?: any;
  mode: 'create' | 'edit';
}

@Component({
  selector: 'app-user-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './user-form-dialog.component.html',
  styleUrl: './user-form-dialog.component.css'
})
export class UserFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<UserFormDialogComponent>);
  private readonly data = inject<UserFormData>(MAT_DIALOG_DATA);
  private readonly usersService = inject(UsersService);
  private readonly snackBar = inject(MatSnackBar);

  readonly userForm: FormGroup;
  readonly mode: 'create' | 'edit';
  readonly allRoles: UserRole[] = ALL_USER_ROLES;
  isSubmitting = false;

  constructor() {
    this.mode = this.data.mode;
    const user = this.data.user;

    this.userForm = this.fb.group({
      userName: [user?.userName || '', this.mode === 'create' ? [Validators.required] : []],
      name: [user?.name || '', [Validators.required]],
      email: [user?.email || '', [Validators.required, Validators.email]],
      password: ['', this.mode === 'create' ? [Validators.required, Validators.minLength(6)] : []],
      roles: [user?.roles || ['User'], [Validators.required]]
    });

    if (this.mode === 'edit') {
      this.userForm.get('password')?.setValidators([Validators.minLength(6)]);
      this.userForm.get('email')?.disable();
      this.userForm.get('userName')?.disable();
    }
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      Object.keys(this.userForm.controls).forEach(key => {
        this.userForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    const formValue = this.userForm.getRawValue();

    if (this.mode === 'create') {
      // Gửi roles trực tiếp (array of strings), không cần map sang roleIds
      const userData: CreateUserRequest = {
        userName: formValue.userName,
        email: formValue.email,
        password: formValue.password,
        fullName: formValue.name,
        roles: formValue.roles // Array of role names (strings)
      };

      this.usersService.createUser(userData).subscribe({
        next: (createdUser) => {
          this.isSubmitting = false;
          console.log('User created successfully:', createdUser);
          this.snackBar.open('Tạo người dùng thành công!', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          });
          this.dialogRef.close('success');
        },
        error: (error) => {
          this.isSubmitting = false;
          console.error('Error creating user:', error);
          
          let errorMsg = 'Tạo người dùng thất bại. Vui lòng thử lại.';
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
      // Edit mode - update user
      const originalRoles = this.data.user?.roles || [];
      const newRoles = formValue.roles;
      const rolesChanged = JSON.stringify(originalRoles.sort()) !== JSON.stringify(newRoles.sort());

      // Update user info (without roles first)
      const updateData: any = {
        name: formValue.name,
        fullName: formValue.name
      };

      // Update user info first
      this.usersService.updateUser(this.data.user.id, updateData).subscribe({
        next: () => {
          // If roles changed, update roles separately (which also sets custom claims)
          if (rolesChanged) {
            this.usersService.updateUserRoles(this.data.user.id, newRoles).subscribe({
              next: (updatedUser) => {
                // Set custom claims on Firebase
                this.usersService.setCustomClaims(this.data.user.firebaseUid, { roles: newRoles }).subscribe({
                  next: () => {
                    this.isSubmitting = false;
                    this.snackBar.open('Cập nhật người dùng và quyền thành công!', 'Đóng', {
                      duration: 3000,
                      horizontalPosition: 'center',
                      verticalPosition: 'top'
                    });
                    this.dialogRef.close('success');
                  },
                  error: (error) => {
                    console.error('Error setting custom claims:', error);
                    this.isSubmitting = false;
                    this.snackBar.open('Cập nhật người dùng thành công nhưng không thể cập nhật Firebase claims. Vui lòng refresh trang.', 'Đóng', {
                      duration: 5000,
                      horizontalPosition: 'center',
                      verticalPosition: 'top'
                    });
                    this.dialogRef.close('success');
                  }
                });
              },
              error: (error) => {
                this.isSubmitting = false;
                console.error('Error updating roles:', error);
                
                let errorMsg = 'Cập nhật quyền thất bại. Vui lòng thử lại.';
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
            // No role changes, just update user info
            this.isSubmitting = false;
            this.snackBar.open('Cập nhật người dùng thành công!', 'Đóng', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'top'
            });
            this.dialogRef.close('success');
          }
        },
        error: (error) => {
          this.isSubmitting = false;
          console.error('Error updating user:', error);
          
          let errorMsg = 'Cập nhật người dùng thất bại. Vui lòng thử lại.';
          if (error.error?.message) {
            errorMsg = error.error.message;
          } else if (error.message) {
            errorMsg = error.message;
          }
          
          // Check if it's 401 unauthorized
          if (error.status === 401) {
            errorMsg = 'Không có quyền cập nhật người dùng. Vui lòng đăng nhập lại.';
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

  getErrorMessage(fieldName: string): string {
    const control = this.userForm.get(fieldName);
    if (control?.hasError('required')) {
      return `${this.getFieldLabel(fieldName)} là bắt buộc`;
    }
    if (control?.hasError('email')) {
      return 'Email không hợp lệ';
    }
    if (control?.hasError('minlength')) {
      return 'Mật khẩu phải có ít nhất 6 ký tự';
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'userName': 'Tên đăng nhập',
      'name': 'Họ tên',
      'email': 'Email',
      'password': 'Mật khẩu',
      'roles': 'Quyền'
    };
    return labels[fieldName] || fieldName;
  }
}

