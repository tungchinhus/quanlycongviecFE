import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WorkItem, WorkChange, CreateWorkItemDto } from '../models/machine-assignment.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WorkItemService {
  private apiUrl = `${environment.apiUrl}/work-items`;

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

  /**
   * Tạo Work Item (sử dụng endpoint /work-items)
   * Lưu ý: Nếu bạn muốn tạo work item cho một assignment cụ thể,
   * hãy sử dụng AssignmentService.createWorkItem() thay vì method này.
   * 
   * @param workItem - Dữ liệu work item cần tạo
   * @returns Observable<WorkItem> - Work item đã được tạo
   */
  createWorkItem(workItem: Partial<WorkItem>): Observable<WorkItem> {
    return this.http.post<WorkItem>(this.apiUrl, workItem);
  }

  /**
   * Tạo Work Item cho Assignment cụ thể
   * 
   * Endpoint: POST /api/Assignments/{assignmentId}/work-items
   * 
   * Đây là method được khuyến nghị để tạo work item cho assignment.
   * 
   * @param assignmentId - ID của Assignment cần thêm work item
   * @param workItem - Dữ liệu work item cần tạo (assignmentID là bắt buộc, các trường khác optional)
   * @returns Observable<WorkItem> - Work item đã được tạo
   * 
   * @example
   * ```typescript
   * this.workItemService.createWorkItemForAssignment(1, {
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
   */
  createWorkItemForAssignment(assignmentId: number, workItem: CreateWorkItemDto | Partial<WorkItem>): Observable<WorkItem> {
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
    
    return this.http.post<WorkItem>(
      `${environment.apiUrl}/Assignments/${assignmentId}/work-items`, 
      workItemData
    );
  }

  updateWorkItem(id: number, workItem: Partial<WorkItem>): Observable<WorkItem> {
    return this.http.put<WorkItem>(`${this.apiUrl}/${id}`, workItem);
  }

  deleteWorkItem(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Work Change methods
  getWorkChangesByAssignment(assignmentID: number): Observable<WorkChange[]> {
    return this.http.get<WorkChange[]>(`${environment.apiUrl}/work-changes?assignmentID=${assignmentID}`);
  }

  createWorkChange(workChange: Partial<WorkChange>): Observable<WorkChange> {
    return this.http.post<WorkChange>(`${environment.apiUrl}/work-changes`, workChange);
  }
}

