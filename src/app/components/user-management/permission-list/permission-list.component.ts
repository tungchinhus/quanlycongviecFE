import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PermissionsService, Permission } from '../../../services/permissions.service';
import { AuthService } from '../../../services/auth.service';
import { UserRole } from '../../../constants/enums';

@Component({
  selector: 'app-permission-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './permission-list.component.html',
  styleUrl: './permission-list.component.css'
})
export class PermissionListComponent implements OnInit {
  private readonly permissionsService = inject(PermissionsService);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly permissions = this.permissionsService.permissions;
  readonly isAdmin = this.authService.hasRole(UserRole.Administrator);
  readonly isLoading = signal<boolean>(false);

  displayedColumns: string[] = ['permissionName', 'description', 'actions'];

  ngOnInit() {
    this.loadPermissions();
  }

  loadPermissions(): void {
    this.isLoading.set(true);
    this.permissionsService.getPermissions().subscribe({
      next: () => {
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        console.error('Error loading permissions:', error);
        this.snackBar.open('Không thể tải danh sách permissions. Vui lòng thử lại.', 'Đóng', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  onCreatePermission(): void {
    // TODO: Mở dialog tạo permission mới
    this.snackBar.open('Tính năng tạo permission sẽ được thêm sau.', 'Đóng', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
  }

  onEditPermission(permission: Permission): void {
    // TODO: Mở dialog chỉnh sửa permission
    this.snackBar.open('Tính năng chỉnh sửa permission sẽ được thêm sau.', 'Đóng', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
  }

  onDeletePermission(permission: Permission): void {
    if (!this.isAdmin) {
      this.snackBar.open('Chỉ Administrator mới có thể xóa permission.', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa permission "${permission.permissionName}"?`)) {
      this.permissionsService.deletePermission(permission.permissionId).subscribe({
        next: () => {
          this.snackBar.open('Xóa permission thành công!', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          });
          this.loadPermissions();
        },
        error: (error) => {
          console.error('Error deleting permission:', error);
          let errorMsg = 'Xóa permission thất bại. Vui lòng thử lại.';
          if (error.error?.message) {
            errorMsg = error.error.message;
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
}

