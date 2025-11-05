import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';

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
    return next(clonedRequest);
  }

  // Nếu không có token, gửi request bình thường
  return next(req);
};

