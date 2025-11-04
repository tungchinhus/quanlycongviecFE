import { Injectable, inject, signal } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export type UserRole = 'Administrator' | 'Manager' | 'User' | 'Guest';

export interface AuthUser {
  id: string;
  firebaseUid: string;
  name: string;
  email: string;
  roles: UserRole[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly http = inject(HttpClient);
  private readonly currentUserSignal = signal<AuthUser | null>(null);

  constructor() {
    // Theo dõi trạng thái đăng nhập Firebase
    onAuthStateChanged(this.auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Lấy thông tin user từ local DB
        this.loadUserFromLocalDB(firebaseUser.uid).subscribe({
          error: (error) => {
            console.error('Error loading user from local DB on auth state change:', error);
          }
        });
      } else {
        this.currentUserSignal.set(null);
        localStorage.removeItem('user_session');
      }
    });
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

  /**
   * Đăng nhập với email và password qua Firebase
   */
  loginWithEmailAndPassword(email: string, password: string): Observable<AuthUser> {
    return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap((userCredential) => {
        const firebaseUser = userCredential.user;
        // Lấy thông tin user từ local DB
        return this.loadUserFromLocalDB(firebaseUser.uid).pipe(
          map(() => this.currentUserSignal()!),
          catchError((error) => {
            console.error('Error loading user from local DB:', error);
            throw error;
          })
        );
      }),
      catchError((error) => {
        console.error('Login error:', error);
        throw error;
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
      })
    );
  }

  /**
   * Lấy thông tin user từ local DB dựa trên Firebase UID
   */
  private loadUserFromLocalDB(firebaseUid: string): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${environment.apiUrl}/users/by-firebase-uid/${firebaseUid}`).pipe(
      map((user) => {
        this.currentUserSignal.set(user);
        localStorage.setItem('user_session', JSON.stringify(user));
        return user;
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
            const defaultUser: Partial<AuthUser> = {
              firebaseUid: firebaseUid,
              name: user.displayName || user.email?.split('@')[0] || 'User',
              email: user.email || '',
              roles: ['User']
            };

            // Tạo user trong local DB
            this.http.post<AuthUser>(`${environment.apiUrl}/users`, defaultUser).subscribe({
              next: (createdUser) => {
                this.currentUserSignal.set(createdUser);
                localStorage.setItem('user_session', JSON.stringify(createdUser));
                observer.next(createdUser);
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

    const defaultUser: Partial<AuthUser> = {
      firebaseUid: firebaseUid,
      name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      email: firebaseUser.email || '',
      roles: ['User']
    };

    // Tạo user trong local DB
    return this.http.post<AuthUser>(`${environment.apiUrl}/users`, defaultUser).pipe(
      map((user) => {
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
}


