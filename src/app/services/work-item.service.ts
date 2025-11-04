import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WorkItem, WorkChange } from '../models/machine-assignment.model';

@Injectable({
  providedIn: 'root'
})
export class WorkItemService {
  private apiUrl = 'api/work-items'; // Adjust to your API endpoint

  constructor(private http: HttpClient) {}

  getAllWorkItems(): Observable<WorkItem[]> {
    return this.http.get<WorkItem[]>(this.apiUrl);
  }

  getWorkItemsByAssignment(assignmentID: number): Observable<WorkItem[]> {
    return this.http.get<WorkItem[]>(`${this.apiUrl}?assignmentID=${assignmentID}`);
  }

  getWorkItemById(id: number): Observable<WorkItem> {
    return this.http.get<WorkItem>(`${this.apiUrl}/${id}`);
  }

  createWorkItem(workItem: Partial<WorkItem>): Observable<WorkItem> {
    return this.http.post<WorkItem>(this.apiUrl, workItem);
  }

  updateWorkItem(id: number, workItem: Partial<WorkItem>): Observable<WorkItem> {
    return this.http.put<WorkItem>(`${this.apiUrl}/${id}`, workItem);
  }

  deleteWorkItem(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Work Change methods
  getWorkChangesByAssignment(assignmentID: number): Observable<WorkChange[]> {
    return this.http.get<WorkChange[]>(`api/work-changes?assignmentID=${assignmentID}`);
  }

  createWorkChange(workChange: Partial<WorkChange>): Observable<WorkChange> {
    return this.http.post<WorkChange>('api/work-changes', workChange);
  }
}

