import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Guard kiểm tra đăng nhập và token còn hạn (tham khảo dieuxe).
 * Nếu token hết hạn: xóa session, redirect về login với returnUrl và expired=true để có thể tự đăng nhập lại.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url }
    });
  }

  // Kiểm tra token còn hạn (timeout session - tham khảo dieuxe)
  if (!authService.isTokenValid()) {
    authService.clearSessionBecauseExpired();
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url, expired: 'true' }
    });
  }

  return true;
};

