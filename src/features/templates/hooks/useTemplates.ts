import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../hooks/useToast';
import type { Template } from '../../../types/database';

/**
 * هوك لإدارة قوالب الخطابات
 */
export function useTemplates() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  
  // استعلام لجلب القوالب
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
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      
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

  // إضافة قالب جديد
  const createTemplate = useCallback(async (template: Partial<Template>) => {
    try {
      const { data, error } = await supabase
        .from('letter_templates')
        .insert(template)
        .select()
        .single();
      
      if (error) throw error;
      
      // تحديث القائمة
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      
      toast({
        title: 'تمت الإضافة',
        description: 'تم إضافة القالب بنجاح',
        type: 'success'
      });
      
      return data as Template;
    } catch (error) {
      console.error('Error creating template:', error);
      
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إضافة القالب',
        type: 'error'
      });
      
      return null;
    }
  }, [queryClient, toast]);

  // تحديث قالب موجود
  const updateTemplate = useCallback(async (id: string, template: Partial<Template>) => {
    try {
      const { data, error } = await supabase
        .from('letter_templates')
        .update(template)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // تحديث القائمة
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template', id] });
      
      toast({
        title: 'تم التحديث',
        description: 'تم تحديث القالب بنجاح',
        type: 'success'
      });
      
      return data as Template;
    } catch (error) {
      console.error('Error updating template:', error);
      
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحديث القالب',
        type: 'error'
      });
      
      return null;
    }
  }, [queryClient, toast]);

  // حذف قالب
  const deleteTemplate = useCallback(async (id: string) => {
    try {
      // التحقق من استخدام القالب
      const { count, error: countError } = await supabase
        .from('letters')
        .select('*', { count: 'exact', head: true })
        .eq('template_id', id);
      
      if (countError) throw countError;
      
      // إذا كان القالب مستخدم، نمنع الحذف الكامل
      if (count && count > 0) {
        // تعيين is_deleted إلى true
        const { error } = await supabase
          .from('letter_templates')
          .update({ is_deleted: true })
          .eq('id', id);
        
        if (error) throw error;
        
        toast({
          title: 'تم الإلغاء',
          description: `تم إلغاء القالب لوجود ${count} خطاب يستخدمه`,
          type: 'warning'
        });
      } else {
        // حذف القالب تماماً
        const { error } = await supabase
          .from('letter_templates')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        toast({
          title: 'تم الحذف',
          description: 'تم حذف القالب بنجاح',
          type: 'success'
        });
      }
      
      // تحديث القائمة
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      
      return true;
    } catch (error) {
      console.error('Error deleting template:', error);
      
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حذف القالب',
        type: 'error'
      });
      
      return false;
    }
  }, [queryClient, toast]);

  // تغيير حالة التفعيل
  const toggleActive = useCallback(async (template: Template) => {
    try {
      const { error } = await supabase
        .from('letter_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id);
      
      if (error) throw error;
      
      // تحديث القائمة
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      
      toast({
        title: template.is_active ? 'تم التعطيل' : 'تم التفعيل',
        description: template.is_active 
          ? 'تم تعطيل القالب بنجاح' 
          : 'تم تفعيل القالب بنجاح',
        type: 'success'
      });
      
      return !template.is_active;
    } catch (error) {
      console.error('Error toggling template active state:', error);
      
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحديث حالة القالب',
        type: 'error'
      });
      
      return template.is_active;
    }
  }, [queryClient, toast]);

  return {
    templates,
    selectedTemplate,
    isLoading,
    isLoadingTemplate,
    error,
    selectedTemplateId,
    setSelectedTemplateId,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleActive,
    refetch
  };
}