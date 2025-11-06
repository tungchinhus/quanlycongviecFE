import { Component, inject, signal, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RolesService, Role } from '../../../services/roles.service';
import { AuthService } from '../../../services/auth.service';
import { UserRole } from '../../../constants/enums';
import { RoleFormDialogComponent, RoleFormData } from '../role-form-dialog/role-form-dialog.component';

@Component({
  selector: 'app-role-list',
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
  templateUrl: './role-list.component.html',
  styleUrl: './role-list.component.css'
})
export class RoleListComponent implements OnInit {
  private readonly rolesService = inject(RolesService);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly roles = this.rolesService.roles;
  readonly isAdmin = this.authService.hasRole(UserRole.Administrator);
  readonly isLoading = signal<boolean>(false);

  displayedColumns: string[] = ['roleName', 'description', 'actions'];
  readonly onRoleSelected = output<Role>();

  ngOnInit() {
    this.loadRoles();
  }

  loadRoles(): void {
    this.isLoading.set(true);
    this.rolesService.getRoles().subscribe({
      next: (roles) => {
        this.isLoading.set(false);
        console.log('Roles loaded successfully, count:', roles.length);
        console.log('Current roles signal:', this.rolesService.roles());
      },
      error: (error) => {
        this.isLoading.set(false);
        console.error('Error loading roles:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });
        let errorMsg = 'Không thể tải danh sách roles. Vui lòng thử lại.';
        if (error.status === 401) {
          errorMsg = 'Không có quyền truy cập. Vui lòng đăng nhập lại.';
        } else if (error.status === 404) {
          errorMsg = 'API endpoint không tìm thấy. Vui lòng kiểm tra cấu hình.';
        } else if (error.error?.message) {
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

  onCreateRole(): void {
    const dialogRef = this.dialog.open(RoleFormDialogComponent, {
      width: '600px',
      disableClose: true,
      data: {
        mode: 'create'
      } as RoleFormData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'success') {
        this.loadRoles();
      }
    });
  }

  onEditRole(role: Role): void {
    const dialogRef = this.dialog.open(RoleFormDialogComponent, {
      width: '600px',
      disableClose: true,
      data: {
        mode: 'edit',
        role: role
      } as RoleFormData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'success') {
        this.loadRoles();
      }
    });
  }

  onDeleteRole(role: Role): void {
    if (!this.isAdmin) {
      this.snackBar.open('Chỉ Administrator mới có thể xóa role.', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa role "${role.roleName}"?`)) {
      this.rolesService.deleteRole(role.roleId).subscribe({
        next: () => {
          this.snackBar.open('Xóa role thành công!', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          });
          this.loadRoles();
        },
        error: (error) => {
          console.error('Error deleting role:', error);
          let errorMsg = 'Xóa role thất bại. Vui lòng thử lại.';
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

