import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MachineAssignment, TechnicalSheet, WorkItem, WorkChange } from '../models/machine-assignment.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AssignmentService {
  private apiUrl = `${environment.apiUrl}/assignments`;

  constructor(private http: HttpClient) {}

  getAllAssignments(): Observable<MachineAssignment[]> {
    return this.http.get<MachineAssignment[]>(this.apiUrl);
  }

  getAssignmentById(id: number): Observable<MachineAssignment> {
    return this.http.get<MachineAssignment>(`${this.apiUrl}/${id}`);
  }

  createAssignment(assignment: Partial<MachineAssignment>): Observable<MachineAssignment> {
    return this.http.post<MachineAssignment>(this.apiUrl, assignment);
  }

  updateAssignment(id: number, assignment: Partial<MachineAssignment>): Observable<MachineAssignment> {
    return this.http.put<MachineAssignment>(`${this.apiUrl}/${id}`, assignment);
  }

  deleteAssignment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getTechnicalSheet(tbktId: number): Observable<TechnicalSheet> {
    return this.http.get<TechnicalSheet>(`${environment.apiUrl}/technical-sheets/${tbktId}`);
  }

  createTechnicalSheet(sheet: Partial<TechnicalSheet>): Observable<TechnicalSheet> {
    return this.http.post<TechnicalSheet>(`${environment.apiUrl}/technical-sheets`, sheet);
  }

  // Work Items methods
  createWorkItem(assignmentId: number, workItem: Partial<WorkItem>): Observable<WorkItem> {
    return this.http.post<WorkItem>(`${this.apiUrl}/${assignmentId}/work-items`, workItem);
  }

  // Work Changes methods
  createWorkChange(assignmentId: number, workChange: Partial<WorkChange>): Observable<WorkChange> {
    return this.http.post<WorkChange>(`${this.apiUrl}/${assignmentId}/work-changes`, workChange);
  }
}

