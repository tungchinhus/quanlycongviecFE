import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet, RouterModule, Router, NavigationEnd } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { SidenavService } from './services/sidenav.service';
import { AuthService } from './services/auth.service';
import { ChangePasswordDialogComponent } from './components/change-password-dialog/change-password-dialog.component';
import { UserRole } from './constants/enums';
import { filter } from 'rxjs/operators';

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
    MatDialogModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  public sidenavService = inject(SidenavService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private dialog = inject(MatDialog);
  
  isLoginPage = false;

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
    // Roles đã được normalize trong AuthService ("Admin" -> "Administrator")
    return user.roles.includes(UserRole.Administrator);
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
}

