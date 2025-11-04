import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { HasRoleDirective } from '../../directives/has-role.directive';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, HasRoleDirective],
  template: `
    <h2>Admin</h2>
    <p>Only users with Administrator role can access this route.</p>

    <div *appHasRole="'Administrator'">
      <p>Welcome, {{ auth.user()?.name }} ({{ auth.user()?.email }})</p>
    </div>
  `
})
export class AdminPage {
  readonly auth = inject(AuthService);
}


