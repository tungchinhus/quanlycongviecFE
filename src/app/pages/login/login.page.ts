import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '../../constants/enums';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatSnackBarModule
  ],
  templateUrl: './login.page.html',
  styleUrl: './login.page.css'
})
export class LoginPage implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroy$ = new Subject<void>();

  loginForm: FormGroup;
  hidePassword = true;
  isLoading = false;
  rememberMe = false;
  errorMessage = '';
  /** Thông báo phiên hết hạn (khi redirect từ guard với expired=true - tham khảo dieuxe) */
  sessionExpiredMessage = '';

  constructor() {
    // Khôi phục username/email và mật khẩu đã lưu (khi ghi nhớ đăng nhập) nếu có
    const rememberedUsername = this.authService.getRememberedUsername();
    const rememberedPassword = this.authService.getRememberedPassword();
    
    this.loginForm = this.fb.group({
      usernameOrEmail: [rememberedUsername || '', [Validators.required]],
      password: [rememberedPassword || '', [Validators.required, Validators.minLength(6)]]
    });

    // Nếu có username đã lưu, tự động bật rememberMe
    if (rememberedUsername) {
      this.rememberMe = true;
    }

    // Nếu đã đăng nhập, chuyển hướng về đúng Dashboard dựa trên role
    if (this.authService.isAuthenticated()) {
      this.redirectToDashboard();
    }
  }

  ngOnInit(): void {
    // Hiển thị thông báo phiên hết hạn khi redirect từ guard với expired=true (tham khảo dieuxe)
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      if (params['expired'] === 'true') {
        this.sessionExpiredMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        this.snackBar.open(this.sessionExpiredMessage, 'Đóng', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });

    // Chỉ tự động đăng nhập khi có thông tin ghi nhớ và chưa đăng nhập (tự login lại - tham khảo dieuxe).
    // Sau khi bấm Logout thì remembered_* đã bị xóa nên không tự động đăng nhập lại, user có thể đăng nhập user khác.
    if (!this.authService.isAuthenticated()) {
      const rememberedUsername = this.authService.getRememberedUsername();
      const rememberedPassword = this.authService.getRememberedPassword();
      if (rememberedUsername && rememberedPassword && this.loginForm.valid) {
        this.onSubmit();
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit() {
    // Prevent multiple simultaneous login attempts
    if (this.isLoading) {
      return;
    }

    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      const { usernameOrEmail, password } = this.loginForm.value;

      // Đăng nhập qua Firebase Authentication
      // Hỗ trợ cả username và email:
      // - Nếu là email format → dùng trực tiếp
      // - Nếu là username → query từ backend để lấy email, sau đó đăng nhập Firebase
      // Truyền rememberMe flag để quyết định persistence mode
      this.authService.loginWithEmailAndPassword(usernameOrEmail, password, this.rememberMe)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
        next: (user) => {
          this.isLoading = false;
          this.snackBar.open('Đăng nhập thành công!', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          });
          this.redirectToDashboard();
        },
        error: (error) => {
          this.isLoading = false;
          
          // Xử lý các loại lỗi Firebase
          let errorMsg = 'Đăng nhập thất bại. Vui lòng thử lại.';
          
          // Xử lý lỗi từ Firebase Authentication
          if (error.code === 'auth/user-not-found') {
            errorMsg = 'Tên đăng nhập hoặc email không tồn tại.';
          } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            errorMsg = 'Tên đăng nhập/email hoặc mật khẩu không đúng.';
          } else if (error.code === 'auth/invalid-email') {
            errorMsg = 'Email không hợp lệ.';
          } else if (error.code === 'auth/too-many-requests') {
            errorMsg = 'Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau.';
          } else if (error.code === 'auth/network-request-failed') {
            errorMsg = 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet.';
          } else if (error.code === 'auth/internal-error') {
            errorMsg = 'Lỗi hệ thống. Vui lòng thử lại sau.';
          }
          // Xử lý lỗi từ backend API
          else if (error.status === 401) {
            // Sử dụng message từ auth.service nếu có, nếu không thì dùng message mặc định
            errorMsg = error.message || 'Xác thực thất bại. Token Firebase không hợp lệ hoặc backend không thể verify.';
          } else if (error.status === 403) {
            errorMsg = 'Bạn không có quyền truy cập.';
          } else if (error.status === 500) {
            // Lỗi 500 - Backend internal server error
            // Có thể do: Firebase Admin SDK chưa được khởi tạo, thiếu packages, hoặc lỗi backend
            const backendError = error.error?.message || error.error?.error || '';
            if (backendError.includes('Google.Apis.Auth') || backendError.includes('FileNotFoundException')) {
              errorMsg = 'Lỗi backend: Thiếu package Google.Apis.Auth. Vui lòng liên hệ quản trị viên.';
            } else if (backendError.includes('Firebase') || backendError.includes('FirebaseService')) {
              errorMsg = 'Lỗi backend: Firebase Admin SDK chưa được khởi tạo. Vui lòng liên hệ quản trị viên.';
            } else if (backendError) {
              errorMsg = `Lỗi server: ${backendError}`;
            } else {
              errorMsg = 'Lỗi server. Vui lòng thử lại sau hoặc liên hệ quản trị viên.';
            }
          } else if (error.status === 0 || error.status === undefined) {
            errorMsg = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
          } else if (error.error?.message) {
            errorMsg = error.error.message;
          } else if (error.message) {
            errorMsg = error.message;
          }
          
          this.errorMessage = errorMsg;
          this.snackBar.open(errorMsg, 'Đóng', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        }
      });
    } else {
      // Đánh dấu tất cả các trường là đã touched để hiển thị lỗi
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
    }
  }

  /**
   * Redirect đến returnUrl (nếu có từ guard) hoặc đúng dashboard theo role (tham khảo dieuxe).
   */
  private redirectToDashboard(): void {
    const returnUrl = this.route.snapshot.queryParams['returnUrl'] as string | undefined;
    if (returnUrl && returnUrl !== '/login' && returnUrl.startsWith('/')) {
      this.router.navigateByUrl(returnUrl);
      return;
    }
    // Kiểm tra nếu user là Manager, ManagerL1, hoặc Administrator
    const isManager = this.authService.hasAnyRole([
      UserRole.Manager,
      'Manager',
      'ManagerL1',
      'ManagerL2',
      'ManagerL3',
      UserRole.Administrator,
      'Administrator',
      'Admin'
    ]);
    if (isManager) {
      this.router.navigate(['/manager-dashboard']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}

