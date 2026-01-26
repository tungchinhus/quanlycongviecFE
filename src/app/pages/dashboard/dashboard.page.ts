import { Component, inject, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { DashboardService, DashboardStats } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '../../constants/enums';
import { WorkItem } from '../../models/machine-assignment.model';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatTooltipModule,
    MatTableModule,
    MatChipsModule
  ],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.css'
})
export class DashboardPage implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly settingsService = inject(SettingsService);
  readonly auth = inject(AuthService);

  stats = signal<DashboardStats | null>(null);
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

    this.dashboardService.getUserStats().subscribe({
      next: (data) => {
        // Debug: Log recent machines để kiểm tra format
        if (data.recent?.machines) {
          console.log('Recent machines data:', data.recent.machines);
          console.log('First machine:', data.recent.machines[0]);
        }
        this.stats.set(data);
        this.loading.set(false);
        // Force change detection
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading dashboard data:', err);
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
        // Debug: Log để kiểm tra deliveryDate
        console.log('Work items received:', workItems);
        workItems.forEach(item => {
          console.log(`WorkItem ${item.workItemID}: deliveryDate = ${item.deliveryDate}, expectedFinish = ${item.expectedFinish}`);
        });
        
        // Hiển thị tất cả work items, không filter theo ngày
        // Mục đích: xem tổng quan công việc trong 7 ngày qua (đã filter ở backend)
        
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

  isManager(): boolean {
    // ManagerL2 được xem là user thường, không hiển thị card "Phân công"
    return this.auth.hasAnyRole([
      UserRole.Manager,
      'Manager',
      'ManagerL1',
      'ManagerL3'
    ]);
  }

  getPendingWorkItemsTooltip(): string {
    const stats = this.stats();
    if (!stats || !stats.workItems) {
      return 'Chờ xử lý';
    }
    
    // Nếu không có công việc đang xử lý, hiển thị "Chờ xử lý"
    if (stats.workItems.pending === 0) {
      return 'Chờ xử lý';
    }
    
    const pendingList = stats.workItems.pendingList;
    
    // Nếu không có danh sách hoặc danh sách rỗng, nhưng có pending > 0, vẫn hiển thị thông báo
    if (!pendingList || pendingList.length === 0) {
      return `Có ${stats.workItems.pending} công việc đang chờ xử lý`;
    }
    
    // Tạo tooltip từ danh sách
    const tooltipItems = pendingList
      .map(item => {
        const workType = item?.WorkType || 'Không xác định';
        const machineName = item?.MachineName || 'Không xác định';
        return `• ${workType} - ${machineName}`;
      });
    
    return tooltipItems.join('\n');
  }

  navigateToWorkItems(): void {
    this.router.navigate(['/work-items']);
  }

  // Helper methods for department work items
  getDepartmentName(dept: string): string {
    const names: { [key: string]: string } = {
      'design': 'Thiết kế',
      'shell': 'Vỏ',
      'interior': 'Ruột',
      'materials': 'Vật tư'
    };
    return names[dept] || dept;
  }

  getWorkTypeDisplayName(workType: string | undefined): string {
    if (!workType) return 'Không xác định';
    const workTypeMap: { [key: string]: string } = {
      'Core Design': 'Thiết kế ruột',
      'Casing Design': 'Thiết kế vỏ',
      'Core Review': 'Kiểm soát ruột',
      'Casing Review': 'Kiểm soát vỏ',
      'Material Leveling': 'Cân bằng vật tư'
    };
    return workTypeMap[workType] || workType;
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

  getWorkItemStatus(item: WorkItem): { label: string; color: string } {
    if (item.actualFinish) {
      return { label: 'Hoàn thành', color: 'primary' };
    }
    if (item.personConfirmation) {
      return { label: 'Đã xác nhận', color: 'accent' };
    }
    if (item.expectedFinish) {
      const expected = new Date(item.expectedFinish);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expected < today) {
        return { label: 'Quá hạn', color: 'warn' };
      }
    }
    return { label: 'Đang xử lý', color: '' };
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
    
    // Debug log
    console.log(`WorkItem ${item.workItemID}: today=${today.toLocaleDateString('vi-VN')}, deliveryDate=${deliveryDate.toLocaleDateString('vi-VN')}, daysUntilFinish=${daysUntilFinish}, warningDays=${warningDays}`);
    
    // Cảnh báo CHỈ KHI: còn <= X ngày nữa (từ cấu hình) hoặc đã quá hạn
    // Ví dụ: nếu warningDays = 2 và ngày hiện tại là 06/01/2026:
    // - Ngày hoàn thành 31/1/2026: còn 25 ngày > 2 ngày => KHÔNG cảnh báo
    // - Ngày hoàn thành 08/01/2026: còn 2 ngày = 2 ngày => CẢNH BÁO
    // - Ngày hoàn thành 07/01/2026: còn 1 ngày < 2 ngày => CẢNH BÁO
    // - Ngày hoàn thành 05/01/2026: đã quá hạn (âm) => CẢNH BÁO
    if (daysUntilFinish <= warningDays) {
      return 'date-warning';
    }
    
    return '';
  }

  getMachineName(machine: any): string {
    // Hỗ trợ cả format cũ (string) và format mới (object)
    if (typeof machine === 'string') {
      return machine;
    }
    const machineName = machine?.machineName || machine || '-';
    const tbktId = machine?.tbktId;
    
    // Nếu có TBKT_ID, hiển thị dạng "TBKT_ID - MachineName"
    if (tbktId && tbktId.trim() !== '') {
      return `${tbktId}-${machineName}`;
    }
    
    return machineName;
  }

  getMachineStatus(machine: any): 'new' | 'in-progress' | 'completed' {
    // Hỗ trợ cả format cũ (string) và format mới (object)
    if (typeof machine === 'string') {
      return 'in-progress'; // Mặc định cho format cũ
    }
    return machine?.status || 'in-progress';
  }

  getMachineKey(machine: any): string {
    // Hỗ trợ cả format cũ (string) và format mới (object)
    if (typeof machine === 'string') {
      return machine;
    }
    return machine?.machineName || String(machine);
  }

}

