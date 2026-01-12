import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '../../constants/enums';

@Component({
  selector: 'app-dashboard-redirect',
  standalone: true,
  template: '<div></div>' // Empty template vì component này chỉ để redirect
})
export class DashboardRedirectComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    // Kiểm tra nếu user chưa authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    // Kiểm tra nếu user là Manager, ManagerL1, hoặc Administrator
    const isManager = this.authService.hasAnyRole([
      UserRole.Manager,
      'Manager',
      'ManagerL1',
      'ManagerL2',
      'ManagerL3',
      UserRole.Administrator,
      'Administrator',
      'Admin'
    ]);

    // Redirect đến manager dashboard nếu là manager, ngược lại đến dashboard thường
    if (isManager) {
      this.router.navigate(['/manager-dashboard']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}
