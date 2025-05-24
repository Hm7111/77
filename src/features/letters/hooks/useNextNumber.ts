import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../hooks/useToast';
import { useAuth } from '../../../lib/auth';

/**
 * هوك للحصول على الرقم التالي للخطاب
 */
export function useNextNumber() {
  const [nextNumber, setNextNumber] = useState<number | null>(null);
  const [branchCode, setBranchCode] = useState<string>('');
  const [letterReference, setLetterReference] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentYear] = useState(new Date().getFullYear());
  const { toast } = useToast();
  const { dbUser } = useAuth();

  /**
   * تحميل الرقم التالي للخطاب بناءً على الفرع
   */
  const loadNextNumber = useCallback(async (templateId: string) => {
    if (!templateId) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // أولاً: الحصول على رمز الفرع للمستخدم الحالي
      let code = 'GEN'; // رمز افتراضي (عام)
      
      if (dbUser?.branch_id) {
        const { data: branchData, error: branchError } = await supabase
          .from('branches')
          .select('code')
          .eq('id', dbUser.branch_id)
          .single();
        
        if (branchError) {
          console.warn('Error fetching branch code:', branchError);
        } else if (branchData) {
          code = branchData.code;
        }
      }
      
      setBranchCode(code);
      
      // ثانياً: الحصول على أعلى رقم للسنة الحالية والفرع المحدد
      const { data, error } = await supabase
        .from('letters')
        .select('number')
        .eq('year', currentYear)
        .eq('branch_code', code)
        .order('number', { ascending: false })
        .limit(1);

      if (error) throw error;

      const nextNum = data && data.length > 0 ? data[0].number + 1 : 1;
      setNextNumber(nextNum);
      
      // إنشاء المرجع المركب للخطاب
      const reference = `${code}-${nextNum}/${currentYear}`;
      setLetterReference(reference);
      
      return { 
        number: nextNum, 
        branchCode: code, 
        reference: reference 
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ أثناء تحميل رقم الخطاب التالي';
      setError(new Error(errorMessage));
      
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل رقم الخطاب التالي',
        type: 'warning'
      });
      
      console.error('Error loading next number:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentYear, toast, dbUser]);

  return {
    nextNumber,
    branchCode,
    letterReference,
    currentYear,
    isLoading,
    error,
    loadNextNumber,
    setNextNumber
  };
}