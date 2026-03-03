import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { PagePermissionService, PagePermission, UserPagePermission, AssignPagePermissionsDto } from '../../services/page-permission.service';
import { UsersService } from '../../services/users.service';

interface User {
  userId: number;
  userName: string;
  fullName?: string;
}

@Component({
  selector: 'app-page-permissions',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule
  ],
  templateUrl: './page-permissions.page.html',
  styleUrls: ['./page-permissions.page.css']
})
export class PagePermissionsPage implements OnInit {
  private pagePermissionService = inject(PagePermissionService);
  private usersService = inject(UsersService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  pages = signal<PagePermission[]>([]);
  users = signal<User[]>([]);
  selectedUserId = signal<number | null>(null);
  userPermissions = signal<UserPagePermission[]>([]);
  isLoading = signal<boolean>(false);

  permissionForm: FormGroup;
  userIdControl!: FormControl<number | null>;

  displayedColumns: string[] = ['pageRoute', 'canView', 'canCreate', 'canEdit', 'canDelete'];

  constructor() {
    this.userIdControl = this.fb.control<number | null>(null, Validators.required);
    this.permissionForm = this.fb.group({
      userId: this.userIdControl
    });
  }

  ngOnInit(): void {
    this.loadPages();
    this.loadUsers();
  }

  loadPages(): void {
    this.isLoading.set(true);
    this.pagePermissionService.getPagePermissions().subscribe({
      next: (pages) => {
        this.pages.set(pages);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading pages:', error);
        this.snackBar.open('Lỗi khi tải danh sách pages', 'Đóng', { duration: 3000 });
        this.isLoading.set(false);
      }
    });
  }

  loadUsers(): void {
    this.usersService.loadUsers().subscribe({
      next: () => {
        const allUsers = this.usersService.users();
        this.users.set(allUsers
          .filter(u => u.userId !== undefined && u.userId !== null)
          .map(u => ({
            userId: u.userId!,
            userName: u.userName ?? '',
            fullName: u.name
          })));
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.snackBar.open('Lỗi khi tải danh sách users', 'Đóng', { duration: 3000 });
      }
    });
  }

  onUserSelected(userId: number): void {
    this.selectedUserId.set(userId);
    this.loadUserPermissions(userId);
  }

  loadUserPermissions(userId: number): void {
    this.isLoading.set(true);
    this.pagePermissionService.getUserPagePermissions(userId).subscribe({
      next: (permissions) => {
        this.userPermissions.set(permissions);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading user permissions:', error);
        this.snackBar.open('Lỗi khi tải permissions của user', 'Đóng', { duration: 3000 });
        this.isLoading.set(false);
      }
    });
  }

  getPermissionForPage(pageId: number): UserPagePermission | undefined {
    return this.userPermissions().find(p => p.pagePermissionId === pageId);
  }

  togglePermission(pageId: number, permissionType: 'canView' | 'canCreate' | 'canEdit' | 'canDelete'): void {
    const userId = this.selectedUserId();
    if (!userId) return;

    const existing = this.getPermissionForPage(pageId);
    const currentValue = existing ? existing[permissionType] : false;
    const newValue = !currentValue;

    if (existing) {
      // Update existing permission
      const updateDto = {
        canView: existing.canView,
        canCreate: existing.canCreate,
        canEdit: existing.canEdit,
        canDelete: existing.canDelete,
        [permissionType]: newValue
      };

      this.pagePermissionService.updateUserPagePermission(userId, pageId, updateDto).subscribe({
        next: (updated) => {
          const permissions = this.userPermissions().map(p =>
            p.id === updated.id ? updated : p
          );
          this.userPermissions.set(permissions);
          this.snackBar.open('Cập nhật permission thành công', 'Đóng', { duration: 2000 });
        },
        error: (error) => {
          console.error('Error updating permission:', error);
          this.snackBar.open('Lỗi khi cập nhật permission', 'Đóng', { duration: 3000 });
        }
      });
    } else {
      // Create new permission
      const createDto = {
        canView: permissionType === 'canView' ? newValue : false,
        canCreate: permissionType === 'canCreate' ? newValue : false,
        canEdit: permissionType === 'canEdit' ? newValue : false,
        canDelete: permissionType === 'canDelete' ? newValue : false
      };

      this.pagePermissionService.updateUserPagePermission(userId, pageId, createDto).subscribe({
        next: (created) => {
          this.userPermissions.set([...this.userPermissions(), created]);
          this.snackBar.open('Tạo permission thành công', 'Đóng', { duration: 2000 });
        },
        error: (error) => {
          console.error('Error creating permission:', error);
          this.snackBar.open('Lỗi khi tạo permission', 'Đóng', { duration: 3000 });
        }
      });
    }
  }

  saveAllPermissions(): void {
    const userId = this.selectedUserId();
    if (!userId) {
      this.snackBar.open('Vui lòng chọn user', 'Đóng', { duration: 2000 });
      return;
    }

    const permissions: AssignPagePermissionsDto = {
      userId: userId,
      permissions: this.pages().map(page => {
        const existing = this.getPermissionForPage(page.id);
        return {
          pagePermissionId: page.id,
          canView: existing?.canView ?? false,
          canCreate: existing?.canCreate ?? false,
          canEdit: existing?.canEdit ?? false,
          canDelete: existing?.canDelete ?? false
        };
      })
    };

    this.isLoading.set(true);
    this.pagePermissionService.assignPagePermissions(permissions).subscribe({
      next: () => {
        this.snackBar.open('Lưu permissions thành công', 'Đóng', { duration: 2000 });
        this.loadUserPermissions(userId);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error saving permissions:', error);
        this.snackBar.open('Lỗi khi lưu permissions', 'Đóng', { duration: 3000 });
        this.isLoading.set(false);
      }
    });
  }
}

