import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsersService } from '../../services/users.service';
import { UserRole } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h2>Quản lý người dùng</h2>

    <table class="table">
      <thead>
        <tr>
          <th>Tên</th>
          <th>Email</th>
          <th>Roles</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let u of users()">
          <td>{{ u.name }}</td>
          <td>{{ u.email }}</td>
          <td>
            <label *ngFor="let r of allRoles" style="margin-right:12px; display:inline-flex; align-items:center;">
              <input type="checkbox" [checked]="u.roles.includes(r)" (change)="onToggleRole(u.id, r, $any($event.target).checked)" />
              <span style="margin-left:6px">{{ r }}</span>
            </label>
          </td>
          <td>
            <button (click)="remove(u.id)">Xoá</button>
          </td>
        </tr>
      </tbody>
    </table>

    <form (ngSubmit)="add()" style="margin-top:16px; display:flex; gap:8px; align-items:end; flex-wrap:wrap;">
      <div>
        <label>Họ tên<br>
          <input [(ngModel)]="newName" name="name" required />
        </label>
      </div>
      <div>
        <label>Email<br>
          <input [(ngModel)]="newEmail" name="email" required />
        </label>
      </div>
      <div>
        <label>Quyền mặc định<br>
          <select [(ngModel)]="newRole" name="role">
            <option *ngFor="let r of allRoles" [value]="r">{{ r }}</option>
          </select>
        </label>
      </div>
      <button type="submit">Thêm người dùng</button>
    </form>
  `,
  styles: [`
    .table { width: 100%; border-collapse: collapse; }
    .table th, .table td { border: 1px solid #ddd; padding: 8px; }
    .table th { background: #f8f8f8; }
  `]
})
export class UsersPage {
  private readonly usersService = inject(UsersService);

  readonly users = this.usersService.users;
  readonly allRoles: UserRole[] = ['Administrator', 'Manager', 'User', 'Guest'];

  newName = '';
  newEmail = '';
  newRole: UserRole = 'User';

  onToggleRole(userId: string, role: UserRole, checked: boolean | undefined): void {
    const user = this.users().find(u => u.id === userId);
    if (!user) return;
    const next = new Set(user.roles);
    if (checked) next.add(role); else next.delete(role);
    this.usersService.setRoles(userId, Array.from(next));
  }

  remove(userId: string): void {
    this.usersService.removeUser(userId);
  }

  add(): void {
    const id = Math.random().toString(36).slice(2);
    this.usersService.addUser({ id, name: this.newName, email: this.newEmail, roles: [this.newRole] });
    this.newName = '';
    this.newEmail = '';
    this.newRole = 'User';
  }
}


