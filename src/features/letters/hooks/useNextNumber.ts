import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../hooks/useToast';

/**
 * هوك للحصول على الرقم التالي للخطاب
 */
export function useNextNumber() {
  const [nextNumber, setNextNumber] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentYear] = useState(new Date().getFullYear());
  const { toast } = useToast();

  /**
   * تحميل الرقم التالي للخطاب
   */
  const loadNextNumber = useCallback(async (templateId: string) => {
    if (!templateId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('letters')
        .select('number')
        .eq('year', currentYear)
        .order('number', { ascending: false })
        .limit(1);

      if (error) throw error;

      const nextNum = data && data.length > 0 ? data[0].number + 1 : 1;
      setNextNumber(nextNum);
      
      return nextNum;
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
  }, [currentYear, toast]);

  return {
    nextNumber,
    currentYear,
    isLoading,
    error,
    loadNextNumber,
    setNextNumber
  };
}