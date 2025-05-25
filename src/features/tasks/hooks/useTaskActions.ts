import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { useToast } from '../../../hooks/useToast';
import { TaskFormData, TaskUpdate, TaskComment, Task, TaskLog } from '../types';

/**
 * هوك لإدارة عمليات المهام مثل الإنشاء والتحديث والحذف
 */
export function useTaskActions() {
  const { toast } = useToast();
  const { dbUser } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  
  /**
   * جلب تفاصيل مهمة محددة مع سجلات التغييرات
   */
  const useTaskDetails = (taskId: string | undefined) => {
    return useQuery({
      queryKey: ['task', taskId],
      queryFn: async () => {
        if (!taskId) return null;
        
        // جلب بيانات المهمة
        const { data: task, error } = await supabase
          .from('tasks')
          .select(`
            *,
            creator:created_by(id, full_name, email, role),
            assignee:assigned_to(id, full_name, email, role),
            branch:branch_id(id, name, code)
          `)
          .eq('id', taskId)
          .single();
          
        if (error) throw error;
        
        // جلب سجلات التغييرات
        const { data: logs, error: logsError } = await supabase
          .from('task_logs')
          .select(`
            *,
            user:user_id(id, full_name, email, role)
          `)
          .eq('task_id', taskId)
          .order('created_at', { ascending: false });
          
        if (logsError) throw logsError;
        
        // جلب المرفقات
        const { data: attachments, error: attachmentsError } = await supabase
          .from('task_attachments')
          .select(`
            *,
            user:uploaded_by(id, full_name, email, role)
          `)
          .eq('task_id', taskId)
          .order('uploaded_at', { ascending: false });
          
        if (attachmentsError) throw attachmentsError;
        
        return {
          ...task,
          logs: logs || [],
          attachments: attachments || []
        };
      },
      enabled: !!taskId && !!dbUser?.id
    });
  };

  /**
   * إنشاء مهمة جديدة
   */
  const createTask = useMutation({
    mutationFn: async (taskData: TaskFormData) => {
      if (!dbUser?.id) throw new Error('يجب تسجيل الدخول لإنشاء مهمة');
      
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          created_by: dbUser.id,
          branch_id: taskData.branch_id || dbUser.branch_id
        })
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'تم بنجاح',
        description: 'تم إنشاء المهمة بنجاح',
        type: 'success'
      });
      
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-summary'] });
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل في إنشاء المهمة',
        type: 'error'
      });
    }
  });

  /**
   * تحديث بيانات مهمة
   */
  const updateTask = useMutation({
    mutationFn: async (taskUpdate: TaskUpdate) => {
      if (!dbUser?.id) throw new Error('يجب تسجيل الدخول لتحديث المهمة');
      
      const { id, ...updateData } = taskUpdate;
      
      setLoading(prev => ({ ...prev, [id]: true }));
      
      const { data, error } = await supabase
        .from('tasks')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      
      setLoading(prev => ({ ...prev, [id]: false }));
      return data;
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'تم بنجاح',
        description: 'تم تحديث المهمة بنجاح',
        type: 'success'
      });
      
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['task-summary'] });
    },
    onError: (error, variables) => {
      console.error('Error updating task:', error);
      setLoading(prev => ({ ...prev, [variables.id]: false }));
      
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل في تحديث المهمة',
        type: 'error'
      });
    }
  });

  /**
   * تغيير حالة المهمة
   */
  const updateTaskStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: Task['status'] }) => {
      if (!dbUser?.id) throw new Error('يجب تسجيل الدخول لتحديث حالة المهمة');
      
      setLoading(prev => ({ ...prev, [`status_${id}`]: true }));
      
      const { data, error } = await supabase
        .from('tasks')
        .update({ 
          status, 
          completion_date: status === 'completed' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      
      setLoading(prev => ({ ...prev, [`status_${id}`]: false }));
      return data;
    },
    onSuccess: (_, variables) => {
      const statusLabels = {
        new: 'جديدة',
        in_progress: 'قيد التنفيذ',
        completed: 'مكتملة',
        rejected: 'مرفوضة',
        postponed: 'مؤجلة'
      };
      
      toast({
        title: 'تم تحديث الحالة',
        description: `تم تغيير حالة المهمة إلى "${statusLabels[variables.status]}"`,
        type: 'success'
      });
      
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['task-summary'] });
    },
    onError: (error, variables) => {
      console.error('Error updating task status:', error);
      setLoading(prev => ({ ...prev, [`status_${variables.id}`]: false }));
      
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل في تحديث حالة المهمة',
        type: 'error'
      });
    }
  });

  /**
   * إضافة تعليق للمهمة
   */
  const addTaskComment = useMutation({
    mutationFn: async (comment: TaskComment) => {
      if (!dbUser?.id) throw new Error('يجب تسجيل الدخول لإضافة تعليق');
      
      setLoading(prev => ({ ...prev, [`comment_${comment.task_id}`]: true }));
      
      const { data, error } = await supabase.rpc('add_task_comment', {
        p_task_id: comment.task_id,
        p_user_id: dbUser.id,
        p_comment: comment.notes
      });
      
      if (error) throw error;
      
      setLoading(prev => ({ ...prev, [`comment_${comment.task_id}`]: false }));
      return data;
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'تم إضافة التعليق',
        description: 'تم إضافة التعليق بنجاح',
        type: 'success'
      });
      
      queryClient.invalidateQueries({ queryKey: ['task', variables.task_id] });
    },
    onError: (error, variables) => {
      console.error('Error adding comment:', error);
      setLoading(prev => ({ ...prev, [`comment_${variables.task_id}`]: false }));
      
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل في إضافة التعليق',
        type: 'error'
      });
    }
  });

  /**
   * حذف (إلغاء تنشيط) مهمة
   */
  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      if (!dbUser?.id) throw new Error('يجب تسجيل الدخول لحذف المهمة');
      
      setLoading(prev => ({ ...prev, [`delete_${id}`]: true }));
      
      const { error } = await supabase
        .from('tasks')
        .update({ is_active: false })
        .eq('id', id);
        
      if (error) throw error;
      
      setLoading(prev => ({ ...prev, [`delete_${id}`]: false }));
      return true;
    },
    onSuccess: () => {
      toast({
        title: 'تم الحذف',
        description: 'تم حذف المهمة بنجاح',
        type: 'success'
      });
      
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-summary'] });
    },
    onError: (error, id) => {
      console.error('Error deleting task:', error);
      setLoading(prev => ({ ...prev, [`delete_${id}`]: false }));
      
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل في حذف المهمة',
        type: 'error'
      });
    }
  });

  /**
   * رفع مرفق للمهمة
   */
  const uploadTaskAttachment = useMutation({
    mutationFn: async ({ taskId, file }: { taskId: string, file: File }) => {
      if (!dbUser?.id) throw new Error('يجب تسجيل الدخول لرفع مرفق');
      
      setLoading(prev => ({ ...prev, [`upload_${taskId}`]: true }));
      
      try {
        // رفع الملف إلى التخزين
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${taskId}/${fileName}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('task_attachments')
          .upload(filePath, file);
          
        if (uploadError) throw uploadError;
        
        // الحصول على الرابط العام
        const { data: { publicUrl } } = supabase.storage
          .from('task_attachments')
          .getPublicUrl(filePath);
        
        // تسجيل المرفق في قاعدة البيانات
        const { data, error } = await supabase
          .from('task_attachments')
          .insert({
            task_id: taskId,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            file_url: publicUrl,
            uploaded_by: dbUser.id
          })
          .select()
          .single();
          
        if (error) throw error;
        
        setLoading(prev => ({ ...prev, [`upload_${taskId}`]: false }));
        return data;
      } catch (error) {
        setLoading(prev => ({ ...prev, [`upload_${taskId}`]: false }));
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'تم الرفع',
        description: 'تم رفع المرفق بنجاح',
        type: 'success'
      });
      
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
    },
    onError: (error, variables) => {
      console.error('Error uploading attachment:', error);
      setLoading(prev => ({ ...prev, [`upload_${variables.taskId}`]: false }));
      
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل في رفع المرفق',
        type: 'error'
      });
    }
  });

  /**
   * حذف مرفق للمهمة
   */
  const deleteTaskAttachment = useMutation({
    mutationFn: async ({ id, taskId, fileUrl }: { id: string, taskId: string, fileUrl: string }) => {
      if (!dbUser?.id) throw new Error('يجب تسجيل الدخول لحذف المرفق');
      
      setLoading(prev => ({ ...prev, [`delete_attachment_${id}`]: true }));
      
      // حذف الملف من التخزين
      const filePath = fileUrl.split('/').slice(-2).join('/');
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('task_attachments')
          .remove([filePath]);
        
        if (storageError) {
          console.warn('Error removing file from storage:', storageError);
          // نستمر على الرغم من ذلك لحذف السجل
        }
      }
      
      // حذف السجل من قاعدة البيانات
      const { error } = await supabase
        .from('task_attachments')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setLoading(prev => ({ ...prev, [`delete_attachment_${id}`]: false }));
      return true;
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'تم الحذف',
        description: 'تم حذف المرفق بنجاح',
        type: 'success'
      });
      
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
    },
    onError: (error, variables) => {
      console.error('Error deleting attachment:', error);
      setLoading(prev => ({ ...prev, [`delete_attachment_${variables.id}`]: false }));
      
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل في حذف المرفق',
        type: 'error'
      });
    }
  });

  return {
    loading,
    useTaskDetails,
    createTask: createTask.mutate,
    isCreateLoading: createTask.isLoading,
    updateTask: updateTask.mutate,
    updateTaskStatus: updateTaskStatus.mutate,
    addTaskComment: addTaskComment.mutate,
    deleteTask: deleteTask.mutate,
    uploadTaskAttachment: uploadTaskAttachment.mutate,
    deleteTaskAttachment: deleteTaskAttachment.mutate
  };
}