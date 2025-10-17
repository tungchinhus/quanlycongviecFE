import { Injectable, signal } from '@angular/core';

export type UserRole = 'Administrator' | 'Manager' | 'User' | 'Guest';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  roles: UserRole[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUserSignal = signal<AuthUser | null>(null);

  constructor() {
    // Seed with a mock authenticated Administrator. Replace with real auth later.
    const mockUser: AuthUser = {
      id: '1',
      name: 'Thibidi User',
      email: 'user@thibidi.com',
      roles: ['Administrator']
    };
    this.currentUserSignal.set(mockUser);
  }

  get user() {
    return this.currentUserSignal.asReadonly();
  }

  isAuthenticated(): boolean {
    return this.currentUserSignal() !== null;
  }

  hasRole(required: UserRole | UserRole[]): boolean {
    const user = this.currentUserSignal();
    if (!user) return false;
    const requiredArray = Array.isArray(required) ? required : [required];
    return requiredArray.every(r => user.roles.includes(r));
  }

  hasAnyRole(candidates: UserRole | UserRole[]): boolean {
    const user = this.currentUserSignal();
    if (!user) return false;
    const list = Array.isArray(candidates) ? candidates : [candidates];
    return list.some(r => user.roles.includes(r));
  }

  login(user: AuthUser): void {
    this.currentUserSignal.set(user);
  }

  logout(): void {
    this.currentUserSignal.set(null);
  }
}


