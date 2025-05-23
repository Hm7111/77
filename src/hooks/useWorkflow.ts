import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';
import type { Letter, WorkflowState, ApprovalRequest } from '../types/database';
import { useAuth } from '../lib/auth';

/**
 * هوك للتعامل مع سير عمل الخطابات والموافقات
 */
export function useWorkflow() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { dbUser } = useAuth();

  /**
   * إنشاء طلب موافقة جديد للخطاب
   */
  const requestApproval = useCallback(
    async (
      letterId: string,
      approverId: string,
      comments?: string,
      dueDate?: Date | string
    ) => {
      if (!letterId || !approverId) {
        toast({
          title: 'خطأ',
          description: 'يجب تحديد الخطاب والمستخدم المعتمد',
          type: 'error',
        });
        return null;
      }

      setIsLoading(true);
      try {
        console.log('Requesting approval for letter:', letterId, 'to approver:', approverId);
        
        // استدعاء دالة إنشاء طلب الموافقة
        const { data, error } = await supabase.rpc('create_approval_request', {
          p_letter_id: letterId,
          p_approver_id: approverId,
          p_comments: comments || null,
          p_due_date: dueDate ? new Date(dueDate).toISOString() : null,
        });

        if (error) {
          console.error('Error in RPC call:', error);
          throw error;
        }

        toast({
          title: 'تم إنشاء الطلب',
          description: 'تم إرسال طلب الموافقة بنجاح',
          type: 'success',
        });

        return data;
      } catch (error) {
        console.error('Error requesting approval:', error);
        toast({
          title: 'خطأ',
          description:
            error instanceof Error
              ? error.message
              : 'حدث خطأ أثناء إنشاء طلب الموافقة',
          type: 'error',
        });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  /**
   * الموافقة على الخطاب
   */
  const approveRequest = useCallback(
    async (requestId: string, comments?: string, signatureId?: string) => {
      if (!requestId) {
        toast({
          title: 'خطأ',
          description: 'معرف طلب الموافقة غير صالح',
          type: 'error',
        });
        return false;
      }

      setIsLoading(true);
      try {
        console.log('Approving request:', requestId, 'with signature:', signatureId);
        
        // التأكد من وجود توقيع
        if (!signatureId) {
          const { data: signatures } = await supabase
            .from('signatures')
            .select('id')
            .eq('user_id', dbUser?.id || '')
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (signatures && signatures.length > 0) {
            signatureId = signatures[0].id;
          } else {
            throw new Error('لم يتم العثور على توقيع. يرجى إضافة توقيع أولاً.');
          }
        }
        
        // استدعاء دالة الموافقة مع المعلمات الصحيحة
        const { data, error } = await supabase.rpc('approve_letter_with_signature', {
          p_request_id: requestId,
          p_signature_id: signatureId,
          p_comments: comments || null
        });

        if (error) {
          console.error('Error in approve RPC call:', error);
          throw error;
        }

        toast({
          title: 'تمت الموافقة',
          description: 'تم الموافقة على الخطاب بنجاح',
          type: 'success',
        });

        return true;
      } catch (error) {
        console.error('Error approving letter:', error);
        toast({
          title: 'خطأ',
          description:
            error instanceof Error
              ? error.message
              : 'حدث خطأ أثناء الموافقة على الخطاب',
          type: 'error',
        });
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [toast, dbUser?.id]
  );

  /**
   * رفض الخطاب
   */
  const rejectRequest = useCallback(
    async (requestId: string, reason: string) => {
      if (!requestId) {
        toast({
          title: 'خطأ',
          description: 'معرف طلب الموافقة غير صالح',
          type: 'error',
        });
        return false;
      }

      if (!reason || reason.trim() === '') {
        toast({
          title: 'خطأ',
          description: 'يجب تحديد سبب الرفض',
          type: 'error',
        });
        return false;
      }

      setIsLoading(true);
      try {
        // استدعاء دالة الرفض
        const { data, error } = await supabase.rpc('reject_letter', {
          p_request_id: requestId,
          p_reason: reason,
        });

        if (error) {
          console.error('Error in reject RPC call:', error);
          throw error;
        }

        toast({
          title: 'تم الرفض',
          description: 'تم رفض الخطاب بنجاح',
          type: 'success',
        });

        return true;
      } catch (error) {
        console.error('Error rejecting letter:', error);
        toast({
          title: 'خطأ',
          description:
            error instanceof Error
              ? error.message
              : 'حدث خطأ أثناء رفض الخطاب',
          type: 'error',
        });
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  /**
   * الحصول على طلبات الموافقة المعلقة للمستخدم الحالي
   */
  const getPendingApprovals = useCallback(async () => {
    if (!dbUser) return [];

    setIsLoading(true);
    try {
      console.log('Fetching pending approvals for user:', dbUser.id);
      
      // استدعاء وظيفة الاستعلام عن طلبات الموافقة المعلقة
      const { data, error } = await supabase.rpc('get_pending_approvals');

      if (error) {
        console.error('Error in RPC call:', error);
        throw error;
      }

      console.log('Pending approvals data:', data);
      return data || [];
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء جلب طلبات الموافقة المعلقة',
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
    try {
      const { data, error } = await supabase.rpc('get_available_approvers');

      if (error) {
        console.error('Error getting available approvers:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching available approvers:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء جلب المستخدمين المتاحين للموافقة',
        type: 'error',
      });
      return [];
    }
  }, [toast]);

  /**
   * الحصول على سجلات الموافقات لطلب محدد
   */
  const getApprovalLogs = useCallback(
    async (requestId: string) => {
      if (!requestId) {
        toast({
          title: 'خطأ',
          description: 'معرف طلب الموافقة غير صالح',
          type: 'error',
        });
        return [];
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('approval_logs')
          .select(
            `
              id, 
              action,
              status,
              previous_status,
              comments,
              created_at,
              users:user_id (
                id,
                full_name,
                email,
                role
              )
            `
          )
          .eq('request_id', requestId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        return data || [];
      } catch (error) {
        console.error('Error fetching approval logs:', error);
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء جلب سجلات الموافقات',
          type: 'error',
        });
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  /**
   * تحديث حالة سير عمل الخطاب
   */
  const updateWorkflowStatus = useCallback(
    async (letterId: string, status: WorkflowState) => {
      if (!letterId) {
        toast({
          title: 'خطأ',
          description: 'معرف الخطاب غير صالح',
          type: 'error',
        });
        return false;
      }

      setIsLoading(true);
      try {
        const { error } = await supabase
          .from('letters')
          .update({
            workflow_status: status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', letterId);

        if (error) throw error;

        toast({
          title: 'تم التحديث',
          description: 'تم تحديث حالة سير العمل بنجاح',
          type: 'success',
        });

        return true;
      } catch (error) {
        console.error('Error updating workflow status:', error);
        toast({
          title: 'خطأ',
          description:
            error instanceof Error
              ? error.message
              : 'حدث خطأ أثناء تحديث حالة سير العمل',
          type: 'error',
        });
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  return {
    isLoading,
    requestApproval,
    approveRequest,
    rejectRequest,
    getPendingApprovals,
    getAvailableApprovers,
    getApprovalLogs,
    updateWorkflowStatus,
  };
}