import { Component, computed, inject, signal, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { MatTabGroup } from '@angular/material/tabs';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { UsersService } from '../../services/users.service';
import { AuthService, AuthUser } from '../../services/auth.service';
import { UserListComponent } from '../../components/user-management/user-list/user-list.component';
import { RoleManagementComponent } from '../../components/user-management/role-management/role-management.component';
import { UserFormDialogComponent } from '../../components/user-management/user-form-dialog/user-form-dialog.component';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTooltipModule,
    MatSnackBarModule,
    UserListComponent,
    RoleManagementComponent
  ],
  templateUrl: './users.page.html',
  styleUrl: './users.page.css'
})
export class UsersPage implements OnInit, AfterViewInit {
  private readonly usersService = inject(UsersService);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);

  readonly users = this.usersService.users;
  readonly currentUser = this.authService.user();
  readonly isAdmin = computed(() => this.authService.hasRole('Administrator'));
  
  @ViewChild('tabGroup') tabGroup!: MatTabGroup;
  
  readonly selectedUser = signal<AuthUser | null>(null);
  readonly isLoading = signal<boolean>(false);

  ngOnInit() {
    this.loadUsers();
  }

  ngAfterViewInit() {
    // Đọc query parameter để mở tab tương ứng
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (this.tabGroup) {
        if (tab === 'roles') {
          // Mở tab quản lý roles (index 1)
          setTimeout(() => {
            this.tabGroup.selectedIndex = 1;
          }, 0);
        } else {
          // Mặc định mở tab danh sách users (index 0)
          setTimeout(() => {
            this.tabGroup.selectedIndex = 0;
          }, 0);
        }
      }
    });
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.usersService.loadUsers().subscribe({
      next: (users) => {
        this.isLoading.set(false);
        console.log('Loaded users from DB:', users.length, users);
      },
      error: (error) => {
        this.isLoading.set(false);
        console.error('Error loading users:', error);
        this.snackBar.open('Không thể tải danh sách người dùng. Vui lòng thử lại.', 'Đóng', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  onUserSelected(user: AuthUser): void {
    this.selectedUser.set(user);
    // Switch to role management tab
    if (this.tabGroup) {
      this.tabGroup.selectedIndex = 1;
    }
  }

  onUserDeleted(userId: string): void {
    // Clear selected user if it was deleted
    if (this.selectedUser()?.id === userId) {
      this.selectedUser.set(null);
    }
  }

  onUsersReload(): void {
    this.loadUsers();
  }

  onRoleUpdated(): void {
    this.loadUsers();
  }

  onCreateUser(): void {
    if (!this.isAdmin()) {
      this.snackBar.open('Chỉ Administrator mới có thể tạo người dùng mới.', 'Đóng', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
      return;
    }

    const dialogRef = this.dialog.open(UserFormDialogComponent, {
      width: '600px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'success') {
        // Thêm delay và retry để đảm bảo backend có thời gian sync vào DB
        this.loadUsersWithRetry(3, 500);
      }
    });
  }

  /**
   * Load users với retry logic để đảm bảo user mới tạo đã được sync vào DB
   */
  private loadUsersWithRetry(maxRetries: number = 3, delayMs: number = 500): void {
    let retryCount = 0;
    
    const attemptLoad = () => {
      this.isLoading.set(true);
      this.usersService.loadUsers().subscribe({
        next: (users) => {
          this.isLoading.set(false);
          console.log(`Load users attempt ${retryCount + 1}: Found ${users.length} users`);
          
          // Chỉ log thông tin, không warning nếu retry thành công
          if (retryCount > 0) {
            console.log('Users loaded successfully after retry');
          }
        },
        error: (error) => {
          this.isLoading.set(false);
          retryCount++;
          
          if (retryCount < maxRetries) {
            console.log(`Retry loading users (attempt ${retryCount + 1}/${maxRetries})...`);
            setTimeout(attemptLoad, delayMs * retryCount); // Exponential backoff
          } else {
            console.error('Error loading users after retries:', error);
            this.snackBar.open('Không thể tải danh sách người dùng. Vui lòng refresh trang.', 'Đóng', {
              duration: 5000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
              panelClass: ['error-snackbar']
            });
          }
        }
      });
    };
    
    // Bắt đầu với delay nhỏ để backend có thời gian sync
    setTimeout(attemptLoad, delayMs);
  }
}
