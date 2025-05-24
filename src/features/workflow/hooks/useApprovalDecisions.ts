import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../hooks/useToast';
import { ApprovalDecisionData, RejectionData, ApprovalLogWithDetails } from '../types';
import { useDiagnostics } from '../../../hooks/useDiagnostics';

/**
 * هوك لإدارة قرارات الموافقة (الموافقة أو الرفض)
 */
export function useApprovalDecisions() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { diagnoseError } = useDiagnostics();

  /**
   * الموافقة على طلب
   */
  const approveRequest = useCallback(async (data: ApprovalDecisionData) => {
    if (!data.requestId) {
      console.error('Invalid request ID:', data.requestId);
      toast({
        title: 'خطأ',
        description: 'معرف طلب الموافقة غير صالح',
        type: 'error',
      });
      return false;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Initialize signatureId with the provided value
      let signatureId = data.signatureId;

      // التأكد من وجود توقيع
      if (!signatureId) {
        const { data: user } = await supabase.auth.getUser();
        const userId = user?.user?.id;
        
        if (userId) {
          const { data: signatures } = await supabase
            .from('signatures')
            .select('id')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (signatures && signatures.length > 0) {
            signatureId = signatures[0].id;
          }
        }
      }
      
      if (!signatureId) {
        throw new Error('لم يتم العثور على توقيع. يرجى إضافة توقيع أولاً.');
      }
      
      console.log('Calling RPC approve_letter_with_signature with:', {
        p_request_id: data.requestId,
        p_signature_id: signatureId,
        p_comments: data.comments || null
      });
      
      const { error } = await supabase.rpc('approve_letter_with_signature', {
        p_request_id: data.requestId,
        p_signature_id: signatureId,
        p_comments: data.comments || null
      });

      if (error) throw error;
      
      // تحديث حالة الخطاب في الواجهة
      try {
        // يمكن إضافة تحديث للواجهة هنا إذا لزم الأمر
      } catch (updateError) {
        console.warn('Error updating UI after approval:', updateError);
        // لا نريد إيقاف العملية إذا فشل تحديث الواجهة
      }

      toast({
        title: 'تمت الموافقة',
        description: 'تم الموافقة على الخطاب بنجاح',
        type: 'success',
      });

      return true;
    } catch (error) {
      console.error('Error approving letter:', error);
      diagnoseError(error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء الموافقة على الخطاب';
      setError(errorMessage);
      
      toast({
        title: 'خطأ',
        description: errorMessage,
        type: 'error',
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * رفض طلب
   */
  const rejectRequest = useCallback(async (data: RejectionData) => {
    console.log('rejectRequest called with:', data);
    
    if (!data.requestId) {
      toast({
        title: 'خطأ',
        description: 'معرف طلب الموافقة غير صالح',
        type: 'error',
      });
      return false;
    }

    if (!data.reason || data.reason.trim() === '') {
      toast({
        title: 'خطأ',
        description: 'يجب تحديد سبب الرفض',
        type: 'error',
      });
      return false;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Calling RPC reject_letter with:', {
        p_request_id: data.requestId,
        p_reason: data.reason,
      });
      
      const { error } = await supabase.rpc('reject_letter', {
        p_request_id: data.requestId,
        p_reason: data.reason,
      });

      if (error) throw error;
      
      // تحديث حالة الخطاب في الواجهة
      try {
        // يمكن إضافة تحديث للواجهة هنا إذا لزم الأمر
      } catch (updateError) {
        console.warn('Error updating UI after rejection:', updateError);
        // لا نريد إيقاف العملية إذا فشل تحديث الواجهة
      }

      toast({
        title: 'تم الرفض',
        description: 'تم رفض الخطاب بنجاح',
        type: 'success',
      });

      return true;
    } catch (error) {
      console.error('Error rejecting letter:', error);
      diagnoseError(error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء رفض الخطاب';
      setError(errorMessage);
      
      toast({
        title: 'خطأ',
        description: errorMessage,
        type: 'error',
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * الحصول على سجلات الموافقات لطلب محدد
   */
  const getApprovalLogs = useCallback(async (requestId: string) => {
    if (!requestId) {
      toast({
        title: 'خطأ',
        description: 'معرف طلب الموافقة غير صالح',
        type: 'error',
      });
      return [];
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('approval_logs')
        .select(`
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
        `)
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data as ApprovalLogWithDetails[];
    } catch (error) {
      console.error('Error fetching approval logs:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء جلب سجلات الموافقات';
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
    approveRequest,
    rejectRequest,
    getApprovalLogs
  };
}