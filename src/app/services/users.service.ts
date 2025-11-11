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
   * Xử lý các trường hợp edge case khi dữ liệu không đầy đủ
   */
  private mapUserDtoToAuthUser(dto: UserDto | any): AuthUser {
    // Validate dto
    if (!dto) {
      console.error('[UsersService] mapUserDtoToAuthUser: dto is null or undefined');
      throw new Error('UserDto is null or undefined');
    }

    // Validate userId - có thể là undefined hoặc null
    if (dto.userId === undefined || dto.userId === null) {
      console.error('[UsersService] mapUserDtoToAuthUser: userId is missing', dto);
      // Nếu không có userId, thử dùng firebaseUID hoặc tạo id tạm
      if (dto.firebaseUID) {
        console.warn('[UsersService] Using firebaseUID as id fallback');
        dto.userId = dto.firebaseUID; // Tạm thời dùng firebaseUID
      } else {
        throw new Error('UserDto missing userId and firebaseUID');
      }
    }

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
    
    // Xử lý userId - đảm bảo có thể convert sang string
    const userId = dto.userId !== undefined && dto.userId !== null 
      ? (typeof dto.userId === 'number' ? dto.userId.toString() : String(dto.userId))
      : (dto.firebaseUID || 'unknown');
    
    return {
      id: userId,
      userId: typeof dto.userId === 'number' ? dto.userId : undefined,
      firebaseUid: dto.firebaseUID || dto.firebaseUid || '',
      userName: dto.userName || '',
      name: dto.fullName || dto.name || dto.userName || '',
      email: dto.email || '',
      roles: roles, // Luôn là array, có thể rỗng
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      createdAt: dto.createdAt || ''
    };
  }

  /**
   * Load users từ API (PostgreSQL database)
   * API GET /api/users chỉ trả về users có trong PostgreSQL database
   * Không còn lấy từ Firebase custom claims, không hardcode, không tự động tạo user
   * @param forceRefresh - Nếu true, thêm timestamp để bypass cache
   */
  loadUsers(page: number = 1, pageSize: number = 100, search?: string, forceRefresh: boolean = false): Observable<AuthUser[]> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    
    if (search) {
      params = params.set('search', search);
    }

    // Thêm cache-busting parameter nếu forceRefresh = true
    if (forceRefresh) {
      params = params.set('_t', Date.now().toString());
    }

    return this.http.get<UsersResponse>(`${environment.apiUrl}/users`, { params }).pipe(
      tap(response => {
        console.log(`[UsersService] Loaded page ${response.page}/${response.totalPages}, total: ${response.totalCount}, current page: ${response.data.length} users`);
      }),
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
        console.log(`[UsersService] Mapped ${users.length} users, updating signal`);
        // Update signal với users đã normalize
        this.usersSignal.set(users);
      })
    );
  }

  /**
   * Load tất cả users từ DB (load nhiều pages nếu cần)
   * Đảm bảo đồng bộ với DB bằng cách load tất cả users
   */
  loadAllUsers(forceRefresh: boolean = false): Observable<AuthUser[]> {
    const pageSize = 100;
    
    // Load page đầu tiên để biết tổng số pages
    let params = new HttpParams()
      .set('page', '1')
      .set('pageSize', pageSize.toString());
    
    if (forceRefresh) {
      params = params.set('_t', Date.now().toString());
    }

    return this.http.get<UsersResponse>(`${environment.apiUrl}/users`, { params }).pipe(
      switchMap(response => {
        const totalPages = response.totalPages;
        const totalCount = response.totalCount;
        console.log(`[UsersService] Total pages: ${totalPages}, total users: ${totalCount}`);
        
        // Map users từ page đầu tiên
        let allUsers = response.data.map(dto => this.mapUserDtoToAuthUser(dto));
        
        // Nếu chỉ có 1 page, trả về luôn
        if (totalPages <= 1) {
          console.log(`[UsersService] Only 1 page, returning ${allUsers.length} users`);
          return of(allUsers);
        }

        // Load các pages còn lại
        const pageRequests: Observable<AuthUser[]>[] = [];
        for (let page = 2; page <= totalPages; page++) {
          pageRequests.push(
            this.loadUsers(page, pageSize, undefined, forceRefresh)
          );
        }

        // Load tất cả pages song song
        return forkJoin(pageRequests).pipe(
          map(usersArrays => {
            // Gộp tất cả users lại
            const allUsersFromPages = usersArrays.flat();
            allUsers = [...allUsers, ...allUsersFromPages];
            console.log(`[UsersService] Loaded all ${allUsers.length} users from ${totalPages} pages`);
            return allUsers;
          })
        );
      }),
      map(users => {
        // Ensure roles array is always present
        return users.map(user => ({
          ...user,
          roles: Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : []
        }));
      }),
      tap(users => {
        // Update signal với tất cả users
        this.usersSignal.set(users);
        console.log(`[UsersService] Updated signal with ${users.length} users`);
      })
    );
  }

  /**
   * Lấy user theo ID
   */
  getUserById(id: string): Observable<AuthUser> {
    return this.http.get<UserDto>(`${environment.apiUrl}/users/${id}`).pipe(
      tap(dto => {
        if (!dto) {
          console.error(`[UsersService] getUserById: Empty response for id ${id}`);
        }
      }),
      map(dto => {
        try {
          return this.mapUserDtoToAuthUser(dto);
        } catch (error) {
          console.error(`[UsersService] Error mapping user with id ${id}:`, error);
          throw error;
        }
      }),
      catchError(error => {
        console.error(`[UsersService] Error getting user by id ${id}:`, error);
        throw error;
      })
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
   * @param roles - Array of role names (string[]) để hỗ trợ roles mới từ DB
   */
  updateUserRoles(userId: string, roles: string[] | UserRole[]): Observable<AuthUser> {
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
   * @param claims.roles - Array of role names (string[] | UserRole[]) để hỗ trợ roles mới từ DB
   */
  setCustomClaims(firebaseUid: string, claims: { roles: string[] | UserRole[]; [key: string]: any }): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${environment.apiUrl}/users/${firebaseUid}/set-custom-claims`, claims);
  }

  /**
   * Refresh roles từ Firebase Custom Claims cho một user
   * Method này yêu cầu backend có endpoint để lấy Custom Claims từ Firebase
   */
  refreshUserRolesFromFirebase(firebaseUid: string): Observable<AuthUser> {
    console.log(`[UsersService] Refreshing roles from Firebase for UID: ${firebaseUid}`);
    
    // Backend endpoint sẽ verify Firebase ID token và lấy Custom Claims
    // Tạm thời sử dụng endpoint get user by firebaseUID
    return this.http.get<UserDto>(`${environment.apiUrl}/users/by-firebase-uid/${firebaseUid}`).pipe(
      tap(dto => {
        if (!dto) {
          console.error(`[UsersService] refreshUserRolesFromFirebase: Empty response for UID ${firebaseUid}`);
        }
      }),
      map(dto => {
        try {
          return this.mapUserDtoToAuthUser(dto);
        } catch (error) {
          console.error(`[UsersService] Error mapping user with UID ${firebaseUid}:`, error);
          throw error;
        }
      }),
      tap(updatedUser => {
        console.log(`[UsersService] Successfully refreshed user:`, updatedUser);
        // Update local signal
        this.usersSignal.update(list =>
          list.map(u => u.firebaseUid === firebaseUid ? updatedUser : u)
        );
      }),
      catchError(error => {
        console.error(`[UsersService] Error refreshing user roles from Firebase for UID ${firebaseUid}:`, error);
        if (error.error) {
          console.error('[UsersService] Error details:', error.error);
        }
        throw error;
      })
    );
  }

  /**
   * Đồng bộ roles từ Firebase Custom Claims xuống local DB cho một user
   * Backend sẽ lấy Custom Claims từ Firebase và cập nhật vào DB
   */
  syncUserRolesFromFirebase(firebaseUid: string): Observable<AuthUser> {
    console.log(`[UsersService] Syncing roles from Firebase for UID: ${firebaseUid}`);
    
    // Gọi backend endpoint để sync roles từ Firebase Custom Claims
    return this.http.post<UserDto>(`${environment.apiUrl}/users/by-firebase-uid/${firebaseUid}/sync-roles`, {}).pipe(
      tap(response => {
        console.log(`[UsersService] Sync response:`, response);
        // Validate response
        if (!response) {
          console.error('[UsersService] Empty response from sync-roles endpoint');
          throw new Error('Empty response from backend');
        }
        if (response.userId === undefined || response.userId === null) {
          console.warn('[UsersService] Response missing userId, will use fallback');
        }
      }),
      map(dto => {
        try {
          return this.mapUserDtoToAuthUser(dto);
        } catch (error) {
          console.error('[UsersService] Error mapping UserDto to AuthUser:', error);
          console.error('[UsersService] DTO data:', dto);
          throw error;
        }
      }),
      tap(updatedUser => {
        console.log(`[UsersService] Successfully synced user:`, updatedUser);
        // Update local signal
        this.usersSignal.update(list =>
          list.map(u => u.firebaseUid === firebaseUid ? updatedUser : u)
        );
      }),
      catchError(error => {
        console.error('[UsersService] Error syncing user roles from Firebase:', error);
        if (error.error) {
          console.error('[UsersService] Error details:', error.error);
        }
        if (error.message) {
          console.error('[UsersService] Error message:', error.message);
        }
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


