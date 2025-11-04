import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsersService, CreateUserRequest } from '../../services/users.service';
import { UserRole } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule],
  templateUrl: './users.page.html',
  styleUrl: './users.page.css'
})
export class UsersPage {
  private readonly usersService = inject(UsersService);
  private readonly snackBar = inject(MatSnackBar);

  readonly users = this.usersService.users;
  readonly allRoles: UserRole[] = ['Administrator', 'Manager', 'User', 'Guest'];

  newName = '';
  newEmail = '';
  newPassword = '';
  newRole: UserRole = 'User';
  isCreating = false;
  errorMessage = '';

  onToggleRole(userId: string, role: UserRole, checked: boolean | undefined): void {
    const user = this.users().find(u => u.id === userId);
    if (!user) return;
    const next = new Set(user.roles);
    if (checked) next.add(role); else next.delete(role);
    
    this.usersService.updateUserRoles(userId, Array.from(next)).subscribe({
      next: () => {
        this.snackBar.open('Cập nhật quyền thành công!', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
      },
      error: (error) => {
        console.error('Error updating roles:', error);
        this.snackBar.open('Cập nhật quyền thất bại. Vui lòng thử lại.', 'Đóng', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  remove(userId: string): void {
    if (confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
      this.usersService.deleteUser(userId).subscribe({
        next: () => {
          this.snackBar.open('Xóa người dùng thành công!', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          });
        },
        error: (error) => {
          console.error('Error deleting user:', error);
          this.snackBar.open('Xóa người dùng thất bại. Vui lòng thử lại.', 'Đóng', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  add(): void {
    if (!this.newName || !this.newEmail || !this.newPassword) {
      this.errorMessage = 'Vui lòng điền đầy đủ thông tin.';
      return;
    }

    if (this.newPassword.length < 6) {
      this.errorMessage = 'Mật khẩu phải có ít nhất 6 ký tự.';
      return;
    }

    this.isCreating = true;
    this.errorMessage = '';

    const userData: CreateUserRequest = {
      name: this.newName,
      email: this.newEmail,
      password: this.newPassword,
      roles: [this.newRole]
    };

    // Tạo user: API sẽ tạo trên Firebase trước, sau đó tạo trong local DB
    this.usersService.createUser(userData).subscribe({
      next: () => {
        this.isCreating = false;
        this.snackBar.open('Tạo người dùng thành công!', 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
        // Reset form
        this.newName = '';
        this.newEmail = '';
        this.newPassword = '';
        this.newRole = 'User';
      },
      error: (error) => {
        this.isCreating = false;
        console.error('Error creating user:', error);
        
        let errorMsg = 'Tạo người dùng thất bại. Vui lòng thử lại.';
        if (error.error?.message) {
          errorMsg = error.error.message;
        } else if (error.message) {
          errorMsg = error.message;
        }
        
        this.errorMessage = errorMsg;
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


