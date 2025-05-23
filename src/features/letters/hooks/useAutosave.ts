import { useState, useCallback, useRef, useEffect } from 'react';
import { LetterDraft, LetterContent } from '../types';
import { useToast } from '../../../hooks/useToast';
import { saveDraft } from '../../../lib/db';
import { useAuth } from '../../../lib/auth';

interface AutosaveOptions {
  enabled?: boolean;
  interval?: number;
  onSave?: (draft: LetterDraft) => void;
}

/**
 * هوك للحفظ التلقائي للخطابات
 */
export function useAutosave(options: AutosaveOptions = {}) {
  const { enabled = true, interval = 60000, onSave } = options;
  
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const { dbUser, user } = useAuth();
  const { toast } = useToast();
  
  /**
   * بدء الحفظ التلقائي
   */
  const startAutosave = useCallback((
    templateId: string, 
    content: LetterContent, 
    nextNumber: number | null, 
    currentYear: number
  ) => {
    if (!enabled || !dbUser?.id || !templateId || !content.body) {
      return () => {};
    }

    // مسح أي مؤقت موجود
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // إعداد المؤقت الجديد
    timerRef.current = setInterval(async () => {
      try {
        setIsSaving(true);
        setError(null);
        
        const draft: LetterDraft = {
          user_id: dbUser.id,
          template_id: templateId,
          content,
          status: 'draft',
          number: nextNumber || undefined,
          year: currentYear,
          creator_name: dbUser?.full_name || user?.email,
          sync_status: 'pending'
        };
        
        const savedDraft = await saveDraft(draft);
        setLastSaved(new Date());
        
        if (onSave) {
          onSave(savedDraft);
        }
        
        console.log('تم الحفظ التلقائي للمسودة');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'حدث خطأ أثناء الحفظ التلقائي';
        setError(new Error(errorMessage));
        console.error('Error auto-saving draft:', err);
      } finally {
        setIsSaving(false);
      }
    }, interval);

    // إرجاع دالة التنظيف
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [dbUser, user, enabled, interval, onSave, toast]);
  
  // تنظيف المؤقت عند إزالة المكون
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);
  
  /**
   * تشغيل الحفظ يدوياً
   */
  const saveNow = useCallback(async (
    templateId: string, 
    content: LetterContent, 
    nextNumber: number | null, 
    currentYear: number
  ) => {
    if (!dbUser?.id || !templateId) return null;
    
    try {
      setIsSaving(true);
      setError(null);
      
      const draft: LetterDraft = {
        user_id: dbUser.id,
        template_id: templateId,
        content,
        status: 'draft',
        number: nextNumber || undefined,
        year: currentYear,
        creator_name: dbUser?.full_name || user?.email,
        sync_status: 'pending'
      };
      
      const savedDraft = await saveDraft(draft);
      setLastSaved(new Date());
      
      if (onSave) {
        onSave(savedDraft);
      }
      
      return savedDraft;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ أثناء الحفظ';
      setError(new Error(errorMessage));
      console.error('Error saving draft:', err);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [dbUser, user, onSave]);
  
  /**
   * إيقاف الحفظ التلقائي
   */
  const stopAutosave = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  
  return {
    startAutosave,
    saveNow,
    stopAutosave,
    isSaving,
    lastSaved,
    error
  };
}