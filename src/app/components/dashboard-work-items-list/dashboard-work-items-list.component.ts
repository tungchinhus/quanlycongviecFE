import { Component, Input, signal, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { WorkItem } from '../../models/machine-assignment.model';
import { SettingsService } from '../../services/settings.service';
import { MachineDetailDialogComponent, MachineDetailData } from '../machine-detail-dialog/machine-detail-dialog.component';

@Component({
  selector: 'app-dashboard-work-items-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './dashboard-work-items-list.component.html',
  styleUrl: './dashboard-work-items-list.component.css'
})
export class DashboardWorkItemsListComponent {
  private readonly settingsService = inject(SettingsService);
  private readonly dialog = inject(MatDialog);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() workItems: WorkItem[] = [];
  @Input() loading = false;
  @Input() title = 'DS Công việc (7 ngày qua)';

  // Warning days configuration
  designerWarningDays = signal<number>(2);
  reviewerWarningDays = signal<number>(1);

  constructor() {
    this.loadWarningDaysConfig();
  }

  loadWarningDaysConfig(): void {
    this.settingsService.getWarningDays().subscribe({
      next: (config) => {
        this.designerWarningDays.set(config.designerWarningDays);
        this.reviewerWarningDays.set(config.reviewerWarningDays);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading warning days config:', err);
        this.designerWarningDays.set(2);
        this.reviewerWarningDays.set(1);
      }
    });
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

  formatDate(date: string | Date | undefined): string {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('vi-VN');
  }

  getDateRowClass(item: WorkItem): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const isDesignWorkItem = item.workType === 'Core Design' || item.workType === 'Casing Design';
    const isReviewWorkItem = item.workType === 'Core Review' || item.workType === 'Casing Review';
    
    let warningDays = 0;
    if (isDesignWorkItem) {
      warningDays = this.designerWarningDays();
    } else if (isReviewWorkItem) {
      warningDays = this.reviewerWarningDays();
    } else {
      warningDays = this.designerWarningDays();
    }
    
    if (!item.deliveryDate) {
      return '';
    }
    
    const deliveryDate = new Date(item.deliveryDate);
    if (isNaN(deliveryDate.getTime())) {
      return '';
    }
    
    deliveryDate.setHours(0, 0, 0, 0);
    const daysUntilFinish = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilFinish <= warningDays) {
      return 'date-warning';
    }
    
    return '';
  }

  openTBKTDetail(item: WorkItem): void {
    if (!item.tbkt_ID) {
      return;
    }

    const machineData: MachineDetailData = {
      machineName: item.machineName || '-',
      tbktId: item.tbkt_ID,
      status: item.actualFinish ? 'completed' : 'in-progress',
      startDate: item.startDate ? (typeof item.startDate === 'string' ? item.startDate : item.startDate.toString()) : undefined
    };

    this.dialog.open(MachineDetailDialogComponent, {
      width: '900px',
      maxWidth: '90vw',
      data: machineData
    });
  }
}
