import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { WorkItem } from '../models/machine-assignment.model';

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
    machines: Array<{
      machineName: string;
      tbktId?: string;
      status: 'new' | 'in-progress' | 'completed';
      startDate?: string;
    }> | string[]; // Hỗ trợ cả format cũ (string[]) và format mới (object[])
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

  /**
   * Lấy work items theo bộ phận trong 1 tuần qua
   * @param department Bộ phận: 'design' | 'shell' | 'interior' | 'materials'
   * @param allUsers Nếu true, lấy tất cả work items của tất cả users, không chỉ user hiện tại
   * @returns Observable<WorkItem[]>
   */
  getWorkItemsByDepartment(department: 'design' | 'shell' | 'interior' | 'materials', allUsers: boolean = true): Observable<WorkItem[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // 7 ngày trước

    // Map bộ phận sang work types
    const workTypeMap: { [key: string]: string[] } = {
      'design': ['Core Design', 'Casing Design'],
      'shell': ['Casing Design', 'Casing Review'],
      'interior': ['Core Design', 'Core Review'],
      'materials': ['Material Leveling']
    };

    const workTypes = workTypeMap[department] || [];
    
    // Build query string
    let queryString = `startDate=${encodeURIComponent(startDate.toISOString())}&endDate=${encodeURIComponent(endDate.toISOString())}&allUsers=${allUsers}`;
    
    if (workTypes.length > 0) {
      workTypes.forEach(type => {
        queryString += `&workTypes=${encodeURIComponent(type)}`;
      });
    }

    return this.http.get<WorkItem[]>(`${environment.apiUrl}/work-items/by-date-range?${queryString}`);
  }

  /**
   * Lấy tất cả work items của user thiết kế, kiểm soát, vật tư trong 7 ngày qua
   * Bao gồm: Core Design, Casing Design, Core Review, Casing Review, Material Leveling
   * @param allUsers Nếu true, lấy tất cả work items của tất cả users, không chỉ user hiện tại
   * @returns Observable<WorkItem[]>
   */
  getAllWorkItemsForDashboard(allUsers: boolean = true, skipDateFilter: boolean = false): Observable<WorkItem[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // 7 ngày trước

    // Tất cả work types cần hiển thị: thiết kế, kiểm soát, vật tư
    const workTypes = [
      'Core Design',      // Thiết kế ruột
      'Casing Design',    // Thiết kế vỏ
      'Core Review',      // Kiểm soát ruột
      'Casing Review',    // Kiểm soát vỏ
      'Material Leveling' // Vật tư
    ];
    
    // Build query string
    let queryString = `startDate=${encodeURIComponent(startDate.toISOString())}&endDate=${encodeURIComponent(endDate.toISOString())}&allUsers=${allUsers}&skipDateFilter=${skipDateFilter}`;
    
    workTypes.forEach(type => {
      queryString += `&workTypes=${encodeURIComponent(type)}`;
    });

    return this.http.get<WorkItem[]>(`${environment.apiUrl}/work-items/by-date-range?${queryString}`);
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

