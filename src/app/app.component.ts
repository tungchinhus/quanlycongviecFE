import { Component, inject, ChangeDetectorRef, OnInit, OnDestroy, signal, effect } from '@angular/core';
import { RouterOutlet, RouterModule, Router, NavigationEnd } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { SidenavService } from './services/sidenav.service';
import { AuthService } from './services/auth.service';
import { NotificationService, Notification } from './services/notification.service';
import { SettingsService } from './services/settings.service';
import { SignalRService } from './services/signalr.service';
import { PagePermissionService, UserPagePermission } from './services/page-permission.service';
import { ChangePasswordDialogComponent } from './components/change-password-dialog/change-password-dialog.component';
import { UserRole } from './constants/enums';
import { filter, Subscription, interval } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterModule,
    MatToolbarModule,
    MatSidenavModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule,
    MatDialogModule,
    MatBadgeModule,
    MatListModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  public sidenavService = inject(SidenavService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private dialog = inject(MatDialog);
  private notificationService = inject(NotificationService);
  private settingsService = inject(SettingsService);
  private signalRService = inject(SignalRService);
  private pagePermissionService = inject(PagePermissionService);
  
  isLoginPage = false;
  currentYear = new Date().getFullYear();
  readonly unreadNotificationCount = signal<number>(0);
  readonly showNotificationBadge = signal<boolean>(false);
  readonly notifications = signal<Notification[]>([]);
  readonly isLoadingNotifications = signal<boolean>(false);
  private notificationSubscription?: Subscription;
  
  // Page permissions cache
  private userPagePermissions = signal<UserPagePermission[]>([]);
  private permissionsLoaded = signal<boolean>(false);
  
  // Mapping từ router path sang page route trong database
  private readonly routeToPageRouteMap: { [key: string]: string } = {
    '/dashboard': '/dashboard',
    '/manager-dashboard': '/dashboard',
    '/files': '/files',
    '/assignments': '/assignments',
    '/approvals': '/approvals',
    '/work-items': '/work-items',
    '/excel-reader': '/excel-reader',
    '/tbkt-management': '/tbkt-list',
    '/users': '/users',
    '/roles': '/roles',
    '/page-permissions': '/page-permissions',
    '/settings': '/settings'
  };

  // Check if user is Admin or Manager
  get isAdminOrManager(): boolean {
    return this.authService.hasAnyRole([
      UserRole.Administrator,
      'Administrator',
      'Admin',
      UserRole.Manager,
      'Manager'
    ]);
  }

  constructor() {
    // Lắng nghe thay đổi route để kiểm tra xem có đang ở trang login không
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.isLoginPage = event.url === '/login' || event.urlAfterRedirects === '/login';
      this.cdr.detectChanges();
    });
    
    // Kiểm tra route ban đầu
    this.isLoginPage = this.router.url === '/login';

    // Lắng nghe thay đổi auth state để load notifications và permissions khi user login
    effect(() => {
      const user = this.authService.user();
      if (user && this.isAuthenticated) {
        // User đã authenticated, load notifications, permissions và start SignalR
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
          this.loadNotificationPreference();
          this.startSignalRConnection();
          this.loadUserPagePermissions();
        }, 100);
      } else {
        // User chưa authenticated, stop SignalR và clear permissions
        this.signalRService.stopConnection();
        if (this.notificationSubscription) {
          this.notificationSubscription.unsubscribe();
          this.notificationSubscription = undefined;
        }
        this.unreadNotificationCount.set(0);
        this.showNotificationBadge.set(false);
        this.userPagePermissions.set([]);
        this.permissionsLoaded.set(false);
        // Clear sync flag when user logs out
        const syncKey = 'notifications_synced';
        if (user) {
          sessionStorage.removeItem(`${syncKey}_${user.firebaseUid}`);
        }
      }
    });

    // Effect to track badge state changes
    effect(() => {
      const showBadge = this.showNotificationBadge();
      const count = this.unreadNotificationCount();
      const shouldShow = showBadge && count > 0;
      // Force change detection when badge state changes
      this.cdr.detectChanges();
    });
  }

  ngOnInit() {
    // Load notification preference and unread count if already authenticated
    if (this.isAuthenticated) {
      this.loadNotificationPreference();
      this.startSignalRConnection();
      this.loadUserPagePermissions();
    }
    
    // Listen for custom unreadCountChanged event (fallback when SignalR is not connected)
    window.addEventListener('unreadCountChanged', ((event: CustomEvent) => {
      if (event.detail?.count !== undefined) {
        this.unreadNotificationCount.set(event.detail.count);
        this.cdr.detectChanges();
      } else {
        this.loadUnreadCount();
      }
    }) as EventListener);
  }
  
  /**
   * Load page permissions của user hiện tại
   */
  loadUserPagePermissions(): void {
    if (!this.isAuthenticated || this.permissionsLoaded()) {
      return;
    }
    
    this.pagePermissionService.getMyPagePermissions().subscribe({
      next: (permissions) => {
        this.userPagePermissions.set(permissions);
        this.permissionsLoaded.set(true);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading user page permissions:', error);
        // Nếu lỗi, vẫn set loaded để tránh retry liên tục
        this.permissionsLoaded.set(true);
      }
    });
  }
  
  /**
   * Kiểm tra xem user có quyền xem một page route không
   * @param route Router path (ví dụ: '/dashboard', '/files')
   * @returns true nếu user có quyền xem, false nếu không
   */
  canViewPage(route: string): boolean {
    // Admin luôn có quyền xem tất cả
    if (this.hasAdminRole()) {
      return true;
    }
    
    // Nếu chưa load permissions, cho phép tạm thời (sẽ được update sau khi load xong)
    if (!this.permissionsLoaded()) {
      return true;
    }
    
    // Map router path sang page route trong database
    const pageRoute = this.routeToPageRouteMap[route] || route;
    
    // Tìm permission cho page route này
    const permission = this.userPagePermissions().find(
      p => p.pageRoute === pageRoute
    );
    
    // Nếu không có permission record, mặc định cho phép (backward compatibility)
    if (!permission) {
      return true;
    }
    
    // Kiểm tra canView
    return permission.canView;
  }

  ngOnDestroy() {
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
    }
    // Stop SignalR connection
    this.signalRService.stopConnection();
  }

  loadNotificationPreference() {
    this.settingsService.getNotificationPreference().subscribe({
      next: (pref) => {
        // Only show badge if email notifications are disabled
        this.showNotificationBadge.set(!pref.sendEmailNotifications);
        if (!pref.sendEmailNotifications) {
          // Sync notifications for existing work items (only once per session)
          this.syncNotificationsIfNeeded();
          this.loadUnreadCount();
        }
      },
      error: (error) => {
        console.error('Error loading notification preference:', error);
        // Default to showing badge if we can't load preference
        this.showNotificationBadge.set(true);
        this.syncNotificationsIfNeeded();
        this.loadUnreadCount();
      }
    });
  }

  syncNotificationsIfNeeded() {
    // Check if we've already synced in this session
    const syncKey = 'notifications_synced';
    const lastSync = sessionStorage.getItem(syncKey);
    const user = this.authService.user();
    
    if (!user) {
      return;
    }

    // Create a unique key per user
    const userSyncKey = `${syncKey}_${user.firebaseUid}`;
    const userLastSync = sessionStorage.getItem(userSyncKey);

    // Only sync once per user per session
    if (userLastSync) {
      return;
    }

    // Sync notifications in background (don't block UI)
    this.notificationService.syncMyNotifications().subscribe({
      next: (response) => {
        console.log('Notifications synced:', response);
        // Mark as synced for this user
        sessionStorage.setItem(userSyncKey, new Date().toISOString());
        // Reload unread count after sync
        this.loadUnreadCount();
      },
      error: (error) => {
        console.error('Error syncing notifications:', error);
        // Still mark as attempted to avoid repeated failures
        sessionStorage.setItem(userSyncKey, new Date().toISOString());
      }
    });
  }

  loadUnreadCount() {
    this.notificationService.getUnreadCount().subscribe({
      next: (response) => {
        this.unreadNotificationCount.set(response.count);
        // Force change detection
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading unread count:', error);
      }
    });
  }

  async startSignalRConnection(): Promise<void> {
    // Start SignalR connection
    await this.signalRService.startConnection();

    // Load initial unread count
    this.loadUnreadCount();

    // Listen for new notifications
    this.signalRService.onNotificationReceived((notification) => {
      console.log('New notification received:', notification);
      // Reload notifications if menu is open
      if (this.notifications().length > 0) {
        this.loadNotifications();
      }
      // Update unread count
      this.loadUnreadCount();
    });

    // Listen for notification removed (work item completed)
    this.signalRService.onNotificationRemoved((data) => {
      console.log('Notification removed:', data);
      // Remove from local list if exists
      const updatedNotifications = this.notifications().filter(
        n => !(n.relatedEntityType === 'WorkItem' && n.relatedEntityId === data.workItemId)
      );
      this.notifications.set(updatedNotifications);
      // Update unread count
      this.loadUnreadCount();
    });

    // Listen for unread count changes
    this.signalRService.onUnreadCountChanged(() => {
      console.log('Unread count changed');
      this.loadUnreadCount();
      // Reload notifications if menu is open
      if (this.notifications().length > 0) {
        this.loadNotifications();
      }
    });

    // Backup polling mỗi 30 giây để đảm bảo sync nếu SignalR fail
    this.startBackupPolling();
  }

  startBackupPolling() {
    // Stop existing polling if any
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
    }

    let previousCount = this.unreadNotificationCount();

    // Poll mỗi 10 giây để check unread count changes
    this.notificationSubscription = interval(10000)
      .pipe(
        startWith(0),
        switchMap(() => {
          if (this.showNotificationBadge() && this.isAuthenticated) {
            return this.notificationService.getUnreadCount();
          }
          return [];
        })
      )
      .subscribe({
        next: (response) => {
          if (response) {
            const newCount = response.count;
            // Nếu count thay đổi, reload notifications để sync với DB
            if (newCount !== previousCount) {
              previousCount = newCount;
              this.unreadNotificationCount.set(newCount);
              // Reload notifications để đảm bảo sync với DB (work items đã hoàn thành sẽ bị xóa)
              this.loadNotifications();
            } else {
              this.unreadNotificationCount.set(newCount);
            }
          }
        },
        error: (error) => {
          console.error('Error in backup polling:', error);
        }
      });
  }

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  get showLayout(): boolean {
    return !this.isLoginPage;
  }

  getCurrentUserInitials(): string {
    const user = this.authService.user();
    if (!user) return 'U';
    const name = user.name || user.email || '';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase() || 'U';
  }

  getCurrentUserName(): string {
    const user = this.authService.user();
    return user?.name || 'Người dùng';
  }

  getCurrentUserEmail(): string {
    const user = this.authService.user();
    return user?.email || '';
  }

  getCurrentUserRole(): string {
    const user = this.authService.user();
    if (!user || !user.roles || user.roles.length === 0) return 'User';
    return user.roles[0];
  }

  hasAdminRole(): boolean {
    const user = this.authService.user();
    if (!user || !user.roles || user.roles.length === 0) return false;
    // Kiểm tra role Administrator (có thể là string "Administrator" hoặc enum)
    return user.roles.includes(UserRole.Administrator) || user.roles.includes('Administrator') || user.roles.includes('Admin');
  }

  hasManagerRole(): boolean {
    return this.authService.hasAnyRole([UserRole.Manager, 'ManagerL1', 'ManagerL2', 'Manager']);
  }

  handleNavClick(event: Event): void {
    if (!this.hasAdminRole() && !this.hasManagerRole()) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  hasManagerL1OrAdminRole(): boolean {
    return this.authService.hasAnyRole(['ManagerL1', UserRole.Administrator, 'Administrator', 'Admin']);
  }

  /**
   * Kiểm tra nếu user là Manager hoặc ManagerL1
   * Dùng để quyết định hiển thị dashboard nào
   */
  isManagerOrManagerL1(): boolean {
    return this.authService.hasAnyRole([
      UserRole.Manager,
      'Manager',
      'ManagerL1',
      UserRole.Administrator,
      'Administrator',
      'Admin'
    ]);
  }

  logout(): void {
    // Đăng xuất từ Firebase và xóa session
    this.authService.logout().subscribe({
      next: () => {
        // Navigate về login
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Vẫn navigate về login ngay cả khi có lỗi
        this.router.navigate(['/login']);
      }
    });
  }

  openChangePasswordDialog(): void {
    const dialogRef = this.dialog.open(ChangePasswordDialogComponent, {
      width: '500px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Password changed successfully
        console.log('Password changed successfully');
      }
    });
  }

  onNotificationMenuOpened(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    if (!this.isAuthenticated) {
      return;
    }

    this.isLoadingNotifications.set(true);
    this.notificationService.getNotifications().subscribe({
      next: (notifications) => {
        this.notifications.set(notifications);
        this.isLoadingNotifications.set(false);
        // Update unread count - chỉ đếm work items chưa hoàn thành
        // Backend sẽ tự động filter, nhưng để chắc chắn ta cũng filter ở đây
        this.loadUnreadCount();
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
        this.isLoadingNotifications.set(false);
      }
    });
  }

  onNotificationClick(notification: Notification): void {
    // KHÔNG mark as read khi click - chỉ mark khi work item hoàn thành
    // Chỉ navigate đến trang tương ứng

    // Navigate based on related entity type
    if (notification.relatedEntityType === 'WorkItem' && notification.relatedEntityId) {
      // For WorkItem notifications, we need to get the AssignmentID from the WorkItem
      // For now, navigate to work items page - user can see their assigned work items
      // In the future, we could fetch the WorkItem to get AssignmentID and navigate to assignment detail
      this.router.navigate(['/work-items']);
    } else if (notification.relatedEntityType === 'File' && notification.relatedEntityId) {
      // Navigate to files page
      this.router.navigate(['/files'], { 
        queryParams: { fileId: notification.relatedEntityId } 
      });
    } else {
      // Default: navigate to work items page
      this.router.navigate(['/work-items']);
    }
  }

  markAllNotificationsAsRead(): void {
    // Bỏ chức năng này vì notifications chỉ được mark as read khi work item hoàn thành
    // this.notificationService.markAllAsRead().subscribe({
    //   next: () => {
    //     // Update local state
    //     const updatedNotifications = this.notifications().map(n => ({ ...n, isRead: true }));
    //     this.notifications.set(updatedNotifications);
    //     this.unreadNotificationCount.set(0);
    //   },
    //   error: (error) => {
    //     console.error('Error marking all notifications as read:', error);
    //   }
    // });
  }

  formatNotificationTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Vừa xong';
    } else if (diffMins < 60) {
      return `${diffMins} phút trước`;
    } else if (diffHours < 24) {
      return `${diffHours} giờ trước`;
    } else if (diffDays < 7) {
      return `${diffDays} ngày trước`;
    } else {
      // Format as DD/MM/YYYY
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      return `${('00' + day).slice(-2)}/${('00' + month).slice(-2)}/${year}`;
    }
  }

}

