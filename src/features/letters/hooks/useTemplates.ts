import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../hooks/useToast';
import type { Template } from '../../../types/database';

/**
 * هوك للتعامل مع قوالب الخطابات
 */
export function useTemplates() {
  const { toast } = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // استعلام لجلب جميع القوالب
  const { 
    data: templates = [], 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('letter_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as Template[];
    }
  });

  // استعلام لجلب تفاصيل القالب المحدد
  const { 
    data: selectedTemplate,
    isLoading: isLoadingTemplate
  } = useQuery({
    queryKey: ['template', selectedTemplateId],
    queryFn: async () => {
      if (!selectedTemplateId) return null;
      
      const { data, error } = await supabase
        .from('letter_templates')
        .select('*')
        .eq('id', selectedTemplateId)
        .single();
        
      if (error) throw error;
      return data as Template;
    },
    enabled: !!selectedTemplateId
  });

  // تحديد القالب
  const selectTemplate = useCallback((id: string) => {
    setSelectedTemplateId(id);
    return templates.find(t => t.id === id) || null;
  }, [templates]);

  // تحديث قائمة القوالب
  const refreshTemplates = useCallback(async () => {
    try {
      await refetch();
    } catch (err) {
      console.error('Error refreshing templates:', err);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث قائمة القوالب',
        type: 'error'
      });
    }
  }, [refetch, toast]);

  return {
    templates,
    isLoading,
    error,
    selectedTemplate,
    isLoadingTemplate,
    selectedTemplateId,
    selectTemplate,
    refreshTemplates
  };
}