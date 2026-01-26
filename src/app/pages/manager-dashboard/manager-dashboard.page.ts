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
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-manager-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatTooltipModule
  ],
  templateUrl: './manager-dashboard.page.html',
  styleUrl: './manager-dashboard.page.css'
})
export class ManagerDashboardPage implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly settingsService = inject(SettingsService);
  readonly auth = inject(AuthService);

  stats = signal<ManagerDashboardStats | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  
  // All work items for past week (combined from all departments)
  allWorkItems = signal<WorkItem[]>([]);
  loadingDepartmentWorkItems = signal(false);

  // Warning days configuration
  designerWarningDays = signal<number>(2); // Default: 2 days
  reviewerWarningDays = signal<number>(1); // Default: 1 day



  ngOnInit(): void {
    this.loadWarningDaysConfig();
    this.loadDashboardData();
  }

  loadWarningDaysConfig(): void {
    this.settingsService.getWarningDays().subscribe({
      next: (config) => {
        this.designerWarningDays.set(config.designerWarningDays);
        this.reviewerWarningDays.set(config.reviewerWarningDays);
      },
      error: (err) => {
        console.error('Error loading warning days config:', err);
        // Use defaults if error
        this.designerWarningDays.set(2);
        this.reviewerWarningDays.set(1);
      }
    });
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
    // Reload warning days config để đảm bảo có cấu hình mới nhất từ settings
    this.loadWarningDaysConfig();
    this.loadDashboardData();
  }

  navigateToApprovals(): void {
    this.router.navigate(['/approvals']);
  }

  navigateToAssignments(): void {
    this.router.navigate(['/assignments']);
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('vi-VN');
  }

  getDateRowClass(item: WorkItem): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Xác định loại workitem để áp dụng đúng số ngày warning từ cấu hình
    const isDesignWorkItem = item.workType === 'Core Design' || item.workType === 'Casing Design';
    const isReviewWorkItem = item.workType === 'Core Review' || item.workType === 'Casing Review';
    
    // Lấy số ngày cảnh báo từ cấu hình trong phần cài đặt
    let warningDays = 0;
    if (isDesignWorkItem) {
      // User thiết kế: cảnh báo trước X ngày so với ngày hoàn thành của TBKT tổng
      warningDays = this.designerWarningDays();
    } else if (isReviewWorkItem) {
      // User kiểm soát: cảnh báo trước X ngày so với ngày hoàn thành của TBKT tổng
      warningDays = this.reviewerWarningDays();
    } else {
      // Mặc định dùng designer warning days cho các workitem khác (Material Leveling, etc.)
      warningDays = this.designerWarningDays();
    }
    
    // Kiểm tra warning CHỈ dựa trên ngày hoàn thành của TBKT tổng (DeliveryDate từ MachineAssignment)
    // Bắt buộc phải có deliveryDate mới kiểm tra cảnh báo
    if (!item.deliveryDate) {
      return ''; // Không có deliveryDate thì không cảnh báo
    }
    
    const deliveryDate = new Date(item.deliveryDate);
    if (isNaN(deliveryDate.getTime())) {
      console.warn(`Invalid deliveryDate for WorkItem ${item.workItemID}: ${item.deliveryDate}`);
      return ''; // Invalid date thì không cảnh báo
    }
    
    deliveryDate.setHours(0, 0, 0, 0);
    
    // Tính số ngày còn lại đến ngày hoàn thành của TBKT tổng
    const daysUntilFinish = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Cảnh báo CHỈ KHI: còn <= X ngày nữa (từ cấu hình) hoặc đã quá hạn
    if (daysUntilFinish <= warningDays) {
      return 'date-warning';
    }
    
    return '';
  }

  getRoleDisplayName(workType: string | undefined): string {
    if (!workType) return '-';
    const roleMap: { [key: string]: string } = {
      'Core Design': 'tk ruột',
      'Casing Design': 'tk vỏ',
      'Core Review': 'ks ruột',
      'Casing Review': 'ks vỏ',
      'Material Leveling': 'vật tư'
    };
    return roleMap[workType] || '-';
  }

}
