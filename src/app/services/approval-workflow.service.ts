import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ApprovalWorkflow,
  CreateApprovalWorkflowDto,
  UpdateApprovalWorkflowDto,
  SubmitApprovalActionDto
} from '../models/approval-workflow.model';

@Injectable({
  providedIn: 'root'
})
export class ApprovalWorkflowService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/approval-workflow`;

  /**
   * Lấy danh sách tất cả approval workflows
   * @param status - Optional: Lọc theo trạng thái (Draft, PendingControl, PendingApproval, Approved, Rejected, Completed)
   */
  getAllWorkflows(status?: string): Observable<ApprovalWorkflow[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<ApprovalWorkflow[]>(this.apiUrl, { params });
  }

  /**
   * Lấy chi tiết một approval workflow theo ID
   */
  getWorkflowById(id: number): Observable<ApprovalWorkflow> {
    return this.http.get<ApprovalWorkflow>(`${this.apiUrl}/${id}`);
  }

  /**
   * Tạo approval workflow mới
   * Sau khi tạo, hệ thống sẽ tự động gửi email thông báo cho người kiểm soát
   */
  createWorkflow(workflow: CreateApprovalWorkflowDto): Observable<ApprovalWorkflow> {
    return this.http.post<ApprovalWorkflow>(this.apiUrl, workflow);
  }

  /**
   * Cập nhật approval workflow
   * Chỉ có thể cập nhật khi workflow chưa hoàn tất hoặc bị từ chối
   */
  updateWorkflow(id: number, workflow: UpdateApprovalWorkflowDto): Observable<ApprovalWorkflow> {
    return this.http.put<ApprovalWorkflow>(`${this.apiUrl}/${id}`, workflow);
  }

  /**
   * Xóa approval workflow
   * Chỉ có thể xóa khi workflow ở trạng thái Draft hoặc PendingControl
   */
  deleteWorkflow(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Thực hiện hành động (kiểm soát hoặc xét duyệt)
   * @param id - Workflow ID
   * @param action - 'approve' hoặc 'reject'
   * @param notes - Ghi chú
   * @param userRole - 'controller' hoặc 'approver'
   */
  submitAction(id: number, action: 'approve' | 'reject', notes: string | undefined, userRole: 'controller' | 'approver'): Observable<ApprovalWorkflow> {
    const dto: SubmitApprovalActionDto = {
      workflowID: id,
      action,
      notes,
      userRole
    };
    return this.http.post<ApprovalWorkflow>(`${this.apiUrl}/${id}/submit-action`, dto);
  }
}

