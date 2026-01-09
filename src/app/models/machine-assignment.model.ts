export enum AssignmentStatus {
  New = 1,           // Mới
  InProgress = 2,    // Đang xử lý
  Completed = 3      // Hoàn thành
}

export interface MachineAssignment {
  assignmentID: number;
  tbkt_ID: string; // API trả về string, ví dụ: "TC: 96/QĐ-HDTV"
  machineName: string;
  requestDocument?: string; // ĐĐH/Giấy đề nghị
  standardRequirement?: string;
  additionalRequest?: string;
  deliveryDate?: Date | string; // API trả về ISO 8601 string
  designer?: string;
  teamLeader?: string;
  status?: AssignmentStatus | number; // 1: New, 2: InProgress, 3: Completed
  isLocked?: boolean; // Khóa để ngăn user thiết kế sửa sau khi xác nhận hoàn thành
  filePath?: string; // Đường dẫn file (nếu có nhiều file thì nối bằng ";")
  filePaths?: string[]; // Danh sách đường dẫn file (tương thích)
  technicalSheet?: TechnicalSheet;
  approvals?: AssignmentApproval[]; // Tương thích với code cũ
  assignmentApprovals?: AssignmentApproval[]; // Format từ API
  workItems?: WorkItem[];
  workChanges?: WorkChange[];
}

export interface TechnicalSheet {
  tbkt_ID: number | string; // Có thể là number hoặc string
  power_kVA?: number;
  voltageSpec?: string;
  phase?: string;
  standardCode?: string;
  proposer?: string; // FirebaseUID (string) thay vì number
  deliveryDate?: Date | string;
  drawingDate?: Date | string;
  notes?: string;
  salesOrder?: string; // SO (Nếu có)
  handOverDate?: Date | string; // Ngày bàn giao
  archivedDate?: Date | string; // Ngày lưu trữ
  requesterElectrical?: string; // KS Điện
  requesterMechanical?: string; // KS Cơ
  
  // Approval workflow fields - ManagerL1 approval
  managerL1ApprovalStatus?: string; // Pending, Approved, Rejected
  managerL1ApproverFirebaseUID?: string;
  managerL1ApprovalDate?: Date | string;
  managerL1ApprovalNotes?: string;
  
  // Approval workflow fields - Manager approval
  managerApprovalStatus?: string; // Pending, Approved, Rejected
  managerApproverFirebaseUID?: string;
  managerApprovalDate?: Date | string;
  managerApprovalNotes?: string;
}

export interface AssignmentApproval {
  approvalID: number;
  assignmentID: number;
  approverRole?: string;
  approverName?: string;
  approvalDate?: Date | string; // API trả về ISO 8601 string
  notes?: string;
}

export interface WorkChange {
  changeID: number;
  assignmentID: number;
  changeType?: string;
  description?: string;
}

export interface WorkItem {
  workItemID: number;
  assignmentID: number;
  workType?: string;
  personName?: string;
  startDate?: Date | string; // API trả về ISO 8601 string
  expectedFinish?: Date | string; // API trả về ISO 8601 string
  actualFinish?: Date | string; // API trả về ISO 8601 string
  personConfirmation?: boolean;
  notes?: string;
  file_ID?: string; // Comma-separated file IDs (e.g., "1,2,3")
}

// WorkItem với thông tin Assignment đầy đủ (từ API my-work-items)
export interface WorkItemWithAssignment extends WorkItem {
  assignment?: MachineAssignment;
}

/**
 * DTO để tạo Work Item mới cho Assignment
 * Endpoint: POST /api/Assignments/{id}/work-items
 * 
 * @see https://api-docs/assignments/work-items
 */
export interface CreateWorkItemDto {
  /** ID của Assignment (bắt buộc, phải khớp với {id} trong URL) */
  assignmentID: number;
  /** Loại công việc (ví dụ: "Core Design", "Core Review", "Casing Design", etc.) - Max 100 chars */
  workType?: string | null;
  /** Tên người thực hiện (có thể là UserID dạng string, FullName, hoặc UserName) - Max 100 chars */
  personName?: string | null;
  /** Ngày bắt đầu (ISO 8601 format) */
  startDate?: string | Date | null;
  /** Ngày dự kiến hoàn thành (ISO 8601 format) */
  expectedFinish?: string | Date | null;
  /** Ngày thực tế hoàn thành (ISO 8601 format) */
  actualFinish?: string | Date | null;
  /** Xác nhận của người thực hiện */
  personConfirmation?: boolean | null;
  /** Ghi chú về công việc - Max 500 chars */
  notes?: string | null;
}

