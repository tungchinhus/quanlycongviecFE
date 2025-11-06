import { Injectable, inject, computed, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, tap, switchMap, catchError } from 'rxjs/operators';
import { AuthUser, UserRole } from './auth.service';
import { UserRole as UserRoleEnum } from '../constants/enums';
import { environment } from '../../environments/environment';
import { Auth } from '@angular/fire/auth';
import { from } from 'rxjs';

export interface CreateUserRequest {
  userName: string;
  email: string;
  password: string;
  fullName: string;
  roles: string[]; // Array of role names (strings), not roleIds
}

// Interface từ Backend API
export interface UserDto {
  userId: number;
  userName: string;
  fullName: string | null;
  email: string | null;
  firebaseUID: string | null;
  isActive: boolean;
  createdAt: string;
  roles: string[];
}

export interface UsersResponse {
  data: UserDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UsernameToEmailResponse {
  email: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(Auth);
  private readonly usersSignal = signal<AuthUser[]>([]);

  readonly users = this.usersSignal.asReadonly();
  readonly count = computed(() => this.usersSignal().length);

  constructor() {
    // Load users khi service được khởi tạo
    this.loadUsers().subscribe();
  }

  /**
   * Map UserDto từ backend sang AuthUser
   * Đảm bảo roles luôn là array, không null/undefined
   */
  private mapUserDtoToAuthUser(dto: UserDto): AuthUser {
    // Normalize roles - đảm bảo luôn là array
    let roles: UserRole[] = [];
    if (dto.roles) {
      if (Array.isArray(dto.roles)) {
        roles = dto.roles.filter((r: any) => r) as UserRole[];
      } else {
        // Nếu roles không phải array, coi như string hoặc unknown type
        const rolesValue = dto.roles as any;
        if (typeof rolesValue === 'string') {
          // Nếu roles là string, parse nếu là JSON, hoặc split bằng comma
          try {
            const parsed = JSON.parse(rolesValue);
            if (Array.isArray(parsed)) {
              roles = parsed as UserRole[];
            } else {
              roles = [rolesValue as UserRole];
            }
          } catch {
            // Nếu không phải JSON, split bằng comma
            roles = rolesValue.split(',').map((r: string) => r.trim()).filter((r: string) => r) as UserRole[];
          }
        } else {
          // Nếu là giá trị đơn, convert thành array
          roles = [rolesValue as UserRole];
        }
      }
    }
    
    return {
      id: dto.userId.toString(),
      userId: dto.userId,
      firebaseUid: dto.firebaseUID || '',
      userName: dto.userName,
      name: dto.fullName || dto.userName || '',
      email: dto.email || '',
      roles: roles, // Luôn là array, có thể rỗng
      isActive: dto.isActive,
      createdAt: dto.createdAt
    };
  }

  /**
   * Load users từ API và enrich với Firebase Custom Claims
   * Firebase Custom Claims là source of truth cho roles
   */
  loadUsers(page: number = 1, pageSize: number = 100, search?: string): Observable<AuthUser[]> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    
    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<UsersResponse>(`${environment.apiUrl}/users`, { params }).pipe(
      map(response => {
        // Map UserDto sang AuthUser và normalize roles
        return response.data.map(dto => this.mapUserDtoToAuthUser(dto));
      }),
      map(users => {
        // Ensure roles array is always present (không null/undefined)
        return users.map(user => ({
          ...user,
          roles: Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : []
        }));
      }),
      tap(users => {
        // Update signal với users đã normalize
        this.usersSignal.set(users);
      })
    );
  }

  /**
   * Lấy user theo ID
   */
  getUserById(id: string): Observable<AuthUser> {
    return this.http.get<UserDto>(`${environment.apiUrl}/users/${id}`).pipe(
      map(dto => this.mapUserDtoToAuthUser(dto))
    );
  }

  /**
   * Lấy email từ username (dùng cho đăng nhập)
   */
  getUserByUsername(username: string): Observable<UsernameToEmailResponse> {
    return this.http.get<UsernameToEmailResponse>(`${environment.apiUrl}/users/by-username/${encodeURIComponent(username)}`);
  }

  /**
   * Map role names sang role IDs
   * Administrator = 1, Manager = 2, User = 3, Guest = 4
   */
  mapRoleNamesToIds(roles: UserRole[]): number[] {
    const roleMapping: { [key in UserRoleEnum]: number } = {
      [UserRoleEnum.Administrator]: 1,
      [UserRoleEnum.Manager]: 2,
      [UserRoleEnum.User]: 3,
      [UserRoleEnum.Guest]: 4
    };
    return roles.map(role => roleMapping[role as UserRoleEnum]).filter(id => id !== undefined);
  }

