export interface FileDocument {
  id: number; // API trả về 'id' không phải 'fileID'
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadDate: string | Date; // API trả về ISO string
  uploadedBy?: string; // API trả về 'uploadedBy' không phải 'uploadBy'
  description?: string;
  assignmentId?: number; // API trả về 'assignmentId' (camelCase)
  filePath?: string;
  status?: FileStatus;
  // Tương thích với code cũ
  fileID?: number;
  assignmentID?: number;
  uploadBy?: string;
}

export enum FileStatus {
  Draft = 'Draft',
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Archived = 'Archived'
}

