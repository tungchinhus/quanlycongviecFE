import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DashboardStats {
  user: {
    userId: number;
    userName: string;
    fullName: string;
    email: string;
  };
  workItems: {
    total: number;
    completed: number;
    pending: number;
    confirmed: number;
    overdue: number;
    completionRate: number;
    pendingList: Array<{
      WorkItemID: number;
      WorkType: string;
      AssignmentID: number;
      MachineName: string;
    }>;
    confirmedMachines: string[];
  };
  assignments: {
    total: number;
    new: number;
    inProgress: number;
    completed: number;
  };
  recent: {
    last7Days: number;
    machines: string[];
  };
  byType: Array<{
    WorkType: string;
    Count: number;
  }>;
  monthly: Array<{
    Month: string;
    MonthName: string;
    Total: number;
    Completed: number;
    Pending: number;
  }>;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  getUserStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${environment.apiUrl}/dashboard/stats`);
  }

  getManagerStats(): Observable<ManagerDashboardStats> {
    return this.http.get<ManagerDashboardStats>(`${environment.apiUrl}/dashboard/manager-stats`);
  }
}

export interface ManagerDashboardStats {
  user: {
    userId: number;
    userName: string;
    fullName: string;
    email: string;
  };
  overview: {
    totalTechnicalSheets: number;
    totalWorkItems: number;
    totalAssignments: number;
  };
  workItems: {
    total: number;
    completed: number;
    pending: number;
    confirmed: number;
    overdue: number;
    completionRate: number;
  };
  assignments: {
    New: number;
    InProgress: number;
    Completed: number;
  };
  approvalWorkflow: {
    total: number;
    managerL1: {
      pending: number;
      approved: number;
      rejected: number;
    };
    manager: {
      pending: number;
      approved: number;
      rejected: number;
    };
    fullyApproved: number;
  };
  byType: Array<{
    WorkType: string;
    Count: number;
  }>;
  monthly: Array<{
    Month: string;
    MonthName: string;
    Total: number;
    Completed: number;
    Pending: number;
  }>;
  approvalMonthly: Array<{
    Month: string;
    MonthName: string;
    ManagerL1Approved: number;
    ManagerL1Rejected: number;
    ManagerApproved: number;
    ManagerRejected: number;
  }>;
  topUsers: Array<{
    PersonName: string;
    Total: number;
    Completed: number;
    Pending: number;
  }>;
}

