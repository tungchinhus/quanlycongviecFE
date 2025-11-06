import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '../../constants/enums';
import { RoleListComponent } from '../../components/user-management/role-list/role-list.component';
import { PermissionListComponent } from '../../components/user-management/permission-list/permission-list.component';
import { RolePermissionAssignmentComponent } from '../../components/user-management/role-permission-assignment/role-permission-assignment.component';
import { RolesService, Role } from '../../services/roles.service';

@Component({
  selector: 'app-roles-page',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    RoleListComponent,
    PermissionListComponent,
    RolePermissionAssignmentComponent
  ],
  templateUrl: './roles.page.html',
  styleUrl: './roles.page.css'
})
export class RolesPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly rolesService = inject(RolesService);
  private readonly snackBar = inject(MatSnackBar);

  readonly isAdmin = computed(() => this.authService.hasRole(UserRole.Administrator));
  readonly selectedRole = signal<Role | null>(null);

  ngOnInit() {
    // Roles are loaded by RoleListComponent, no need to load here
  }

  onRoleSelectedFromList(role: Role): void {
    this.selectedRole.set(role);
  }

  onRoleBack(): void {
    this.selectedRole.set(null);
  }

  onPermissionUpdated(): void {
    // Reload hoặc update UI nếu cần
  }
}

