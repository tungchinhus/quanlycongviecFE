import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { HasRoleDirective } from '../../directives/has-role.directive';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, HasRoleDirective],
  templateUrl: './admin.page.html',
  styleUrl: './admin.page.css'
})
export class AdminPage {
  readonly auth = inject(AuthService);
}


