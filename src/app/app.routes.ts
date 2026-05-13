import { Routes } from '@angular/router';
import { authGuard } from './services/auth.guard';
import { roleGuard } from './services/role-guard';
import { UserRole } from './constants/enums';
import { SettingsPage } from './pages/settings/settings.page';

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
    component: SettingsPage,
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
    path: 'tra-cuu-files',
    loadComponent: () => import('./components/tra-cuu-files/tra-cuu-files.component').then(m => m.TraCuuFilesComponent),
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
    path: 'tiep-nhan-thong-tin',
    loadComponent: () => import('./components/tiep-nhan-thong-tin/tiep-nhan-thong-tin-list/tiep-nhan-thong-tin-list.component').then(m => m.TiepNhanThongTinListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'ho-so-thau',
    loadComponent: () => import('./components/ho-so-thau/ho-so-thau-list/ho-so-thau-list.component').then(m => m.HoSoThauListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'may-sua-chua',
    loadComponent: () => import('./components/may-sua-chua/may-sua-chua-list/may-sua-chua-list.component').then(m => m.MaySuaChuaListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'bao-cao-tuan',
    loadComponent: () => import('./components/bao-cao-tuan/bao-cao-tuan.component').then(m => m.BaoCaoTuanComponent),
    canActivate: [authGuard]
  },
  {
    path: 'bao-cao-tuan-admin',
    loadComponent: () => import('./components/bao-cao-tuan/bao-cao-tuan-admin.component').then(m => m.BaoCaoTuanAdminComponent),
    canActivate: [authGuard, roleGuard],
    data: { anyOf: [UserRole.Administrator, 'Administrator', 'Admin', UserRole.Manager, 'Manager', 'ManagerL1'] }
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

