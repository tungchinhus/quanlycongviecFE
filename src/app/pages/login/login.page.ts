import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

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
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  loginForm: FormGroup;
  hidePassword = true;
  isLoading = false;
  rememberMe = false;
  errorMessage = '';

  constructor() {
    this.loginForm = this.fb.group({
      usernameOrEmail: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // Nếu đã đăng nhập, chuyển hướng về trang chính
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/files']);
    }
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      const { usernameOrEmail, password } = this.loginForm.value;

      // Đăng nhập qua Firebase Authentication (hỗ trợ cả username và email)
      this.authService.loginWithEmailAndPassword(usernameOrEmail, password).subscribe({
        next: (user) => {
          this.isLoading = false;
          this.snackBar.open('Đăng nhập thành công!', 'Đóng', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          });
          this.router.navigate(['/files']);
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Login error:', error);
          
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
          }
          // Xử lý lỗi từ backend API
          else if (error.status === 401) {
            errorMsg = 'Xác thực thất bại. Vui lòng kiểm tra lại thông tin đăng nhập.';
          } else if (error.status === 403) {
            errorMsg = 'Bạn không có quyền truy cập.';
          } else if (error.status === 500) {
            errorMsg = 'Lỗi server. Vui lòng thử lại sau.';
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
}

