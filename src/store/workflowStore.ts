import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { ApprovalRequest, ApprovalLog } from '../types/database';

interface WorkflowState {
  // حالة طلبات الموافقة
  pendingApprovals: any[];
  myRequests: ApprovalRequest[];
  currentRequest: ApprovalRequest | null;
  approvalLogs: ApprovalLog[];
  isLoading: boolean;
  error: string | null;
  
  // الإجراءات
  getPendingApprovals: () => Promise<any[]>;
  getMyRequests: () => Promise<ApprovalRequest[]>;
  getApprovalLogs: (requestId: string) => Promise<ApprovalLog[]>;
  requestApproval: (
    letterId: string,
    approverId: string,
    comments?: string,
    dueDate?: Date | string
  ) => Promise<string | null>;
  approveRequest: (
    requestId: string,
    comments?: string,
    signatureId?: string
  ) => Promise<boolean>;
  rejectRequest: (
    requestId: string,
    reason: string
  ) => Promise<boolean>;
  
  // تحديث الحالة
  setCurrentRequest: (request: ApprovalRequest | null) => void;
  clearError: () => void;
}

/**
 * مخزن Zustand لإدارة حالة سير العمل والموافقات
 * يوفر وظائف للتعامل مع طلبات الموافقة وسجلات الموافقات
 */
export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  // الحالة الأولية
  pendingApprovals: [],
  myRequests: [],
  currentRequest: null,
  approvalLogs: [],
  isLoading: false,
  error: null,
  
  // جلب طلبات الموافقة المعلقة
  getPendingApprovals: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const { data, error } = await supabase.rpc('get_pending_approvals');
      
      if (error) throw error;
      
      set({ pendingApprovals: data || [], isLoading: false });
      return data || [];
    } catch (error: any) {
      console.error('Error fetching pending approvals:', error);
      set({ 
        error: error.message || 'حدث خطأ أثناء جلب طلبات الموافقة', 
        isLoading: false 
      });
      return [];
    }
  },
  
  // جلب طلبات الموافقة الخاصة بي
  getMyRequests: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const { data: user } = await supabase.auth.getUser();
      const userId = user.user?.id;
      
      if (!userId) {
        throw new Error('لم يتم العثور على المستخدم');
      }
      
      const { data, error } = await supabase
        .from('approval_requests')
        .select(`
          *,
          letters:letter_id (*),
          approver:assigned_to (full_name, email)
        `)
        .eq('requested_by', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      set({ myRequests: data || [], isLoading: false });
      return data || [];
    } catch (error: any) {
      console.error('Error fetching my approval requests:', error);
      set({ 
        error: error.message || 'حدث خطأ أثناء جلب طلبات الموافقة الخاصة بك', 
        isLoading: false 
      });
      return [];
    }
  },
  
  // جلب سجلات الموافقات
  getApprovalLogs: async (requestId: string) => {
    set({ isLoading: true, error: null });
    
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
      
      set({ approvalLogs: data || [], isLoading: false });
      return data || [];
    } catch (error: any) {
      console.error('Error fetching approval logs:', error);
      set({ 
        error: error.message || 'حدث خطأ أثناء جلب سجلات الموافقات', 
        isLoading: false 
      });
      return [];
    }
  },
  
  // طلب موافقة
  requestApproval: async (
    letterId: string,
    approverId: string,
    comments?: string,
    dueDate?: Date | string
  ) => {
    set({ isLoading: true, error: null });
    
    try {
      const { data, error } = await supabase.rpc('create_approval_request', {
        p_letter_id: letterId,
        p_approver_id: approverId,
        p_comments: comments || null,
        p_due_date: dueDate ? new Date(dueDate).toISOString() : null
      });
      
      if (error) throw error;
      
      // تحديث قائمة طلبات الموافقة الخاصة بي
      get().getMyRequests();
      
      set({ isLoading: false });
      return data;
    } catch (error: any) {
      console.error('Error requesting approval:', error);
      set({ 
        error: error.message || 'حدث خطأ أثناء طلب الموافقة', 
        isLoading: false 
      });
      return null;
    }
  },
  
  // الموافقة على طلب
  approveRequest: async (
    requestId: string,
    comments?: string,
    signatureId?: string
  ) => {
    set({ isLoading: true, error: null });
    
    try {
      // إذا لم يتم توفير معرف التوقيع، نحاول الحصول على التوقيع الافتراضي
      if (!signatureId) {
        const { data: user } = await supabase.auth.getUser();
        const userId = user.user?.id;
        
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
        throw new Error('لا يمكن الموافقة بدون توقيع. يرجى تحميل توقيع أو تقديم معرف توقيع صالح.');
      }
      
      const { data, error } = await supabase.rpc('approve_letter_with_signature', {
        p_request_id: requestId,
        p_signature_id: signatureId,
        p_comments: comments || null
      });
      
      if (error) throw error;
      
      // تحديث قائمة طلبات الموافقة المعلقة
      get().getPendingApprovals();
      
      set({ isLoading: false });
      return true;
    } catch (error: any) {
      console.error('Error approving request:', error);
      set({ 
        error: error.message || 'حدث خطأ أثناء الموافقة على الطلب', 
        isLoading: false 
      });
      return false;
    }
  },
  
  // رفض طلب
  rejectRequest: async (
    requestId: string,
    reason: string
  ) => {
    set({ isLoading: true, error: null });
    
    try {
      const { data, error } = await supabase.rpc('reject_letter', {
        p_request_id: requestId,
        p_reason: reason
      });
      
      if (error) throw error;
      
      // تحديث قائمة طلبات الموافقة المعلقة
      get().getPendingApprovals();
      
      set({ isLoading: false });
      return true;
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      set({ 
        error: error.message || 'حدث خطأ أثناء رفض الطلب', 
        isLoading: false 
      });
      return false;
    }
  },
  
  // تعيين الطلب الحالي
  setCurrentRequest: (request) => set({ currentRequest: request }),
  
  // مسح الخطأ
  clearError: () => set({ error: null })
}));