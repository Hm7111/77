import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';
import { useAuth } from '../lib/auth';
import { 
  useApprovalRequests, 
  useApprovalDecisions, 
  useWorkflowStatus 
} from '../features/workflow/hooks';

/**
 * هوك مجمع للتعامل مع سير العمل والموافقات
 * يجمع بين هوكات الموافقات المختلفة لتوفير واجهة موحدة
 */
export function useWorkflow() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { dbUser } = useAuth();
  
  // استخدام هوكات سير العمل المنفصلة
  const { createRequest, getPendingApprovals, getMyRequests, getAvailableApprovers } = useApprovalRequests();
  const { approveRequest, rejectRequest, getApprovalLogs } = useApprovalDecisions();
  const { updateWorkflowStatus, getWorkflowStatus } = useWorkflowStatus();
  
  /**
   * طلب موافقة على خطاب
   */
  const requestApproval = useCallback(async (
    letterId: string,
    approverId: string,
    comments?: string,
    dueDate?: Date | string
  ) => {
    return await createRequest({
      letterId,
      approverId,
      comments,
      dueDate
    });
  }, [createRequest]);
  
  return {
    isLoading,
    requestApproval,
    approveRequest,
    rejectRequest,
    getPendingApprovals,
    getMyRequests,
    getAvailableApprovers,
    getApprovalLogs,
    updateWorkflowStatus,
    getWorkflowStatus
  };
}