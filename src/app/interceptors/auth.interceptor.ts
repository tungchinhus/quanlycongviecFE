import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Lấy JWT token từ localStorage (đã được lưu sau khi login với backend)
  const token = localStorage.getItem('token');

  // Nếu có token, thêm vào Authorization header
  if (token) {
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(clonedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        // Xử lý lỗi 401 Unauthorized
        if (error.status === 401) {
          // Xóa token và user session
          localStorage.removeItem('token');
          localStorage.removeItem('user_session');
          
          // Sử dụng window.location để redirect (không cần inject Router)
          // Chỉ redirect nếu không phải đang ở trang login
          const currentUrl = window.location.pathname;
          if (!currentUrl.includes('/login')) {
            window.location.href = '/login';
          }
        }
        return throwError(() => error);
      })
    );
  }

  // Nếu không có token, gửi request bình thường
  return next(req);
};

