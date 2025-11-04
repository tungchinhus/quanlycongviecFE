import { Injectable, inject, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { AuthUser, UserRole } from './auth.service';
import { environment } from '../../environments/environment';

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  roles: UserRole[];
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly usersSignal = signal<AuthUser[]>([]);

  readonly users = this.usersSignal.asReadonly();
  readonly count = computed(() => this.usersSignal().length);

  constructor() {
    // Load users khi service được khởi tạo
    this.loadUsers().subscribe();
  }

  /**
   * Load tất cả users từ API
   */
  loadUsers(): Observable<AuthUser[]> {
    return this.http.get<AuthUser[]>(`${environment.apiUrl}/users`).pipe(
      tap(users => this.usersSignal.set(users))
    );
  }

  /**
   * Lấy user theo ID
   */
  getUserById(id: string): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${environment.apiUrl}/users/${id}`);
  }

  /**
   * Tạo user mới: Tạo trên Firebase trước, sau đó tạo trong local DB
   */
  createUser(userData: CreateUserRequest): Observable<AuthUser> {
    // API sẽ xử lý việc tạo user trên Firebase và sau đó tạo trong DB
    return this.http.post<AuthUser>(`${environment.apiUrl}/users`, userData).pipe(
      tap(newUser => {
        this.usersSignal.update(list => [...list, newUser]);
      })
    );
  }

  /**
   * Cập nhật roles của user
   */
  updateUserRoles(userId: string, roles: UserRole[]): Observable<AuthUser> {
    return this.http.put<AuthUser>(`${environment.apiUrl}/users/${userId}/roles`, { roles }).pipe(
      tap(updatedUser => {
        this.usersSignal.update(list =>
          list.map(u => u.id === userId ? updatedUser : u)
        );
      })
    );
  }

  /**
   * Cập nhật thông tin user
   */
  updateUser(userId: string, userData: Partial<AuthUser>): Observable<AuthUser> {
    return this.http.put<AuthUser>(`${environment.apiUrl}/users/${userId}`, userData).pipe(
      tap(updatedUser => {
        this.usersSignal.update(list =>
          list.map(u => u.id === userId ? updatedUser : u)
        );
      })
    );
  }

  /**
   * Xóa user (cả Firebase và local DB)
   */
  deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/users/${userId}`).pipe(
      tap(() => {
        this.usersSignal.update(list => list.filter(u => u.id !== userId));
      })
    );
  }

  /**
   * Legacy methods để tương thích với code cũ
   */
  setRoles(userId: string, roles: UserRole[]): void {
    this.updateUserRoles(userId, roles).subscribe();
  }

  addUser(user: AuthUser): void {
    // Method này không nên được sử dụng trực tiếp, nên dùng createUser
    this.usersSignal.update(list => [...list, user]);
  }

  removeUser(userId: string): void {
    this.deleteUser(userId).subscribe();
  }
}


