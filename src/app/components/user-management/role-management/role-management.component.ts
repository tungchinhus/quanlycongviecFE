import { Component, computed, inject, input, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UsersService } from '../../../services/users.service';
import { AuthService, AuthUser, UserRole } from '../../../services/auth.service';
import { RolesService } from '../../../services/roles.service';

@Component({
  selector: 'app-role-management',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './role-management.component.html',
  styleUrl: './role-management.component.css'
})
export class RoleManagementComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly authService = inject(AuthService);
  private readonly rolesService = inject(RolesService);
  private readonly snackBar = inject(MatSnackBar);

  readonly user = input.required<AuthUser>();
  readonly isAdmin = input<boolean>(false);
  readonly onRoleUpdated = output<void>();

  allRoles: string[] = []; // Dùng string[] để hỗ trợ tất cả roles từ DB
  isLoadingRoles = true;
  readonly currentUserId = computed(() => this.authService.user()?.id || '');

  isUpdating = false;

  ngOnInit(): void {
    // Load roles từ DB - trả về tất cả roles, không filter theo enum
    this.rolesService.getUserRoles().subscribe({
      next: (roles) => {
        this.allRoles = roles;
        this.isLoadingRoles = false;
        console.log('Loaded roles from DB:', roles);
      },
      error: (error) => {
        console.error('Error loading roles from DB:', error);
        // Fallback về roles mặc định nếu không load được từ DB
        this.allRoles = ['Administrator', 'Manager', 'User', 'Guest'];
        this.isLoadingRoles = false;
      }
    });
  }

  hasRole(role: string): boolean {
    // user().roles có type UserRole[] nhưng có thể chứa string values
    return this.user().roles.includes(role as any);
  }

  onToggleRole(role: string, checked: boolean): void {
    if (!this.isAdmin()) {
      this.snackBar.open('Chỉ Administrator mới có thể thay đổi quyền người dùng.', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    const user = this.user();
    const currentUser = this.authService.user();

    // Không cho phép xóa quyền Administrator của chính mình
    if (currentUser && currentUser.id === user.id && role === 'Administrator' && this.hasRole('Administrator') && !checked) {
      this.snackBar.open('Bạn không thể xóa quyền Administrator của chính mình.', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    const next = new Set<string>(user.roles as string[]);
    if (checked) {
      next.add(role);
    } else {
      next.delete(role);
    }
    const newRoles = Array.from(next);

    this.isUpdating = true;

    // Cập nhật roles trong DB và set custom claims trên Firebase
    this.usersService.updateUserRoles(user.id, newRoles).subscribe({
      next: (updatedUser) => {
        // Set custom claims trên Firebase
        this.usersService.setCustomClaims(user.firebaseUid, { roles: newRoles }).subscribe({
          next: () => {
            // Nếu đang cập nhật user hiện tại, refresh token để lấy claims mới
            if (currentUser && currentUser.firebaseUid === user.firebaseUid) {
              this.authService.refreshUserClaims().subscribe({
                error: (err) => {
                  console.warn('Failed to refresh user claims:', err);
                }
              });
            }

            this.snackBar.open('Cập nhật quyền thành công!', 'Đóng', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'top'
            });

            this.isUpdating = false;
            this.onRoleUpdated.emit();
          },
          error: (error) => {
            console.error('Error setting custom claims:', error);
            this.snackBar.open('Cập nhật quyền thành công nhưng không thể cập nhật Firebase claims. Vui lòng refresh trang.', 'Đóng', {
              duration: 5000,
              horizontalPosition: 'center',
              verticalPosition: 'top'
            });
            this.isUpdating = false;
          }
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
        this.isUpdating = false;
      }
    });
  }

  getRoleDescription(role: string): string {
    // Lấy description từ roles đã load từ DB
    const roleObj = this.rolesService.roles().find(r => r.roleName === role);
    if (roleObj && roleObj.description) {
      return roleObj.description;
    }
    
    // Fallback về descriptions mặc định
    const descriptions: { [key: string]: string } = {
      'Administrator': 'Quyền quản trị viên, có toàn quyền truy cập hệ thống',
      'Manager': 'Quyền quản lý, có thể quản lý các tài nguyên và người dùng',
      'User': 'Quyền người dùng thông thường, có quyền truy cập cơ bản',
      'Guest': 'Quyền khách, có quyền truy cập hạn chế'
    };
    return descriptions[role] || '';
  }

  getRoleIcon(role: string): string {
    const icons: { [key: string]: string } = {
      'Administrator': 'admin_panel_settings',
      'Manager': 'manage_accounts',
      'ManagerL1': 'supervisor_account',
      'ManagerL2': 'groups',
      'ManagerL3': 'group',
      'User': 'person',
      'Guest': 'person_outline'
    };
    return icons[role] || 'person';
  }
}

