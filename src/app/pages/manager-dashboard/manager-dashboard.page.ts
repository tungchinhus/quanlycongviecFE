import { Component, inject, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DashboardService, ManagerDashboardStats } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';
import { WorkItem } from '../../models/machine-assignment.model';
import { DashboardWorkItemsListComponent } from '../../components/dashboard-work-items-list/dashboard-work-items-list.component';

@Component({
  selector: 'app-manager-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatTooltipModule,
    DashboardWorkItemsListComponent
  ],
  templateUrl: './manager-dashboard.page.html',
  styleUrl: './manager-dashboard.page.css'
})
export class ManagerDashboardPage implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly auth = inject(AuthService);

  stats = signal<ManagerDashboardStats | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  
  // All work items for past week (combined from all departments)
  allWorkItems = signal<WorkItem[]>([]);
  loadingDepartmentWorkItems = signal(false);

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading.set(true);
    this.error.set(null);

    this.dashboardService.getManagerStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error.set('Không thể tải dữ liệu dashboard. Vui lòng thử lại sau.');
        this.loading.set(false);
      }
    });

    // Load work items by department
    this.loadDepartmentWorkItems();
  }

  loadDepartmentWorkItems(): void {
    this.loadingDepartmentWorkItems.set(true);
    
    // Lấy tất cả work items của user thiết kế, kiểm soát, vật tư
    // Bao gồm: Core Design, Casing Design, Core Review, Casing Review, Material Leveling
    // allUsers = true để lấy tất cả users, không chỉ user hiện tại
    // skipDateFilter = true để hiển thị tất cả, không filter theo ngày (mục đích xem tổng quan)
    this.dashboardService.getAllWorkItemsForDashboard(true, true).subscribe({
      next: (workItems) => {
        // Sắp xếp theo ngày bắt đầu (mới nhất trước)
        workItems.sort((a, b) => {
          const dateA = a.startDate ? new Date(a.startDate).getTime() : 
                       (a.expectedFinish ? new Date(a.expectedFinish).getTime() : 
                       (a.actualFinish ? new Date(a.actualFinish).getTime() : 0));
          const dateB = b.startDate ? new Date(b.startDate).getTime() : 
                       (b.expectedFinish ? new Date(b.expectedFinish).getTime() : 
                       (b.actualFinish ? new Date(b.actualFinish).getTime() : 0));
          return dateB - dateA;
        });
        
        // Lưu vào signal để hiển thị
        this.allWorkItems.set(workItems);
        this.loadingDepartmentWorkItems.set(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading work items:', err);
        this.loadingDepartmentWorkItems.set(false);
        this.allWorkItems.set([]);
      }
    });
  }

  refresh(): void {
    this.loadDashboardData();
  }

  navigateToApprovals(): void {
    this.router.navigate(['/approvals']);
  }

  navigateToAssignments(): void {
    this.router.navigate(['/assignments']);
  }


}
