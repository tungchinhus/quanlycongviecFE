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
  proposer?: string;
  deliveryDate?: Date;
  drawingDate?: Date;
  notes?: string;
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
}

// WorkItem với thông tin Assignment đầy đủ (từ API my-work-items)
export interface WorkItemWithAssignment extends WorkItem {
  assignment?: MachineAssignment;
}

