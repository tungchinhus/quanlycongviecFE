import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService, UserRole } from './auth.service';

export interface RoleGuardData {
  roles?: UserRole[]; // all required
  anyOf?: UserRole[]; // at least one required
  redirectTo?: string | UrlTree;
}

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.parseUrl('/');
  }

  const data = route.data as RoleGuardData | undefined;
  const requiresAll = data?.roles ?? [];
  const requiresAny = data?.anyOf ?? [];

  let allowed = true;
  if (requiresAll.length > 0) {
    allowed = allowed && auth.hasRole(requiresAll);
  }
  if (requiresAny.length > 0) {
    allowed = allowed && auth.hasAnyRole(requiresAny);
  }

  if (allowed) return true;

  const fallback = data?.redirectTo ?? '/';
  return typeof fallback === 'string' ? router.parseUrl(fallback) : fallback;
};


