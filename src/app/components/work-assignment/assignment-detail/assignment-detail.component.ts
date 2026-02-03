import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { AssignmentService } from '../../../services/assignment.service';
import { MachineAssignment, WorkItem } from '../../../models/machine-assignment.model';
import { UsersService } from '../../../services/users.service';
import { AuthUser } from '../../../services/auth.service';

@Component({
  selector: 'app-assignment-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatChipsModule,
    MatDividerModule
  ],
  templateUrl: './assignment-detail.component.html',
  styleUrls: ['./assignment-detail.component.css']
})
export class AssignmentDetailComponent implements OnInit {
  assignment: MachineAssignment | null = null;
  users: AuthUser[] = [];

  constructor(
    private route: ActivatedRoute,
    private assignmentService: AssignmentService,
    private usersService: UsersService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadUsers();
      this.loadAssignment(+id);
    }
  }

  loadUsers() {
    this.usersService.loadUsers(1, 100).subscribe({
      next: (users) => {
        this.users = users;
      },
      error: (err) => {
        console.error('Error loading users:', err);
      }
    });
  }

  loadAssignment(id: number) {
    this.assignmentService.getAssignmentById(id).subscribe({
      next: (assignment) => {
        this.assignment = assignment;
      },
      error: (err) => {
        console.error('Error loading assignment:', err);
      }
    });
  }

  /** Hiển thị tên người giao việc: ưu tiên giá trị từ API (tên đầy đủ), không thì tra users theo id/userId/userName. */
  getDesignerName(designerId: string | number | undefined): string | null {
    if (designerId == null || designerId === '') return null;
    const s = String(designerId).trim();
    if (!s) return null;
    if (s.includes(' ') || isNaN(Number(s))) return s;
    const user = this.users.find(u =>
      u.id === s || u.id?.toString() === s ||
      u.userId?.toString() === s ||
      (u.userName && (u.userName as string).trim().toLowerCase() === s.toLowerCase())
    );
    return user ? (user.name || user.userName || null) : s;
  }

  /** Hiển thị tên trưởng đơn vị: ưu tiên giá trị từ API (tên đầy đủ), không thì tra users theo id/userId/userName. */
  getTeamLeaderName(teamLeaderId: string | number | undefined): string | null {
    if (teamLeaderId == null || teamLeaderId === '') return null;
    const s = String(teamLeaderId).trim();
    if (!s) return null;
    if (s.includes(' ') || isNaN(Number(s))) return s;
    const user = this.users.find(u =>
      u.id === s || u.id?.toString() === s ||
      u.userId?.toString() === s ||
      (u.userName && (u.userName as string).trim().toLowerCase() === s.toLowerCase())
    );
    return user ? (user.name || user.userName || null) : s;
  }

  getPersonName(personId: string | undefined): string | null {
    if (!personId) return null;
    const user = this.users.find(u => u.id === personId || u.id?.toString() === personId);
    return user ? (user.name || user.userName || null) : personId;
  }

  getWorkTypeName(workType: string | undefined): string | null {
    if (!workType) return null;
    const workTypeMap: { [key: string]: string } = {
      'Casing Review': 'Kiểm soát vỏ',
      'Core Review': 'Kiểm soát ruột',
      'Casing Design': 'Thiết kế vỏ',
      'Core Design': 'Thiết kế ruột',
      'Material Leveling': 'Định mức vật tư'
    };
    return workTypeMap[workType] || workType;
  }

  /** Thứ tự: Thiết kế ruột, Kiểm soát ruột, Thiết kế vỏ, Kiểm soát vỏ, Định mức vật tư */
  private readonly workTypeOrder = ['Core Design', 'Core Review', 'Casing Design', 'Casing Review', 'Material Leveling'];

  getSortedWorkItems(): WorkItem[] {
    if (!this.assignment?.workItems?.length) return [];
    return [...this.assignment.workItems].sort((a, b) => {
      const ia = this.workTypeOrder.indexOf(a.workType || '');
      const ib = this.workTypeOrder.indexOf(b.workType || '');
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
  }

  getAssignedUsersWithWorkTypes(): Array<{ userName: string; workTypes: string[] }> {
    if (!this.assignment || !this.assignment.workItems) {
      return [];
    }
    
    const workTypeNameOrder = ['Thiết kế ruột', 'Kiểm soát ruột', 'Thiết kế vỏ', 'Kiểm soát vỏ', 'Định mức vật tư'];
    const userWorkMap = new Map<string, Set<string>>();
    
    this.assignment.workItems.forEach(item => {
      if (item.personName) {
        const userName = this.getPersonName(item.personName);
        if (userName) {
          if (!userWorkMap.has(userName)) {
            userWorkMap.set(userName, new Set<string>());
          }
          const workTypeName = this.getWorkTypeName(item.workType);
          if (workTypeName) {
            userWorkMap.get(userName)!.add(workTypeName);
          }
        }
      }
    });
    
    const result: Array<{ userName: string; workTypes: string[] }> = [];
    userWorkMap.forEach((workTypesSet, userName) => {
      const workTypes = Array.from(workTypesSet).sort((a, b) => {
        const ia = workTypeNameOrder.indexOf(a);
        const ib = workTypeNameOrder.indexOf(b);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      });
      result.push({ userName, workTypes });
    });
    return result;
  }
}