  /**
   * Tạo user mới với Firebase Authentication
   * Sử dụng endpoint /api/users theo API documentation
   * Backend sẽ tự động:
   * 1. Tạo user trên Firebase Authentication
   * 2. Set custom claims với roles trên Firebase
   * 3. Lưu user vào database với FirebaseUID
   * 4. Đồng bộ roles xuống database
   * 5. Trả về thông tin user đã tạo
   */
  createUser(userData: CreateUserRequest): Observable<AuthUser> {
    // Gọi API endpoint /api/users để tạo user trên Firebase và local DB
    return this.http.post<UserDto>(`${environment.apiUrl}/users`, {
      userName: userData.userName,
      email: userData.email,
      password: userData.password,
      fullName: userData.fullName,
      roles: userData.roles // Array of role names (strings)
    }).pipe(
      tap(dto => {
        console.log('API Response from createUser:', dto);
        // Kiểm tra xem response có đầy đủ thông tin không
        if (!dto || (!dto.userId && dto.userId !== 0) || !dto.firebaseUID) {
          console.error('Error: Response is incomplete - missing userId or firebaseUID:', dto);
        }
      }),
      map(dto => this.mapUserDtoToAuthUser(dto)),
      tap(newUser => {
        console.log('Mapped user:', newUser);
        this.usersSignal.update(list => [...list, newUser]);
      })
    );
  }

  /**
   * Cập nhật roles của user (set custom claims trên Firebase)
   * Backend sẽ:
   * 1. Update roles trong Local DB
   * 2. Set Custom Claims trên Firebase
   */
  updateUserRoles(userId: string, roles: UserRole[]): Observable<AuthUser> {
    return this.http.put<UserDto>(`${environment.apiUrl}/users/${userId}/roles`, { roles }).pipe(
      map(dto => this.mapUserDtoToAuthUser(dto)),
      tap(updatedUser => {
        // Update local signal
        this.usersSignal.update(list =>
          list.map(u => u.id === userId ? updatedUser : u)
        );
      })
    );
  }

  /**
   * Cập nhật custom claims cho user trên Firebase (qua backend)
   * Backend sẽ sử dụng Admin SDK để set custom claims
   * Đây là method để đảm bảo Firebase có claims mới nhất
   */
  setCustomClaims(firebaseUid: string, claims: { roles: UserRole[]; [key: string]: any }): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${environment.apiUrl}/users/${firebaseUid}/set-custom-claims`, claims);
  }

  /**
   * Refresh roles từ Firebase Custom Claims cho một user
   * Method này yêu cầu backend có endpoint để lấy Custom Claims từ Firebase
   */
  refreshUserRolesFromFirebase(firebaseUid: string): Observable<AuthUser> {
    // Backend endpoint sẽ verify Firebase ID token và lấy Custom Claims
    // Tạm thời sử dụng endpoint get user by firebaseUID
    return this.http.get<UserDto>(`${environment.apiUrl}/users/by-firebase-uid/${firebaseUid}`).pipe(
      map(dto => this.mapUserDtoToAuthUser(dto)),
      tap(updatedUser => {
        // Update local signal
        this.usersSignal.update(list =>
          list.map(u => u.firebaseUid === firebaseUid ? updatedUser : u)
        );
      }),
      catchError(error => {
        console.error('Error refreshing user roles from Firebase:', error);
        throw error;
      })
    );
  }

  /**
   * Đồng bộ roles từ Firebase Custom Claims xuống local DB cho một user
   * Backend sẽ lấy Custom Claims từ Firebase và cập nhật vào DB
   */
  syncUserRolesFromFirebase(firebaseUid: string): Observable<AuthUser> {
    // Gọi backend endpoint để sync roles từ Firebase Custom Claims
    return this.http.post<UserDto>(`${environment.apiUrl}/users/by-firebase-uid/${firebaseUid}/sync-roles`, {}).pipe(
      map(dto => this.mapUserDtoToAuthUser(dto)),
      tap(updatedUser => {
        // Update local signal
        this.usersSignal.update(list =>
          list.map(u => u.firebaseUid === firebaseUid ? updatedUser : u)
        );
      }),
      catchError(error => {
        console.error('Error syncing user roles from Firebase:', error);
        throw error;
      })
    );
  }

  /**
   * Cập nhật thông tin user
   */
  updateUser(userId: string, userData: Partial<AuthUser>): Observable<AuthUser> {
    // Map AuthUser sang format backend cần
    const updateData: any = {};
    if (userData.userName !== undefined) updateData.userName = userData.userName;
    if (userData.name !== undefined) updateData.fullName = userData.name;
    if (userData.email !== undefined) updateData.email = userData.email;
    if (userData.isActive !== undefined) updateData.isActive = userData.isActive;
    if (userData.roles !== undefined) {
      // Nếu có roles, cần map sang roleIds (backend có thể cần roleIds thay vì roles)
      // Tạm thời giữ nguyên roles vì backend có thể chấp nhận
      updateData.roles = userData.roles;
    }

    return this.http.put<UserDto>(`${environment.apiUrl}/users/${userId}`, updateData).pipe(
      map(dto => this.mapUserDtoToAuthUser(dto)),
      tap(updatedUser => {
        this.usersSignal.update(list =>
          list.map(u => u.id === userId ? updatedUser : u)
        );
      })
    );
  }

  /**
   * Xóa mềm user (deactivate - chỉ ẩn đi, không xóa thật sự)
   * Sử dụng endpoint PATCH /api/users/{id}/deactivate
   */
  deleteUser(userId: string): Observable<void> {
    return this.http.patch<void>(`${environment.apiUrl}/users/${userId}/deactivate`, {}).pipe(
      tap(() => {
        // Cập nhật user trong list thành isActive = false thay vì xóa khỏi list
        this.usersSignal.update(list => 
          list.map(u => u.id === userId ? { ...u, isActive: false } : u)
        );
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


