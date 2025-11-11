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
import { MachineAssignment } from '../../../models/machine-assignment.model';
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

  getDesignerName(designerId: string | undefined): string | null {
    if (!designerId) return null;
    const user = this.users.find(u => u.id === designerId || u.id?.toString() === designerId);
    return user ? (user.name || user.userName || null) : null;
  }

  getTeamLeaderName(teamLeaderId: string | undefined): string | null {
    if (!teamLeaderId) return null;
    const user = this.users.find(u => u.id === teamLeaderId || u.id?.toString() === teamLeaderId);
    return user ? (user.name || user.userName || null) : null;
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
}

