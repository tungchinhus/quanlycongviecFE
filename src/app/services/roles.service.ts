import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { UserRole, normalizeRoleName } from '../constants/enums';

export interface Role {
  roleId: number;
  roleName: string;
  description: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRoleRequest {
  roleName: string;
  description?: string;
}

export interface UpdateRoleRequest {
  roleName?: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly http = inject(HttpClient);
  private readonly rolesSignal = signal<Role[]>([]);
  private readonly userRolesSignal = signal<UserRole[]>([]);

  readonly roles = this.rolesSignal.asReadonly();
  readonly userRoles = this.userRolesSignal.asReadonly();

  /**
   * Lấy danh sách tất cả roles
   */
  getRoles(): Observable<Role[]> {
    return this.http.get<any>(`${environment.apiUrl}/roles`).pipe(
      map(response => {
        // Handle both direct array response and wrapped response
        let roles: Role[] = [];
        if (Array.isArray(response)) {
          roles = response;
        } else if (response && Array.isArray(response.data)) {
          roles = response.data;
        } else if (response && response.data) {
          roles = [response.data];
        } else {
          console.warn('Unexpected roles response format:', response);
          roles = [];
        }
        return roles;
      }),
      tap(roles => {
        console.log('Loaded roles from DB:', roles);
        this.rolesSignal.set(roles);
        // Cập nhật userRolesSignal với các roles đã normalize (cho backward compatibility)
        const userRoles = roles
          .map(role => normalizeRoleName(role.roleName))
          .filter((role): role is UserRole => role !== null);
        this.userRolesSignal.set(userRoles);
      })
    );
  }

  /**
   * Lấy danh sách roles dạng string[] từ DB
   * Load tất cả roles từ DB, không filter theo enum
   * Để hỗ trợ các roles mới như ManagerL1, ManagerL2, ManagerL3
   */
  getUserRoles(): Observable<string[]> {
    // Nếu đã có roles trong signal, lấy roleName từ đó
    const cachedRoles = this.rolesSignal();
    if (cachedRoles.length > 0) {
      return new Observable(observer => {
        const roleNames = cachedRoles.map(role => role.roleName);
        observer.next(roleNames);
        observer.complete();
      });
    }

    // Nếu chưa có, load từ DB
    return this.getRoles().pipe(
      map(roles => {
        // Trả về tất cả roleName từ DB, không filter
        return roles.map(role => role.roleName);
      })
    );
  }

  /**
   * Lấy role theo ID
   */
  getRoleById(roleId: number): Observable<Role> {
    return this.http.get<Role>(`${environment.apiUrl}/roles/${roleId}`);
  }

  /**
   * Tạo role mới
   */
  createRole(roleData: CreateRoleRequest): Observable<Role> {
    return this.http.post<Role>(`${environment.apiUrl}/roles`, roleData).pipe(
      tap(newRole => {
        this.rolesSignal.update(list => [...list, newRole]);
      })
    );
  }

  /**
   * Cập nhật role
   */
  updateRole(roleId: number, roleData: UpdateRoleRequest): Observable<Role> {
    return this.http.put<Role>(`${environment.apiUrl}/roles/${roleId}`, roleData).pipe(
      tap(updatedRole => {
        this.rolesSignal.update(list =>
          list.map(r => r.roleId === roleId ? updatedRole : r)
        );
      })
    );
  }

  /**
   * Xóa role (soft delete hoặc hard delete)
   */
  deleteRole(roleId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/roles/${roleId}`).pipe(
      tap(() => {
        this.rolesSignal.update(list => list.filter(r => r.roleId !== roleId));
      })
    );
  }
}

