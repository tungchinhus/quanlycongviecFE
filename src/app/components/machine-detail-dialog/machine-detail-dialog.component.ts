import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AssignmentService } from '../../services/assignment.service';
import { UsersService } from '../../services/users.service';
import { AuthUser } from '../../services/auth.service';
import { TechnicalSheet, MachineAssignment, WorkItem } from '../../models/machine-assignment.model';
import { forkJoin } from 'rxjs';

export interface MachineDetailData {
  machineName: string;
  tbktId?: string;
  status: 'new' | 'in-progress' | 'completed';
  startDate?: string;
}

@Component({
  selector: 'app-machine-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './machine-detail-dialog.component.html',
  styleUrls: ['./machine-detail-dialog.component.css']
})
export class MachineDetailDialogComponent implements OnInit {
  technicalSheet: TechnicalSheet | null = null;
  isLoading = true;
  error: string | null = null;
  coreDesignerName: string = '-';
  casingDesignerName: string = '-';
  materialLevelingName: string = '-';
  /** Ngày giao hàng từ bảng MachineAssignment (ưu tiên hơn TechnicalSheet). */
  deliveryDateFromAssignment: Date | string | null = null;
  users: AuthUser[] = [];

  constructor(
    private dialogRef: MatDialogRef<MachineDetailDialogComponent>,
    private assignmentService: AssignmentService,
    private usersService: UsersService,
    @Inject(MAT_DIALOG_DATA) public data: MachineDetailData
  ) {}

  ngOnInit(): void {
    if (this.data.tbktId) {
      this.loadTechnicalSheet();
    } else {
      this.isLoading = false;
      this.error = 'Không có thông tin TBKT';
    }
  }

  loadTechnicalSheet(): void {
    if (!this.data.tbktId) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.error = null;

    // Load users trước, sau đó load TechnicalSheet và Assignments
    this.usersService.loadUsers(1, 100).subscribe({
      next: (users) => {
        this.users = users;
        this.loadTechnicalSheetData();
      },
      error: (err) => {
        // Nếu không load được users, vẫn tiếp tục load data
        this.loadTechnicalSheetData();
      }
    });
  }

  private loadTechnicalSheetData(): void {
    // Load TechnicalSheet và Assignments cùng lúc
    forkJoin({
      sheet: this.assignmentService.getTechnicalSheet(this.data.tbktId!),
      assignments: this.assignmentService.getAssignmentsGroupedByTBKT()
    }).subscribe({
      next: ({ sheet, assignments }) => {
        this.technicalSheet = sheet;
        
        // Tìm assignments theo TBKT ID
        const tbktAssignments = assignments.filter(a => 
          String(a.tbkt_ID || '').trim() === String(this.data.tbktId || '').trim()
        );
        // Ngày giao hàng lấy từ MachineAssignment (bảng assignment), fallback sang sheet
        const firstAssignment = tbktAssignments[0];
        this.deliveryDateFromAssignment = firstAssignment?.deliveryDate ?? null;
        
        // Thứ tự hiển thị: Thiết kế ruột, Thiết kế vỏ, Định mức vật tư (không hiển thị riêng Kiểm soát ruột/vỏ)
        const coreDesignWorkItem = this.findDesignWorkItem(tbktAssignments, 'Core Design');
        this.coreDesignerName = this.getPersonFullName(coreDesignWorkItem);
        const casingDesignWorkItem = this.findDesignWorkItem(tbktAssignments, 'Casing Design');
        this.casingDesignerName = this.getPersonFullName(casingDesignWorkItem);
        const materialLevelingWorkItem = this.findDesignWorkItem(tbktAssignments, 'Material Leveling');
        this.materialLevelingName = this.getPersonFullName(materialLevelingWorkItem);
        
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading TechnicalSheet:', err);
        this.error = 'Không thể tải thông tin TBKT';
        this.isLoading = false;
      }
    });
  }

  /** Trả về tên đầy đủ (full name) từ workItem, ưu tiên từ danh sách users thay vì username. */
  private getPersonFullName(workItem: WorkItem | null): string {
    if (!workItem) {
      return '-';
    }

    // Ưu tiên fullName từ API (đã là tên đầy đủ)
    if (workItem.fullName && String(workItem.fullName).trim()) {
      return String(workItem.fullName).trim();
    }

    // Có personName (thường là username hoặc userId) → tìm trong users để lấy tên đầy đủ
    const personNameStr = workItem.personName != null ? String(workItem.personName).trim() : '';
    if (!personNameStr) return '-';

    const personLower = personNameStr.toLowerCase();
    const user = this.users.find(u => {
      const id = u.id != null ? String(u.id).trim() : '';
      const userId = u.userId != null ? String(u.userId).trim() : '';
      const userName = (u.userName ?? '').trim().toLowerCase();
      const name = (u.name ?? '').trim();
      return id === personNameStr ||
        userId === personNameStr ||
        userName === personLower ||
        name === personNameStr;
    });

    if (user && (user.name ?? '').trim()) {
      return (user.name ?? '').trim();
    }

    return personNameStr;
  }

  private findDesignWorkItem(assignments: MachineAssignment[], workType: string): WorkItem | null {
    for (const assignment of assignments) {
      if (assignment.workItems && assignment.workItems.length > 0) {
        const workItem = assignment.workItems.find(wi => wi.workType === workType);
        if (workItem) {
          return workItem;
        }
      }
    }
    return null;
  }

  formatDate(date: Date | string | null | undefined): string {
    if (!date) return '-';
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(d.getTime())) return '-';
      const day = d.getDate();
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      return `${('00' + day).slice(-2)}/${('00' + month).slice(-2)}/${year}`;
    } catch {
      return '-';
    }
  }

  getStatusText(status: string | undefined): string {
    if (!status) return 'Chưa xử lý';
    switch (status.toLowerCase()) {
      case 'approved': return 'Đã duyệt';
      case 'rejected': return 'Đã từ chối';
      case 'pending': return 'Đang chờ';
      default: return status;
    }
  }

  getStatusClass(status: string | undefined): string {
    if (!status) return 'status-pending';
    switch (status.toLowerCase()) {
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      case 'pending': return 'status-pending';
      default: return 'status-pending';
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
