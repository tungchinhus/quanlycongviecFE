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
   * Lấy danh sách tất cả roles từ DB (SQL Server database)
   * Luôn fetch mới từ API, không dùng cache, không hardcode
   * API GET /api/roles chỉ trả về roles có trong database
   * Thêm cache-busting để đảm bảo luôn lấy data mới nhất
   */
  getRoles(): Observable<Role[]> {
    // Thêm timestamp để bypass browser cache và đảm bảo luôn fetch mới
    const timestamp = new Date().getTime();
    const url = `${environment.apiUrl}/roles?t=${timestamp}`;
    console.log('🔍 Fetching roles from API:', url);
    console.log('⏰ Timestamp for cache-busting:', timestamp);
    
    return this.http.get<any>(url, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }).pipe(
      map(response => {
        console.log('📥 Raw API response:', response);
        // Handle both direct array response and wrapped response
        let roles: Role[] = [];
        if (Array.isArray(response)) {
          roles = response;
          console.log('✅ Response is array, count:', roles.length);
        } else if (response && Array.isArray(response.data)) {
          roles = response.data;
          console.log('✅ Response has data array, count:', roles.length);
        } else if (response && response.data) {
          roles = [response.data];
          console.log('✅ Response has single data object');
        } else {
          console.warn('⚠️ Unexpected roles response format:', response);
          roles = [];
        }
        console.log('📋 Parsed roles from API response, count:', roles.length);
        roles.forEach((role, index) => {
          console.log(`  ${index + 1}. ${role.roleName} (ID: ${role.roleId}) - ${role.description || 'No description'}`);
        });
        return roles;
      }),
      tap(roles => {
        console.log('🔧 Setting roles signal with data from DB. Count:', roles.length);
        console.log('📊 Roles details:', roles.map(r => ({ id: r.roleId, name: r.roleName, desc: r.description })));
        
        // ⚠️ KIỂM TRA: So sánh với DB
        console.log('🔍 DEBUG: Checking for discrepancies...');
        const roleNames = roles.map(r => r.roleName);
        const hasGuest = roleNames.includes('Guest');
        if (hasGuest) {
          console.warn('⚠️ WARNING: Guest role found in API response but NOT in DB!');
          console.warn('   This means backend is adding Guest role. Check backend API.');
        }
        console.log('📋 All role names from API:', roleNames);
        console.log('📋 Role IDs from API:', roles.map(r => r.roleId));
        
        // Luôn update signal với data mới từ DB
        this.rolesSignal.set(roles);
        // Cập nhật userRolesSignal với các roles đã normalize (cho backward compatibility)
        const userRoles = roles
          .map(role => normalizeRoleName(role.roleName))
          .filter((role): role is UserRole => role !== null);
        this.userRolesSignal.set(userRoles);
        console.log('✅ Roles signal updated. Current signal value count:', this.rolesSignal().length);
      })
    );
  }

  /**
   * Lấy danh sách roles dạng string[] từ DB (SQL Server database)
   * Load tất cả roles từ DB, không filter theo enum, không hardcode
   * Để hỗ trợ các roles mới như ManagerL1, ManagerL2, ManagerL3
   * 
   * Note: Luôn fetch từ DB để đảm bảo data mới nhất, không có fallback hardcode
   */
  getUserRoles(): Observable<string[]> {
    // Luôn load từ DB để đảm bảo data mới nhất, không dùng cache
    return this.getRoles().pipe(
      map(roles => {
        // Trả về tất cả roleName từ DB, không filter
        const roleNames = roles.map(role => role.roleName);
        console.log('getUserRoles: Returning role names from DB:', roleNames);
        return roleNames;
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

