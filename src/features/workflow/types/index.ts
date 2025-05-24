// أنواع بيانات لنظام سير العمل والموافقات
import { WorkflowState, ApprovalRequest, ApprovalLog, Letter, User, Signature } from '../../../types/database';

export interface ApprovalRequestData {
  letterId: string;
  approverId: string;
  comments?: string;
  dueDate?: Date | string;
}

export interface ApprovalDecisionData {
  requestId: string;
  comments?: string;
  signatureId?: string;
}

export interface RejectionData {
  requestId: string;
  reason: string;
}

export interface ApprovalRequestWithDetails extends ApprovalRequest {
  letter?: Letter;
  requester?: User;
  approver?: User;
}

export interface ApprovalLogWithDetails extends ApprovalLog {
  user?: User;
}

export interface PendingApproval {
  request_id: string;
  letter_id: string;
  letter_subject: string;
  requester_name: string;
  requested_at: string;
}

export type { WorkflowState, ApprovalRequest, ApprovalLog, Letter, User, Signature };