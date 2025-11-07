import { Injectable, inject, signal } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser, getIdTokenResult, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { UserRole, UserRole as UserRoleEnum, normalizeRoleName, normalizeRoles as normalizeRolesEnum, ALL_USER_ROLES } from '../constants/enums';

// Export type để backward compatibility với code cũ
export type { UserRole } from '../constants/enums';

export interface AuthUser {
  id: string; // userId từ backend (string)
  userId?: number; // userId từ backend (number) - optional để tương thích
  firebaseUid: string; // firebaseUID từ backend
  userName?: string; // userName từ backend
  name: string; // fullName từ backend
  email: string;
  roles: UserRole[];
  isActive?: boolean;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly http = inject(HttpClient);
  private readonly currentUserSignal = signal<AuthUser | null>(null);

  constructor() {
    // Khôi phục user session từ localStorage khi app khởi động
    this.restoreUserSession();
    
    // Theo dõi trạng thái đăng nhập Firebase
    onAuthStateChanged(this.auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Nếu đã có user session trong localStorage, không cần load lại
        const existingUser = this.currentUserSignal();
        if (existingUser && localStorage.getItem('token')) {
          return; // Đã có user session, không cần reload
        }
        
        // Nếu chưa có user session, load từ Firebase custom claims hoặc local DB
        this.loadUserFromFirebase(firebaseUser).subscribe({
          error: (error) => {
            console.error('Error loading user from Firebase on auth state change:', error);
            // Fallback: load từ local DB nếu không có custom claims
            this.loadUserFromLocalDB(firebaseUser.uid).subscribe({
              error: (err) => {
                console.error('Error loading user from local DB on auth state change:', err);
              }
            });
          }
        });
      } else {
        // Nếu Firebase user là null, clear user session
        this.currentUserSignal.set(null);
        localStorage.removeItem('user_session');
        localStorage.removeItem('token');
      }
    });
  }

  /**
   * Normalize roles: map "Admin" -> "Administrator" để đảm bảo consistency
   * Sử dụng enum để đảm bảo đồng nhất giữa frontend, backend và Firebase
   */
  private normalizeRoles(roles: string[]): UserRole[] {
    return normalizeRolesEnum(roles);
  }

  /**
   * Khôi phục user session từ localStorage khi app khởi động
   */
  private restoreUserSession(): void {
    const userSession = localStorage.getItem('user_session');
    const token = localStorage.getItem('token');
    
    if (userSession && token) {
      try {
        const user = JSON.parse(userSession) as AuthUser;
        // Normalize roles khi restore từ localStorage
        user.roles = this.normalizeRoles(user.roles || []);
        this.currentUserSignal.set(user);
        // Cập nhật lại localStorage với roles đã normalize
        localStorage.setItem('user_session', JSON.stringify(user));
        // Đồng bộ ngầm thông tin user và roles xuống local DB để nhất quán với danh sách Users
        this.syncUserToLocalDB(user, true).subscribe({
          error: (err) => console.warn('Silent sync on restore failed:', err)
        });
      } catch (error) {
        console.error('Error restoring user session:', error);
        localStorage.removeItem('user_session');
        localStorage.removeItem('token');
      }
    }
  }

  get user() {
    return this.currentUserSignal.asReadonly();
  }

  isAuthenticated(): boolean {
    // Kiểm tra cả user signal và JWT token
    const user = this.currentUserSignal();
    const token = localStorage.getItem('token');
    return user !== null && token !== null;
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

  /**
   * Kiểm tra xem input có phải là email format không
   */
  private isEmailFormat(input: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
  }

  /**
   * Resolve email từ username hoặc email
   * Hỗ trợ đăng nhập bằng cả email và username
   * 
   * Flow:
   * 1. Nếu input là email format (có @ và .) → dùng trực tiếp
   * 2. Nếu không phải email format → query từ backend /users/by-username/{username} để lấy email
   * 
   * @param usernameOrEmail - Có thể là email (user@example.com) hoặc username (user123)
   * @returns Observable<string> - Email để đăng nhập Firebase
   */
  private resolveEmailFromUsernameOrEmail(usernameOrEmail: string): Observable<string> {
    // Nếu là email format thì dùng trực tiếp (không cần query backend)
    if (this.isEmailFormat(usernameOrEmail)) {
      return of(usernameOrEmail);
    }

    // Nếu không phải email format, coi như username và query từ backend để lấy email
    return this.http.get<{ email: string }>(`${environment.apiUrl}/users/by-username/${encodeURIComponent(usernameOrEmail)}`).pipe(
      map((response: { email: string }) => response.email),
      catchError((error) => {
        console.error('Error resolving email from username:', error);
        // Nếu không tìm thấy username, throw error với message rõ ràng
        if (error.status === 404) {
          throw { ...error, code: 'auth/user-not-found', message: 'Tên đăng nhập hoặc email không tồn tại.' };
        } else if (error.status === 0 || !error.status) {
          // Network error
          throw { ...error, code: 'auth/network-request-failed', message: 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.' };
        }
        throw error;
      })
    );
  }

  /**
   * Đăng nhập với username/email và password qua Firebase
   * Flow: Login Firebase -> Lấy ID Token -> Gửi lên backend -> Nhận JWT token và user info
   */
  loginWithEmailAndPassword(usernameOrEmail: string, password: string): Observable<AuthUser> {
    // Resolve email từ username hoặc email
    return this.resolveEmailFromUsernameOrEmail(usernameOrEmail).pipe(
      switchMap((email) => {
        // Bước 1: Đăng nhập với Firebase (email/password)
        return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
          switchMap((userCredential) => {
            const firebaseUser = userCredential.user;
            // Bước 2: Lấy ID Token từ Firebase (force refresh để đảm bảo có custom claims mới nhất)
            return from(firebaseUser.getIdToken(true)).pipe(
              switchMap((idToken) => {
                // Bước 3: Lấy roles từ Firebase Custom Claims (source of truth)
                return from(getIdTokenResult(firebaseUser, true)).pipe(
                  switchMap((tokenResult) => {
                    // Lấy roles từ custom claims
                    const claims = tokenResult.claims;
                    let roles: UserRole[] = [];
                    
                    if (claims['roles']) {
                      if (Array.isArray(claims['roles'])) {
                        roles = this.normalizeRoles(claims['roles'] as string[]);
                      } else {
                        roles = this.normalizeRoles([claims['roles'] as string]);
                      }
                    } else {
                      // Nếu không có custom claims, mặc định là User
                      roles = [UserRole.User];
                    }
                    
                    // Bước 4: Gửi ID Token lên backend để verify và lấy JWT token
                    return this.http.post<{
                      token: string;
                      user: {
                        userId: number;
                        userName?: string;
                        fullName: string;
                        email: string;
                        firebaseUID: string;
                        roles: string[];
                        emailVerified: boolean;
                      };
                    }>(`${environment.apiUrl}/auth/login/firebase-token`, {
                      idToken: idToken
                    }).pipe(
                      map((response) => {
                        // Bước 5: Lưu JWT token từ backend vào localStorage
                        localStorage.setItem('token', response.token);
                        
                        // Bước 6: Map user từ backend response sang AuthUser
                        // QUAN TRỌNG: Sử dụng roles từ Firebase Custom Claims, không từ backend response
                        const authUser: AuthUser = {
                          id: response.user.userId.toString(),
                          userId: response.user.userId,
                          firebaseUid: response.user.firebaseUID,
                          userName: response.user.userName,
                          name: response.user.fullName,
                          email: response.user.email,
                          roles: roles, // Lấy từ Firebase Custom Claims, không từ backend
                          isActive: true
                        };
                        
                        // Lưu user vào signal và localStorage
                        this.currentUserSignal.set(authUser);
                        localStorage.setItem('user_session', JSON.stringify(authUser));
                      
                      // Đồng bộ user và roles xuống local DB để đảm bảo danh sách Users hiển thị đúng
                      this.syncUserToLocalDB(authUser, true).subscribe({
                        error: (err) => console.warn('Silent sync after login failed:', err)
                      });
                        
                        return authUser;
                      }),
                      catchError((error) => {
                        console.error('Error during backend login:', error);
                        
                        // Xử lý các loại lỗi cụ thể
                        let errorMessage = 'Đăng nhập thất bại.';
                        
                        if (error.status === 401) {
                          errorMessage = 'Xác thực thất bại. Token Firebase không hợp lệ hoặc backend không thể verify.';
                          console.error('Backend returned 401 Unauthorized. Possible causes:');
                          console.error('  1. Firebase token không hợp lệ hoặc đã hết hạn');
                          console.error('  2. Backend không thể verify Firebase token');
                          console.error('  3. User chưa được sync trong backend DB');
                          console.error('  4. Custom claims chưa được set trên Firebase');
                        } else if (error.status === 403) {
                          errorMessage = 'Bạn không có quyền truy cập.';
                        } else if (error.status === 404) {
                          errorMessage = 'Endpoint không tồn tại. Vui lòng kiểm tra cấu hình API.';
                        } else if (error.status === 500) {
                          // Lỗi 500 - Backend internal server error
                          const backendError = error.error?.message || error.error?.error || '';
                          if (backendError.includes('Google.Apis.Auth') || backendError.includes('FileNotFoundException')) {
                            errorMessage = 'Lỗi backend: Thiếu package Google.Apis.Auth. Backend cần cài đặt NuGet package.';
                          } else if (backendError.includes('Firebase') || backendError.includes('FirebaseService')) {
                            errorMessage = 'Lỗi backend: Firebase Admin SDK chưa được khởi tạo đúng cách.';
                          } else if (backendError) {
                            errorMessage = `Lỗi server: ${backendError}`;
                          } else {
                            errorMessage = 'Lỗi server. Vui lòng thử lại sau hoặc liên hệ quản trị viên.';
                          }
                          console.error('Backend 500 error:', backendError);
                        } else if (error.status === 0 || !error.status) {
                          errorMessage = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
                        } else if (error.error?.message) {
                          errorMessage = error.error.message;
                        } else if (error.message) {
                          errorMessage = error.message;
                        }
                        
                        // Nếu backend login thất bại, đăng xuất khỏi Firebase
                        signOut(this.auth).catch(() => {});
                        
                        // Throw error với message rõ ràng hơn
                        throw { ...error, message: errorMessage };
                      })
                    );
                  }),
                  catchError((error) => {
                    console.error('Error getting Firebase ID token result:', error);
                    throw error;
                  })
                );
              }),
              catchError((error) => {
                console.error('Error getting Firebase ID token:', error);
                throw error;
              })
            );
          }),
          catchError((error) => {
            console.error('Firebase login error:', error);
            // Log thêm thông tin chi tiết về lỗi
            if (error.code) {
              console.error('Error code:', error.code);
              console.error('Error message:', error.message);
            }
            // Đảm bảo error object có đầy đủ thông tin
            const enhancedError = {
              ...error,
              code: error.code || 'unknown',
              message: error.message || 'Đăng nhập thất bại. Vui lòng thử lại.'
            };
            throw enhancedError;
          })
        );
      })
    );
  }

  /**
   * Đăng xuất
   */
  logout(): Observable<void> {
    return from(signOut(this.auth)).pipe(
      map(() => {
        this.currentUserSignal.set(null);
        localStorage.removeItem('user_session');
        localStorage.removeItem('token'); // Xóa JWT token khi đăng xuất
      })
    );
  }

  /**
   * Lấy thông tin user từ Firebase custom claims (ưu tiên)
   * Roles luôn lấy từ Firebase Custom Claims, không từ API/DB
   */
  private loadUserFromFirebase(firebaseUser: FirebaseUser): Observable<AuthUser> {
    return from(getIdTokenResult(firebaseUser, true)).pipe(
      map((tokenResult) => {
        // Lấy roles từ custom claims - đây là source of truth
        const claims = tokenResult.claims;
        let roles: UserRole[] = [];
        
        if (claims['roles']) {
          if (Array.isArray(claims['roles'])) {
            roles = this.normalizeRoles(claims['roles'] as string[]);
          } else {
            // Nếu roles không phải array, convert thành array
            roles = this.normalizeRoles([claims['roles'] as string]);
          }
        } else {
          // Nếu không có custom claims, mặc định là User
          roles = [UserRole.User];
        }

        // Tạo AuthUser từ Firebase user và custom claims
        // Roles luôn lấy từ Firebase Custom Claims, không từ DB
        const authUser: AuthUser = {
          id: firebaseUser.uid,
          firebaseUid: firebaseUser.uid,
          name: firebaseUser.displayName || (claims['name'] as string) || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || '',
          roles: roles // Luôn từ Firebase Custom Claims
        };

        // Lưu vào signal và localStorage
        this.currentUserSignal.set(authUser);
        localStorage.setItem('user_session', JSON.stringify(authUser));

        // Sync thông tin user lên local DB (có sync roles)
        // Giúp danh sách Users và các trang quản trị phản ánh đúng quyền
        this.syncUserToLocalDB(authUser, true).subscribe({
          error: (error) => {
            console.warn('Failed to sync user to local DB:', error);
            // Không throw error vì đây chỉ là sync operation
          }
        });

        return authUser;
      }),
      catchError((error) => {
        console.error('Error loading user from Firebase custom claims:', error);
        throw error;
      })
    );
  }

  /**
   * Đồng bộ thông tin user lên local DB (không bắt buộc)
   * @param authUser User cần sync
   * @param syncRoles Có sync roles không (default: true). Nếu false, chỉ sync name và email
   */
  private syncUserToLocalDB(authUser: AuthUser, syncRoles: boolean = true): Observable<AuthUser> {
    const syncData: any = {
      name: authUser.name,
      email: authUser.email
    };
    
    // Chỉ sync roles nếu được yêu cầu
    // Current user không sync roles vì roles luôn lấy từ Firebase Custom Claims
    if (syncRoles) {
      syncData.roles = authUser.roles;
    }

    return this.http.put<any>(`${environment.apiUrl}/users/by-firebase-uid/${authUser.firebaseUid}`, syncData).pipe(
      map(dto => {
        // Map từ DB nhưng giữ nguyên roles từ Firebase Custom Claims
        const dbUser = this.mapUserDtoToAuthUser(dto);
        // Quan trọng: Không ghi đè roles từ DB, giữ nguyên roles từ Firebase
        return {
          ...dbUser,
          roles: syncRoles ? dbUser.roles : authUser.roles // Nếu không sync roles, giữ nguyên từ Firebase
        };
      }),
      catchError((error) => {
        // Nếu user chưa tồn tại trong DB, tạo mới
        if (error.status === 404) {
          const createData: any = {
            name: authUser.name,
            email: authUser.email,
            password: '' // Không có password khi sync từ Firebase
          };
          
          if (syncRoles) {
            createData.roles = authUser.roles;
          }
          
          return this.http.post<any>(`${environment.apiUrl}/users/firebase`, createData).pipe(
            map(dto => {
              const dbUser = this.mapUserDtoToAuthUser(dto);
              // Giữ nguyên roles từ Firebase Custom Claims
              return {
                ...dbUser,
                roles: syncRoles ? dbUser.roles : authUser.roles
              };
            })
          );
        }
        throw error;
      })
    );
  }

  /**
   * Map UserDto từ backend sang AuthUser
   */
  private mapUserDtoToAuthUser(dto: any): AuthUser {
    // Nếu đã là AuthUser format thì return trực tiếp
    if (dto.id && dto.firebaseUid) {
      return dto as AuthUser;
    }
    
    // Map từ UserDto format
    return {
      id: dto.userId?.toString() || dto.id || '',
      userId: dto.userId,
      firebaseUid: dto.firebaseUID || dto.firebaseUid || '',
      userName: dto.userName,
      name: dto.fullName || dto.name || dto.userName || '',
      email: dto.email || '',
      roles: this.normalizeRoles(dto.roles || []),
      isActive: dto.isActive,
      createdAt: dto.createdAt
    };
  }

  /**
   * Lấy thông tin user từ local DB dựa trên Firebase UID (fallback)
   * Chỉ dùng khi không thể lấy từ Firebase Custom Claims
   * Roles vẫn được lấy từ Firebase Custom Claims nếu có thể
   */
  private loadUserFromLocalDB(firebaseUid: string): Observable<AuthUser> {
    const firebaseUser = this.auth.currentUser;
    
    return this.http.get<any>(`${environment.apiUrl}/users/by-firebase-uid/${firebaseUid}`).pipe(
      switchMap((dto) => {
        // Cố gắng lấy roles từ Firebase Custom Claims trước
        if (firebaseUser && firebaseUser.uid === firebaseUid) {
          return from(getIdTokenResult(firebaseUser, false)).pipe(
            map((tokenResult) => {
              const claims = tokenResult.claims;
              let roles: UserRole[] = [];
              
              if (claims['roles']) {
                if (Array.isArray(claims['roles'])) {
                  roles = this.normalizeRoles(claims['roles'] as string[]);
                } else {
                  roles = this.normalizeRoles([claims['roles'] as string]);
                }
              } else {
                // Fallback về roles từ DB nếu không có Custom Claims
                const dbUser = this.mapUserDtoToAuthUser(dto);
                roles = dbUser.roles.length > 0 ? dbUser.roles : [UserRoleEnum.User];
              }
              
              // Map từ DB nhưng dùng roles từ Firebase Custom Claims
              const dbUser = this.mapUserDtoToAuthUser(dto);
              const user: AuthUser = {
                ...dbUser,
                roles: roles // Ưu tiên roles từ Firebase Custom Claims
              };
              
              this.currentUserSignal.set(user);
              localStorage.setItem('user_session', JSON.stringify(user));
              return user;
            }),
            catchError(() => {
              // Nếu không lấy được từ Firebase, dùng roles từ DB
              const user = this.mapUserDtoToAuthUser(dto);
              this.currentUserSignal.set(user);
              localStorage.setItem('user_session', JSON.stringify(user));
              return of(user);
            })
          );
        } else {
          // Nếu không có Firebase user, dùng roles từ DB
          const user = this.mapUserDtoToAuthUser(dto);
          this.currentUserSignal.set(user);
          localStorage.setItem('user_session', JSON.stringify(user));
          return of(user);
        }
      }),
      catchError((error) => {
        console.error('Error loading user from local DB:', error);
        // Nếu không tìm thấy user trong DB (404), tạo user mặc định từ Firebase
        // Nếu là lỗi khác (như network error), throw lại
        if (error.status === 404) {
          return this.createDefaultUserFromFirebase(firebaseUid);
        }
        throw error;
      })
    );
  }

  /**
   * Tạo user mặc định từ thông tin Firebase nếu chưa có trong DB
   */
  private createDefaultUserFromFirebase(firebaseUid: string): Observable<AuthUser> {
    const firebaseUser = this.auth.currentUser;
    if (!firebaseUser || firebaseUser.uid !== firebaseUid) {
      // Nếu không có Firebase user, lấy từ auth state
      return new Observable(observer => {
        onAuthStateChanged(this.auth, (user) => {
          if (user && user.uid === firebaseUid) {
            // Không tạo user nếu không có password - user đã được tạo trên Firebase
            // Chỉ sync thông tin từ Firebase
            const defaultUser = {
              name: user.displayName || user.email?.split('@')[0] || 'User',
              email: user.email || '',
              roles: [UserRoleEnum.User]
            };

            // Đồng bộ user lên local DB (API sẽ tự động tạo nếu chưa có)
            this.http.put<any>(`${environment.apiUrl}/users/by-firebase-uid/${firebaseUid}`, defaultUser).subscribe({
              next: (createdUser) => {
                const authUser = this.mapUserDtoToAuthUser(createdUser);
                this.currentUserSignal.set(authUser);
                localStorage.setItem('user_session', JSON.stringify(authUser));
                observer.next(authUser);
                observer.complete();
              },
              error: (err) => observer.error(err)
            });
          } else {
            observer.error(new Error('No Firebase user found'));
          }
        });
      });
    }

    const defaultUser = {
      name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      email: firebaseUser.email || '',
      roles: [UserRoleEnum.User]
    };

    // Đồng bộ user lên local DB (API sẽ tự động tạo nếu chưa có)
    return this.http.put<any>(`${environment.apiUrl}/users/by-firebase-uid/${firebaseUid}`, defaultUser).pipe(
      map((dto) => {
        const user = this.mapUserDtoToAuthUser(dto);
        this.currentUserSignal.set(user);
        localStorage.setItem('user_session', JSON.stringify(user));
        return user;
      })
    );
  }

  /**
   * Lấy Firebase User hiện tại
   */
  getCurrentFirebaseUser(): FirebaseUser | null {
    return this.auth.currentUser;
  }

  /**
   * Refresh ID token để lấy custom claims mới nhất từ Firebase
   * Chỉ lấy từ Firebase Custom Claims, không gọi API
   */
  refreshUserClaims(): Observable<AuthUser> {
    const firebaseUser = this.auth.currentUser;
    if (!firebaseUser) {
      throw new Error('No authenticated user');
    }
    
    // Force refresh ID token để lấy Custom Claims mới nhất
    return from(firebaseUser.getIdToken(true)).pipe(
      switchMap(() => {
        // Load lại user từ Firebase Custom Claims (không từ API)
        return this.loadUserFromFirebase(firebaseUser);
      }),
      tap((authUser) => {
        console.log('User claims refreshed from Firebase:', {
          email: authUser.email,
          roles: authUser.roles
        });
      })
    );
  }

  /**
   * Đổi mật khẩu
   * @param currentPassword Mật khẩu hiện tại (để re-authenticate)
   * @param newPassword Mật khẩu mới
   */
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    const firebaseUser = this.auth.currentUser;
    if (!firebaseUser || !firebaseUser.email) {
      throw new Error('No authenticated user');
    }

    // Re-authenticate user trước khi đổi mật khẩu
    const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
    
    return from(reauthenticateWithCredential(firebaseUser, credential)).pipe(
      switchMap(() => {
        // Sau khi re-authenticate thành công, đổi mật khẩu
        return from(updatePassword(firebaseUser, newPassword));
      }),
      catchError((error) => {
        console.error('Error changing password:', error);
        let errorMessage = 'Đổi mật khẩu thất bại.';
        
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          errorMessage = 'Mật khẩu hiện tại không đúng.';
        } else if (error.code === 'auth/weak-password') {
          errorMessage = 'Mật khẩu mới quá yếu. Vui lòng chọn mật khẩu mạnh hơn.';
        } else if (error.code === 'auth/requires-recent-login') {
          errorMessage = 'Vui lòng đăng nhập lại để đổi mật khẩu.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        throw { ...error, message: errorMessage };
      })
    );
  }
}


