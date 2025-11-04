import { Injectable, computed, signal } from '@angular/core';
import { AuthUser, UserRole } from './auth.service';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly usersSignal = signal<AuthUser[]>([
    { id: '1', name: 'Thibidi Admin', email: 'admin@thibidi.com', roles: ['Administrator'] },
    { id: '2', name: 'Nguyen Van A', email: 'a@thibidi.com', roles: ['User'] },
    { id: '3', name: 'Tran Thi B', email: 'b@thibidi.com', roles: ['Manager'] },
  ]);

  readonly users = this.usersSignal.asReadonly();
  readonly count = computed(() => this.usersSignal().length);

  setRoles(userId: string, roles: UserRole[]): void {
    this.usersSignal.update(list => list.map(u => u.id === userId ? { ...u, roles: [...roles] } : u));
  }

  addUser(user: AuthUser): void {
    this.usersSignal.update(list => [...list, user]);
  }

  removeUser(userId: string): void {
    this.usersSignal.update(list => list.filter(u => u.id !== userId));
  }
}


