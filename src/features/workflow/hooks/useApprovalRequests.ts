import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../hooks/useToast';
import { useAuth } from '../../../lib/auth';
import { ApprovalRequestData, PendingApproval, ApprovalRequestWithDetails } from '../types';

/**
 * هوك لإدارة طلبات الموافقة
 */
export function useApprovalRequests() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { dbUser } = useAuth();

  /**
   * إنشاء طلب موافقة جديد
   */
  const createRequest = useCallback(async (data: ApprovalRequestData) => {
    if (!data.letterId || !data.approverId) {
      toast({
        title: 'خطأ',
        description: 'يجب تحديد الخطاب والمستخدم المعتمد',
        type: 'error',
      });
      return null;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const { data: result, error } = await supabase.rpc('create_approval_request', {
        p_letter_id: data.letterId,
        p_approver_id: data.approverId,
        p_comments: data.comments || null,
        p_due_date: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      });

      if (error) throw error;

      toast({
        title: 'تم إنشاء الطلب',
        description: 'تم إرسال طلب الموافقة بنجاح',
        type: 'success',
      });

      return result;
    } catch (error) {
      console.error('Error creating approval request:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء طلب الموافقة';
      setError(errorMessage);
      
      toast({
        title: 'خطأ',
        description: errorMessage,
        type: 'error',
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * الحصول على طلبات الموافقة المعلقة للمستخدم الحالي
   */
  const getPendingApprovals = useCallback(async () => {
    if (!dbUser) return [];

    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.rpc('get_pending_approvals');

      if (error) throw error;

      return data as PendingApproval[];
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء جلب طلبات الموافقة المعلقة';
      setError(errorMessage);
      
      toast({
        title: 'خطأ',
        description: errorMessage,
        type: 'error',
      });
      
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [dbUser, toast]);

  /**
   * الحصول على طلبات الموافقة التي أنشأها المستخدم الحالي
   */
  const getMyRequests = useCallback(async () => {
    if (!dbUser) return [];

    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('approval_requests')
        .select(`
          *,
          letters:letter_id (*),
          approver:assigned_to (full_name, email)
        `)
        .eq('requested_by', dbUser.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data as ApprovalRequestWithDetails[];
    } catch (error) {
      console.error('Error fetching my approval requests:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء جلب طلبات الموافقة الخاصة بك';
      setError(errorMessage);
      
      toast({
        title: 'خطأ',
        description: errorMessage,
        type: 'error',
      });
      
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [dbUser, toast]);

  /**
   * الحصول على المستخدمين المتاحين للموافقة
   */
  const getAvailableApprovers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.rpc('get_available_approvers');

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching available approvers:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء جلب المستخدمين المتاحين للموافقة';
      setError(errorMessage);
      
      toast({
        title: 'خطأ',
        description: errorMessage,
        type: 'error',
      });
      
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    isLoading,
    error,
    createRequest,
    getPendingApprovals,
    getMyRequests,
    getAvailableApprovers
  };
}