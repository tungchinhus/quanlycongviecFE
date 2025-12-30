export interface ApprovalWorkflow {
  workflowID: number;
  requestTitle?: string;
  requestDescription?: string;
  requestType?: string;
  requestReferenceID?: string;
  
  requesterFirebaseUID?: string;
  requesterName?: string;
  requesterEmail?: string;
  
  requestSentDate?: Date | string;
  requestStatus?: string;
  
  controllerFirebaseUID?: string;
  controllerName?: string;
  controllerEmail?: string;
  controlReviewDate?: Date | string;
  controlStatus?: string;
  controlNotes?: string;
  
  approverFirebaseUID?: string;
  approverName?: string;
  approverEmail?: string;
  approvalDate?: Date | string;
  approvalStatus?: string;
  approvalNotes?: string;
  
  overallStatus?: string;
  completedDate?: Date | string;
  
  powerAutomateFlowRunID?: string;
  powerAutomateFlowURL?: string;
  lastNotificationSent?: Date | string;
  
  createdAt: Date | string;
  updatedAt?: Date | string;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateApprovalWorkflowDto {
  requestTitle?: string;
  requestDescription?: string;
  requestType?: string;
  requestReferenceID?: string;
  controllerEmail?: string;
  approverEmail?: string;
}

export interface UpdateApprovalWorkflowDto {
  requestTitle?: string;
  requestDescription?: string;
  controlNotes?: string;
  approvalNotes?: string;
}

export interface SubmitApprovalActionDto {
  workflowID: number;
  action: 'approve' | 'reject';
  notes?: string;
  userRole: 'controller' | 'approver';
}

export enum ApprovalWorkflowStatus {
  Draft = 'Draft',
  PendingControl = 'PendingControl',
  PendingApproval = 'PendingApproval',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Completed = 'Completed'
}

export enum ControlStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected'
}

export enum ApprovalStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected'
}

