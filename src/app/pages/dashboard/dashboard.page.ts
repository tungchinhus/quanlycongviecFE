import { Component, inject, OnInit, signal, ChangeDetectorRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DashboardService, DashboardStats } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '../../constants/enums';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { Chart, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

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
    BaseChartDirective
  ],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.css'
})
export class DashboardPage implements OnInit, AfterViewInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly auth = inject(AuthService);

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  stats = signal<DashboardStats | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  // Chart configurations
  public monthlyChartType: 'line' = 'line';
  public monthlyChartData: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        label: 'Tổng số',
        data: [],
        borderColor: '#2196f3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        tension: 0.4
      },
      {
        label: 'Hoàn thành',
        data: [],
        borderColor: '#4caf50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        tension: 0.4
      },
      {
        label: 'Đang xử lý',
        data: [],
        borderColor: '#ff9800',
        backgroundColor: 'rgba(255, 152, 0, 0.1)',
        tension: 0.4
      }
    ]
  };
  public monthlyChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    resizeDelay: 0,
    plugins: {
      legend: {
        position: 'bottom'
      },
      title: {
        display: true,
        text: 'Thống kê theo tháng (6 tháng gần nhất)'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 0
        }
      }
    },
    layout: {
      padding: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
      }
    }
  };

  public workTypeChartType: 'pie' = 'pie';
  public workTypeChartData: ChartData<'pie'> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [
        '#2196f3',
        '#4caf50',
        '#ff9800',
        '#f44336',
        '#9c27b0',
        '#00bcd4',
        '#ffeb3b',
        '#795548'
      ]
    }]
  };
  public workTypeChartOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      },
      title: {
        display: true,
        text: 'Phân loại công việc'
      }
    }
  };

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    // Đảm bảo chart được render sau khi view init
  }

  loadDashboardData(): void {
    this.loading.set(true);
    this.error.set(null);

    this.dashboardService.getUserStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.updateCharts(data);
        this.loading.set(false);
        // Force change detection
        this.cdr.detectChanges();
        // Đợi DOM render xong rồi update chart
        setTimeout(() => {
          if (this.chart?.chart) {
            try {
              this.chart.chart.update();
            } catch (error) {
              console.error('Error updating chart:', error);
            }
          }
        }, 200);
      },
      error: (err) => {
        console.error('Error loading dashboard data:', err);
        this.error.set('Không thể tải dữ liệu dashboard. Vui lòng thử lại sau.');
        this.loading.set(false);
      }
    });
  }

  private updateCharts(data: DashboardStats): void {
    // Update monthly chart - tạo object mới hoàn toàn để trigger change detection
    if (data.monthly && data.monthly.length > 0) {
      const monthLabels = data.monthly.map(m => m.MonthName);
      const totalData = data.monthly.map(m => m.Total || 0);
      const completedData = data.monthly.map(m => m.Completed || 0);
      const pendingData = data.monthly.map(m => m.Pending || 0);
      
      // Tạo object mới hoàn toàn để đảm bảo change detection hoạt động
      const newChartData: ChartData<'line'> = {
        labels: monthLabels,
        datasets: [
          {
            label: 'Tổng số',
            data: totalData,
            borderColor: '#2196f3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Hoàn thành',
            data: completedData,
            borderColor: '#4caf50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Đang xử lý',
            data: pendingData,
            borderColor: '#ff9800',
            backgroundColor: 'rgba(255, 152, 0, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      };
      
      this.monthlyChartData = newChartData;
      
      // Log để debug
      console.log('Chart data updated:', {
        labels: monthLabels,
        totalData,
        completedData,
        pendingData
      });
    } else {
      // Nếu không có dữ liệu, set về empty
      this.monthlyChartData = {
        labels: [],
        datasets: [
          {
            label: 'Tổng số',
            data: [],
            borderColor: '#2196f3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            tension: 0.4
          },
          {
            label: 'Hoàn thành',
            data: [],
            borderColor: '#4caf50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            tension: 0.4
          },
          {
            label: 'Đang xử lý',
            data: [],
            borderColor: '#ff9800',
            backgroundColor: 'rgba(255, 152, 0, 0.1)',
            tension: 0.4
          }
        ]
      };
    }

    // Update work type chart
    if (data.byType && data.byType.length > 0) {
      this.workTypeChartData = {
        labels: data.byType.map(t => t.WorkType || 'Không xác định'),
        datasets: [{
          data: data.byType.map(t => t.Count || 0),
          backgroundColor: [
            '#2196f3',
            '#4caf50',
            '#ff9800',
            '#f44336',
            '#9c27b0',
            '#00bcd4',
            '#ffeb3b',
            '#795548'
          ]
        }]
      };
    }
  }

  refresh(): void {
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
}

