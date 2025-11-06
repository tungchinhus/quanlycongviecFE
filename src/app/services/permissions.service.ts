import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Permission {
  permissionId: number;
  permissionName: string;
  description: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePermissionRequest {
  permissionName: string;
  description?: string;
}

export interface UpdatePermissionRequest {
  permissionName?: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly http = inject(HttpClient);
  private readonly permissionsSignal = signal<Permission[]>([]);

  readonly permissions = this.permissionsSignal.asReadonly();

  /**
   * Lấy danh sách tất cả permissions
   */
  getPermissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>(`${environment.apiUrl}/permissions`).pipe(
      tap(permissions => {
        this.permissionsSignal.set(permissions);
      })
    );
  }

  /**
   * Lấy permission theo ID
   */
  getPermissionById(permissionId: number): Observable<Permission> {
    return this.http.get<Permission>(`${environment.apiUrl}/permissions/${permissionId}`);
  }

  /**
   * Tạo permission mới
   */
  createPermission(permissionData: CreatePermissionRequest): Observable<Permission> {
    return this.http.post<Permission>(`${environment.apiUrl}/permissions`, permissionData).pipe(
      tap(newPermission => {
        this.permissionsSignal.update(list => [...list, newPermission]);
      })
    );
  }

  /**
   * Cập nhật permission
   */
  updatePermission(permissionId: number, permissionData: UpdatePermissionRequest): Observable<Permission> {
    return this.http.put<Permission>(`${environment.apiUrl}/permissions/${permissionId}`, permissionData).pipe(
      tap(updatedPermission => {
        this.permissionsSignal.update(list =>
          list.map(p => p.permissionId === permissionId ? updatedPermission : p)
        );
      })
    );
  }

  /**
   * Xóa permission
   */
  deletePermission(permissionId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/permissions/${permissionId}`).pipe(
      tap(() => {
        this.permissionsSignal.update(list => list.filter(p => p.permissionId !== permissionId));
      })
    );
  }
}

