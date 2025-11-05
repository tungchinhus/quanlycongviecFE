import { Component, computed, inject, input, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UsersService } from '../../../services/users.service';
import { AuthService, AuthUser } from '../../../services/auth.service';
import { UserFormDialogComponent } from '../user-form-dialog/user-form-dialog.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css'
})
export class UserListComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly users = input.required<AuthUser[]>();
  readonly isLoading = input<boolean>(false);
  readonly isAdmin = input<boolean>(false);
  readonly onUserDeleted = output<string>();
  readonly onUsersReload = output<void>();
  readonly onUserSelected = output<AuthUser>();

  displayedColumns: string[] = ['name', 'email', 'roles', 'status', 'actions'];
  currentUserId = computed(() => this.authService.user()?.id || '');
  syncingUsers = new Set<string>(); // Track users being synced

  ngOnInit() {
    // Component initialization
  }

  getRoleColor(role: string): string {
    const colors: { [key: string]: string } = {
      'Administrator': 'primary',
      'Manager': 'accent',
      'User': '',
      'Guest': 'warn'
    };
    return colors[role] || '';
  }

  onDelete(userId: string, userName: string): void {
    if (!this.isAdmin()) {
      this.snackBar.open('Chỉ Administrator mới có thể xóa người dùng.', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    const currentUser = this.authService.user();
    if (currentUser && currentUser.id === userId) {
      this.snackBar.open('Bạn không thể xóa chính mình.', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa người dùng "${userName}"?`)) {
      this.usersService.deleteUser(userId).subscribe({
        next: () => {
          this.snackBar.open('Xóa người dùng thành công!', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          });
          this.onUserDeleted.emit(userId);
          this.onUsersReload.emit();
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

  onEdit(user: AuthUser): void {
    if (!this.isAdmin()) {
      this.snackBar.open('Chỉ Administrator mới có thể chỉnh sửa người dùng.', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    const dialogRef = this.dialog.open(UserFormDialogComponent, {
      width: '600px',
      data: { user, mode: 'edit' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'success') {
        this.onUsersReload.emit();
      }
    });
  }

  onSyncRoles(user: AuthUser): void {
    if (!this.isAdmin()) {
      this.snackBar.open('Chỉ Administrator mới có thể đồng bộ roles.', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    if (!user.firebaseUid) {
      this.snackBar.open('User không có Firebase UID. Không thể đồng bộ.', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Mark user as syncing
    this.syncingUsers.add(user.id);

    this.usersService.syncUserRolesFromFirebase(user.firebaseUid).subscribe({
      next: (updatedUser) => {
        this.syncingUsers.delete(user.id);
        this.snackBar.open(`Đã đồng bộ roles từ Firebase cho "${user.name}" thành công!`, 'Đóng', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
        // Reload users list to show updated roles
        this.onUsersReload.emit();
      },
      error: (error) => {
        this.syncingUsers.delete(user.id);
        console.error('Error syncing user roles:', error);
        const errorMessage = error?.error?.message || error?.message || 'Không thể đồng bộ roles từ Firebase.';
        this.snackBar.open(errorMessage, 'Đóng', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  isSyncing(userId: string): boolean {
    return this.syncingUsers.has(userId);
  }
}

