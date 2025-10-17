import { Routes } from '@angular/router';
import { roleGuard } from './services/role-guard';

export const routes: Routes = [
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin.page').then(m => m.AdminPage),
    canActivate: [roleGuard],
    data: {
      roles: ['Administrator']
    }
  },
  {
    path: 'users',
    loadComponent: () => import('./pages/users/users.page').then(m => m.UsersPage),
    canActivate: [roleGuard],
    data: { roles: ['Administrator'] }
  },
  { path: '', pathMatch: 'full', redirectTo: 'admin' },
  { path: '**', redirectTo: '' }
];
