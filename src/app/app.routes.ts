import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/files',
    pathMatch: 'full'
  },
  {
    path: 'files',
    loadComponent: () => import('./components/file-management/file-list/file-list.component').then(m => m.FileListComponent)
  },
  {
    path: 'assignments',
    loadComponent: () => import('./components/work-assignment/assignment-list/assignment-list.component').then(m => m.AssignmentListComponent)
  },
  {
    path: 'assignments/new',
    loadComponent: () => import('./components/work-assignment/assignment-form/assignment-form.component').then(m => m.AssignmentFormComponent)
  },
  {
    path: 'assignments/:id',
    loadComponent: () => import('./components/work-assignment/assignment-detail/assignment-detail.component').then(m => m.AssignmentDetailComponent)
  },
  {
    path: 'approvals',
    loadComponent: () => import('./components/approval/approval-list/approval-list.component').then(m => m.ApprovalListComponent)
  },
  {
    path: 'work-items',
    loadComponent: () => import('./components/work-item/work-item-list/work-item-list.component').then(m => m.WorkItemListComponent)
  },
  {
    path: '**',
    redirectTo: '/files'
  }
];

