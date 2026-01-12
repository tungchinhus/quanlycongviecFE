import { Component, inject, OnInit, signal, ChangeDetectorRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DashboardService, ManagerDashboardStats } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { Chart, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

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
    BaseChartDirective
  ],
  templateUrl: './manager-dashboard.page.html',
  styleUrl: './manager-dashboard.page.css'
})
export class ManagerDashboardPage implements OnInit, AfterViewInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly auth = inject(AuthService);

  @ViewChild('approvalChart') approvalChart?: BaseChartDirective;

  stats = signal<ManagerDashboardStats | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  // Approval Workflow Chart (Doughnut)
  public approvalChartType: 'doughnut' = 'doughnut';
  public approvalChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [
        '#4caf50', // Fully Approved
        '#2196f3', // ManagerL1 Approved
        '#ff9800', // ManagerL1 Pending
        '#f44336', // Rejected
        '#9e9e9e'  // Other
      ]
    }]
  };
  public approvalChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      },
      title: {
        display: true,
        text: 'Trạng thái phê duyệt TBKT'
      }
    }
  };



  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    // Chart initialization handled in updateCharts
  }

  loadDashboardData(): void {
    this.loading.set(true);
    this.error.set(null);

    this.dashboardService.getManagerStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.updateCharts(data);
        this.loading.set(false);
        this.cdr.detectChanges();
        setTimeout(() => {
          this.updateAllCharts();
        }, 200);
      },
      error: (err) => {
        console.error('Error loading manager dashboard data:', err);
        this.error.set('Không thể tải dữ liệu dashboard. Vui lòng thử lại sau.');
        this.loading.set(false);
      }
    });
  }

  private updateAllCharts(): void {
    const charts = [
      this.approvalChart
    ];

    charts.forEach(chart => {
      if (chart?.chart) {
        try {
          chart.chart.update();
        } catch (error) {
          console.error('Error updating chart:', error);
        }
      }
    });
  }

  private updateCharts(data: ManagerDashboardStats): void {
    // Update approval workflow chart
    if (data.approvalWorkflow) {
      const approval = data.approvalWorkflow;
      this.approvalChartData = {
        labels: [
          'Đã duyệt hoàn toàn',
          'ManagerL1 đã duyệt',
          'Chờ ManagerL1',
          'Đã từ chối',
          'Khác'
        ],
        datasets: [{
          data: [
            approval.fullyApproved,
            approval.managerL1.approved - approval.fullyApproved,
            approval.managerL1.pending,
            approval.managerL1.rejected + approval.manager.rejected,
            approval.total - approval.managerL1.approved - approval.managerL1.pending - approval.managerL1.rejected
          ],
          backgroundColor: [
            '#4caf50',
            '#2196f3',
            '#ff9800',
            '#f44336',
            '#9e9e9e'
          ]
        }]
      };
    }

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
