import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AssignmentApproval } from '../models/machine-assignment.model';

@Injectable({
  providedIn: 'root'
})
export class ApprovalService {
  private apiUrl = 'api/approvals'; // Adjust to your API endpoint

  constructor(private http: HttpClient) {}

  getAllApprovals(): Observable<AssignmentApproval[]> {
    return this.http.get<AssignmentApproval[]>(this.apiUrl);
  }

  getApprovalsByAssignment(assignmentID: number): Observable<AssignmentApproval[]> {
    return this.http.get<AssignmentApproval[]>(`${this.apiUrl}?assignmentID=${assignmentID}`);
  }

  getApprovalById(id: number): Observable<AssignmentApproval> {
    return this.http.get<AssignmentApproval>(`${this.apiUrl}/${id}`);
  }

  createApproval(approval: Partial<AssignmentApproval>): Observable<AssignmentApproval> {
    return this.http.post<AssignmentApproval>(this.apiUrl, approval);
  }

  updateApproval(id: number, approval: Partial<AssignmentApproval>): Observable<AssignmentApproval> {
    return this.http.put<AssignmentApproval>(`${this.apiUrl}/${id}`, approval);
  }

  approve(assignmentID: number, approverRole: string, approverName: string, notes?: string): Observable<AssignmentApproval> {
    return this.createApproval({
      assignmentID,
      approverRole,
      approverName,
      approvalDate: new Date(),
      notes
    });
  }

  deleteApproval(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}

