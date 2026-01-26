import { Routes } from '@angular/router';
import { authGuard } from './services/auth.guard';
import { roleGuard } from './services/role-guard';
import { UserRole } from './constants/enums';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/dashboard-redirect/dashboard-redirect.component').then(m => m.DashboardRedirectComponent),
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.page').then(m => m.DashboardPage),
    canActivate: [authGuard]
  },
  {
    path: 'manager-dashboard',
    loadComponent: () => import('./pages/manager-dashboard/manager-dashboard.page').then(m => m.ManagerDashboardPage),
    canActivate: [authGuard, roleGuard],
    data: { anyOf: [UserRole.Administrator, UserRole.Manager, 'Manager', 'ManagerL1'] }
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
    canActivate: [authGuard, roleGuard],
    data: { anyOf: [UserRole.Administrator, UserRole.Manager] }
  },
  {
    path: 'assignments/:id',
    loadComponent: () => import('./components/work-assignment/assignment-detail/assignment-detail.component').then(m => m.AssignmentDetailComponent),
    canActivate: [authGuard]
  },
  {
    path: 'approvals',
    loadComponent: () => import('./components/tbkt-approval/tbkt-approval-list/tbkt-approval-list.component').then(m => m.TBKTApprovalListComponent),
    canActivate: [authGuard, roleGuard],
    data: { anyOf: [UserRole.Administrator, 'Administrator', 'Admin', UserRole.Manager, 'Manager', 'ManagerL1'] }
  },
  {
    path: 'approval-workflow',
    loadComponent: () => import('./components/approval-workflow/approval-workflow-list/approval-workflow-list.component').then(m => m.ApprovalWorkflowListComponent),
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
    data: { roles: [UserRole.Administrator] }
  },
  {
    path: 'roles',
    loadComponent: () => import('./pages/roles/roles.page').then(m => m.RolesPage),
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.Administrator] }
  },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin.page').then(m => m.AdminPage),
    canActivate: [authGuard]
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.page').then(m => m.SettingsPage),
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.Administrator] }
  },
  {
    path: 'page-permissions',
    loadComponent: () => import('./pages/page-permissions/page-permissions.page').then(m => m.PagePermissionsPage),
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.Administrator] }
  },
  {
    path: 'excel-reader',
    loadComponent: () => import('./components/excel-reader/excel-reader.component').then(m => m.ExcelReaderComponent),
    canActivate: [authGuard]
  },
  {
    path: 'tsmay',
    loadComponent: () => import('./components/tsmay/tsmay-list/tsmay-list.component').then(m => m.TSMayListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'tbkt-list',
    loadComponent: () => import('./pages/tbkt-list/tbkt-list.page').then(m => m.TBKTListPage),
    canActivate: [authGuard]
  },
  {
    path: 'tbkt-management',
    loadComponent: () => import('./components/tbkt-management/tbkt-management.component').then(m => m.TBKTManagementComponent),
    canActivate: [authGuard]
  },
  {
    path: 'personal-info',
    loadComponent: () => import('./pages/personal-info/personal-info.page').then(m => m.PersonalInfoPage),
    canActivate: [authGuard]
  },
  {
    path: '**',
    loadComponent: () => import('./components/dashboard-redirect/dashboard-redirect.component').then(m => m.DashboardRedirectComponent)
  }
];

