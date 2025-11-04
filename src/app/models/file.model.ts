export interface FileDocument {
  fileID: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadDate: Date;
  uploadBy?: string;
  description?: string;
  assignmentID?: number;
  filePath?: string;
  status?: FileStatus;
}

export enum FileStatus {
  Draft = 'Draft',
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Archived = 'Archived'
}

