import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MachineAssignment, TechnicalSheet, WorkItem, WorkChange, WorkItemWithAssignment, CreateWorkItemDto } from '../models/machine-assignment.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AssignmentService {
  private apiUrl = `${environment.apiUrl}/Assignments`;

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

  updateAssignment(id: number, assignment: Partial<MachineAssignment>): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, assignment);
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

  /**
   * Tạo Work Item mới cho Assignment
   * 
   * Endpoint: POST /api/Assignments/{id}/work-items
   * 
   * @param assignmentId - ID của Assignment cần thêm work item (phải khớp với assignmentID trong body)
   * @param workItem - Dữ liệu work item cần tạo (assignmentID là bắt buộc, các trường khác optional)
   * @returns Observable<WorkItem> - Work item đã được tạo
   * 
   * @example
   * ```typescript
   * this.assignmentService.createWorkItem(1, {
   *   assignmentID: 1,
   *   workType: "Core Design",
   *   personName: "Ngô Cẩm Tú",
   *   startDate: new Date().toISOString(),
   *   expectedFinish: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
   *   notes: "Thiết kế ruột máy biến áp"
   * }).subscribe({
   *   next: (workItem) => console.log('Created:', workItem),
   *   error: (error) => console.error('Error:', error)
   * });
   * ```
   * 
   * @throws 404 Not Found - Assignment không tồn tại
   * @throws 400 Bad Request - Dữ liệu không hợp lệ (thiếu assignmentID)
   * @throws 401 Unauthorized - Thiếu hoặc Token không hợp lệ
   * @throws 500 Internal Server Error - Lỗi server
   */
  createWorkItem(assignmentId: number, workItem: CreateWorkItemDto | Partial<WorkItem>): Observable<WorkItem> {
    // Đảm bảo assignmentID trong body khớp với assignmentId trong URL
    const workItemData: CreateWorkItemDto = {
      ...workItem,
      assignmentID: assignmentId,
      // Chuyển đổi Date objects thành ISO strings nếu có
      startDate: workItem.startDate instanceof Date 
        ? workItem.startDate.toISOString() 
        : workItem.startDate,
      expectedFinish: workItem.expectedFinish instanceof Date 
        ? workItem.expectedFinish.toISOString() 
        : workItem.expectedFinish,
      actualFinish: workItem.actualFinish instanceof Date 
        ? workItem.actualFinish.toISOString() 
        : workItem.actualFinish,
    };
    
    return this.http.post<WorkItem>(`${this.apiUrl}/${assignmentId}/work-items`, workItemData);
  }

  // Work Changes methods
  createWorkChange(assignmentId: number, workChange: Partial<WorkChange>): Observable<WorkChange> {
    return this.http.post<WorkChange>(`${this.apiUrl}/${assignmentId}/work-changes`, workChange);
  }

  // Get work items của user đăng nhập
  getMyWorkItems(): Observable<WorkItemWithAssignment[]> {
    return this.http.get<WorkItemWithAssignment[]>(`${this.apiUrl}/my-work-items`);
  }
}

