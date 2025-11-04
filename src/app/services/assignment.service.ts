import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MachineAssignment, TechnicalSheet } from '../models/machine-assignment.model';

@Injectable({
  providedIn: 'root'
})
export class AssignmentService {
  private apiUrl = 'api/assignments'; // Adjust to your API endpoint

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
    return this.http.get<TechnicalSheet>(`api/technical-sheets/${tbktId}`);
  }

  createTechnicalSheet(sheet: Partial<TechnicalSheet>): Observable<TechnicalSheet> {
    return this.http.post<TechnicalSheet>('api/technical-sheets', sheet);
  }
}

