import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PagePermission {
  id: number;
  pageRoute: string;
  pageName: string;
  description?: string;
  isActive: boolean;
}

export interface UserPagePermission {
  id: number;
  userId: number;
  userName?: string;
  fullName?: string;
  pagePermissionId: number;
  pageRoute?: string;
  pageName?: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface CreatePagePermissionDto {
  pageRoute: string;
  pageName: string;
  description?: string;
}

export interface UpdateUserPagePermissionDto {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface AssignPagePermissionsDto {
  userId: number;
  permissions: PagePermissionAssignmentDto[];
}

export interface PagePermissionAssignmentDto {
  pagePermissionId: number;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface PagePermissionCheck {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PagePermissionService {
  private apiUrl = `${environment.apiUrl}/page-permissions`;

  constructor(private http: HttpClient) {}

  /**
   * Lấy tất cả page permissions
   */
  getPagePermissions(): Observable<PagePermission[]> {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/57bffb22-7512-45e6-b9e1-e296b244dac3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page-permission.service.ts:70',message:'getPagePermissions called',data:{apiUrl:this.apiUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return this.http.get<PagePermission[]>(this.apiUrl);
  }

  /**
   * Lấy page permissions của một user
   */
  getUserPagePermissions(userId: number): Observable<UserPagePermission[]> {
    // #region agent log
    const fullUrl = `${this.apiUrl}/user/${userId}`;
    fetch('http://127.0.0.1:7243/ingest/57bffb22-7512-45e6-b9e1-e296b244dac3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page-permission.service.ts:82',message:'getUserPagePermissions called',data:{userId,apiUrl:this.apiUrl,fullUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    return this.http.get<UserPagePermission[]>(fullUrl);
  }

  /**
   * Lấy page permissions của user hiện tại
   */
  getMyPagePermissions(): Observable<UserPagePermission[]> {
    return this.http.get<UserPagePermission[]>(`${this.apiUrl}/my-permissions`);
  }

  /**
   * Kiểm tra permission của user hiện tại cho một page
   */
  checkPagePermission(pageRoute: string): Observable<PagePermissionCheck> {
    return this.http.get<PagePermissionCheck>(`${this.apiUrl}/check/${encodeURIComponent(pageRoute)}`);
  }

  /**
   * Tạo page permission mới
   */
  createPagePermission(dto: CreatePagePermissionDto): Observable<PagePermission> {
    return this.http.post<PagePermission>(this.apiUrl, dto);
  }

  /**
   * Assign page permissions cho user
   */
  assignPagePermissions(dto: AssignPagePermissionsDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/assign`, dto);
  }

  /**
   * Cập nhật user page permission
   */
  updateUserPagePermission(
    userId: number,
    pagePermissionId: number,
    dto: UpdateUserPagePermissionDto
  ): Observable<UserPagePermission> {
    return this.http.put<UserPagePermission>(
      `${this.apiUrl}/user/${userId}/page/${pagePermissionId}`,
      dto
    );
  }

  /**
   * Xóa user page permission
   */
  deleteUserPagePermission(userId: number, pagePermissionId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/user/${userId}/page/${pagePermissionId}`);
  }
}

