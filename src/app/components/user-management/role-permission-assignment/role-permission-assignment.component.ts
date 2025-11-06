import { Component, inject, signal, input, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RolesService, Role } from '../../../services/roles.service';
import { PermissionsService, Permission } from '../../../services/permissions.service';
import { AuthService } from '../../../services/auth.service';

/**
 * Component gán permissions cho role cụ thể
 * Component này dùng để assign permissions cho một role đã chọn
 */
@Component({
  selector: 'app-role-permission-assignment',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './role-permission-assignment.component.html',
  styleUrl: './role-permission-assignment.component.css'
})
export class RolePermissionAssignmentComponent implements OnInit {
  private readonly rolesService = inject(RolesService);
  private readonly permissionsService = inject(PermissionsService);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  readonly role = input.required<Role>();
  readonly isAdmin = input<boolean>(false);
  readonly onPermissionUpdated = output<void>();

  readonly permissions = this.permissionsService.permissions;
  readonly selectedPermissions = signal<Set<number>>(new Set());
  readonly isLoading = signal<boolean>(false);
  readonly isUpdating = signal<boolean>(false);

  ngOnInit() {
    this.loadPermissions();
    this.loadRolePermissions();
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
        this.snackBar.open('Không thể tải danh sách permissions.', 'Đóng', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  loadRolePermissions(): void {
    // TODO: Load permissions của role từ API
    // GET /api/roles/{roleId}/permissions
    // Hiện tại dùng mock data
    this.selectedPermissions.set(new Set());
  }

  hasPermission(permissionId: number): boolean {
    return this.selectedPermissions().has(permissionId);
  }

  onTogglePermission(permissionId: number, checked: boolean): void {
    if (!this.isAdmin()) {
      this.snackBar.open('Chỉ Administrator mới có thể thay đổi permissions của role.', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    const current = new Set(this.selectedPermissions());
    if (checked) {
      current.add(permissionId);
    } else {
      current.delete(permissionId);
    }
    this.selectedPermissions.set(current);
  }

  onSavePermissions(): void {
    if (!this.isAdmin()) {
      return;
    }

    const permissionIds = Array.from(this.selectedPermissions());
    this.isUpdating.set(true);

    // TODO: Gọi API để cập nhật permissions cho role
    // PUT /api/roles/{roleId}/permissions
    // Body: { permissionIds: [1, 2, 3] }

    // Mock implementation
    setTimeout(() => {
      this.isUpdating.set(false);
      this.snackBar.open('Cập nhật permissions thành công!', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top'
      });
      this.onPermissionUpdated.emit();
    }, 1000);
  }

  getPermissionDescription(permission: Permission): string {
    return permission.description || 'Không có mô tả';
  }
}

