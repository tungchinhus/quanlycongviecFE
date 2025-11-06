import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { HasRoleDirective } from '../../directives/has-role.directive';
import { UserRole } from '../../constants/enums';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, HasRoleDirective],
  templateUrl: './admin.page.html',
  styleUrl: './admin.page.css'
})
export class AdminPage {
  readonly auth = inject(AuthService);
  readonly administratorRole = UserRole.Administrator;
}


