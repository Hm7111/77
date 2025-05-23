import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type { Letter } from '../types/database';

interface LetterState {
  // حالة الخطابات
  letters: Letter[];
  drafts: Letter[];
  currentLetter: Letter | null;
  isLoading: boolean;
  error: string | null;
  
  // الفلترة والبحث
  searchTerm: string;
  filters: {
    status: 'all' | 'draft' | 'completed';
    date: 'all' | 'today' | 'week' | 'month' | 'year';
    category?: string;
  };
  
  // الإجراءات
  fetchLetters: () => Promise<void>;
  fetchDrafts: () => Promise<void>;
  fetchLetterById: (id: string) => Promise<Letter | null>;
  createLetter: (letter: Partial<Letter>) => Promise<Letter | null>;
  updateLetter: (id: string, updates: Partial<Letter>) => Promise<Letter | null>;
  deleteLetter: (id: string) => Promise<boolean>;
  saveDraft: (draft: Partial<Letter>) => Promise<Letter | null>;
  
  // تحديث الحالة
  setSearchTerm: (term: string) => void;
  setFilters: (filters: Partial<typeof LetterState.prototype.filters>) => void;
  resetFilters: () => void;
  setCurrentLetter: (letter: Letter | null) => void;
}

/**
 * مخزن Zustand لإدارة حالة الخطابات
 * يوفر وظائف للتعامل مع الخطابات والمسودات والفلترة والبحث
 */
export const useLetterStore = create<LetterState>()(
  persist(
    (set, get) => ({
      // الحالة الأولية
      letters: [],
      drafts: [],
      currentLetter: null,
      isLoading: false,
      error: null,
      
      // الفلترة والبحث
      searchTerm: '',
      filters: {
        status: 'all',
        date: 'all',
      },
      
      // جلب جميع الخطابات
      fetchLetters: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const { data, error } = await supabase
            .from('letters')
            .select('*, letter_templates(*)')
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          
          set({ letters: data || [], isLoading: false });
        } catch (error: any) {
          console.error('Error fetching letters:', error);
          set({ 
            error: error.message || 'حدث خطأ أثناء جلب الخطابات', 
            isLoading: false 
          });
        }
      },
      
      // جلب المسودات
      fetchDrafts: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const { data, error } = await supabase
            .from('letters')
            .select('*, letter_templates(*)')
            .eq('status', 'draft')
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          
          set({ drafts: data || [], isLoading: false });
        } catch (error: any) {
          console.error('Error fetching drafts:', error);
          set({ 
            error: error.message || 'حدث خطأ أثناء جلب المسودات', 
            isLoading: false 
          });
        }
      },
      
      // جلب خطاب بواسطة المعرف
      fetchLetterById: async (id: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const { data, error } = await supabase
            .from('letters')
            .select('*, letter_templates(*)')
            .eq('id', id)
            .single();
          
          if (error) throw error;
          
          set({ currentLetter: data, isLoading: false });
          return data;
        } catch (error: any) {
          console.error('Error fetching letter:', error);
          set({ 
            error: error.message || 'حدث خطأ أثناء جلب الخطاب', 
            isLoading: false 
          });
          return null;
        }
      },
      
      // إنشاء خطاب جديد
      createLetter: async (letter: Partial<Letter>) => {
        set({ isLoading: true, error: null });
        
        try {
          const { data, error } = await supabase
            .from('letters')
            .insert(letter)
            .select('*, letter_templates(*)')
            .single();
          
          if (error) throw error;
          
          // تحديث قائمة الخطابات
          const letters = get().letters;
          set({ 
            letters: [data, ...letters], 
            currentLetter: data, 
            isLoading: false 
          });
          
          return data;
        } catch (error: any) {
          console.error('Error creating letter:', error);
          set({ 
            error: error.message || 'حدث خطأ أثناء إنشاء الخطاب', 
            isLoading: false 
          });
          return null;
        }
      },
      
      // تحديث خطاب
      updateLetter: async (id: string, updates: Partial<Letter>) => {
        set({ isLoading: true, error: null });
        
        try {
          const { data, error } = await supabase
            .from('letters')
            .update(updates)
            .eq('id', id)
            .select('*, letter_templates(*)')
            .single();
          
          if (error) throw error;
          
          // تحديث قائمة الخطابات والخطاب الحالي
          const letters = get().letters.map(letter => 
            letter.id === id ? data : letter
          );
          
          set({ 
            letters, 
            currentLetter: data, 
            isLoading: false 
          });
          
          return data;
        } catch (error: any) {
          console.error('Error updating letter:', error);
          set({ 
            error: error.message || 'حدث خطأ أثناء تحديث الخطاب', 
            isLoading: false 
          });
          return null;
        }
      },
      
      // حذف خطاب
      deleteLetter: async (id: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const { error } = await supabase
            .from('letters')
            .delete()
            .eq('id', id);
          
          if (error) throw error;
          
          // تحديث قائمة الخطابات
          const letters = get().letters.filter(letter => letter.id !== id);
          const drafts = get().drafts.filter(draft => draft.id !== id);
          const currentLetter = get().currentLetter?.id === id ? null : get().currentLetter;
          
          set({ letters, drafts, currentLetter, isLoading: false });
          return true;
        } catch (error: any) {
          console.error('Error deleting letter:', error);
          set({ 
            error: error.message || 'حدث خطأ أثناء حذف الخطاب', 
            isLoading: false 
          });
          return false;
        }
      },
      
      // حفظ مسودة
      saveDraft: async (draft: Partial<Letter>) => {
        set({ isLoading: true, error: null });
        
        try {
          const { data, error } = await supabase
            .from('letters')
            .insert({ ...draft, status: 'draft' })
            .select('*, letter_templates(*)')
            .single();
          
          if (error) throw error;
          
          // تحديث قائمة المسودات
          const drafts = get().drafts;
          set({ 
            drafts: [data, ...drafts], 
            isLoading: false 
          });
          
          return data;
        } catch (error: any) {
          console.error('Error saving draft:', error);
          set({ 
            error: error.message || 'حدث خطأ أثناء حفظ المسودة', 
            isLoading: false 
          });
          return null;
        }
      },
      
      // تعيين مصطلح البحث
      setSearchTerm: (term: string) => set({ searchTerm: term }),
      
      // تعيين الفلاتر
      setFilters: (filters) => set({ 
        filters: { ...get().filters, ...filters } 
      }),
      
      // إعادة تعيين الفلاتر
      resetFilters: () => set({ 
        filters: { status: 'all', date: 'all' },
        searchTerm: '' 
      }),
      
      // تعيين الخطاب الحالي
      setCurrentLetter: (letter) => set({ currentLetter: letter })
    }),
    {
      name: 'letter-store',
      partialize: (state) => ({
        // تخزين فقط الفلاتر ومصطلح البحث في التخزين المحلي
        filters: state.filters,
        searchTerm: state.searchTerm
      })
    }
  )
);