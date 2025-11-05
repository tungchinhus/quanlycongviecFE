import { Routes } from '@angular/router';
import { authGuard } from './services/auth.guard';
import { roleGuard } from './services/role-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/files',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'files',
    loadComponent: () => import('./components/file-management/file-list/file-list.component').then(m => m.FileListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'assignments',
    loadComponent: () => import('./components/work-assignment/assignment-list/assignment-list.component').then(m => m.AssignmentListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'assignments/new',
    loadComponent: () => import('./components/work-assignment/assignment-form/assignment-form.component').then(m => m.AssignmentFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'assignments/:id',
    loadComponent: () => import('./components/work-assignment/assignment-detail/assignment-detail.component').then(m => m.AssignmentDetailComponent),
    canActivate: [authGuard]
  },
  {
    path: 'approvals',
    loadComponent: () => import('./components/approval/approval-list/approval-list.component').then(m => m.ApprovalListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'work-items',
    loadComponent: () => import('./components/work-item/work-item-list/work-item-list.component').then(m => m.WorkItemListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'users',
    loadComponent: () => import('./pages/users/users.page').then(m => m.UsersPage),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Administrator'] }
  },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin.page').then(m => m.AdminPage),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: '/files'
  }
];

