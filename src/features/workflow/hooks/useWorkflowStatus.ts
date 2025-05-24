import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../hooks/useToast';
import { WorkflowState } from '../types';

/**
 * هوك لإدارة حالة سير العمل للخطابات
 */
export function useWorkflowStatus() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  /**
   * تحديث حالة سير عمل الخطاب
   */
  const updateWorkflowStatus = useCallback(async (letterId: string, status: WorkflowState) => {
    if (!letterId) {
      toast({
        title: 'خطأ',
        description: 'معرف الخطاب غير صالح',
        type: 'error',
      });
      return false;
    }

    setIsLoading(true);
    setError(null);
    
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
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث حالة سير العمل';
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
   * الحصول على حالة سير العمل الحالية للخطاب
   */
  const getWorkflowStatus = useCallback(async (letterId: string) => {
    if (!letterId) return null;

    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('letters')
        .select('workflow_status, approval_id')
        .eq('id', letterId)
        .single();

      if (error) throw error;

      return data.workflow_status as WorkflowState;
    } catch (error) {
      console.error('Error fetching workflow status:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء جلب حالة سير العمل';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    updateWorkflowStatus,
    getWorkflowStatus
  };
}