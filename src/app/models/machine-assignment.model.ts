export interface MachineAssignment {
  assignmentID: number;
  tbkt_ID: number;
  machineName: string;
  standardRequirement?: string;
  additionalRequest?: string;
  deliveryDate?: Date;
  designer?: string;
  teamLeader?: string;
  technicalSheet?: TechnicalSheet;
  approvals?: AssignmentApproval[];
  workItems?: WorkItem[];
  workChanges?: WorkChange[];
}

export interface TechnicalSheet {
  tbkt_ID: number;
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
  approvalDate?: Date;
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
  startDate?: Date;
  expectedFinish?: Date;
  actualFinish?: Date;
  personConfirmation?: boolean;
  notes?: string;
}

