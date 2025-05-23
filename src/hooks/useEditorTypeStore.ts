import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface EditorTypeState {
  editorType: 'tinymce';
  setEditorType: (editorType: 'tinymce') => void;
}

/**
 * مخزن لحفظ نوع المحرر المفضل
 * يستخدم persist للاحتفاظ بالقيمة في localStorage
 */
export const useEditorTypeStore = create<EditorTypeState>()(
  persist(
    (set) => ({
      editorType: 'tinymce',
      setEditorType: (editorType) => set({ editorType }),
    }),
    {
      name: 'editor-type-storage',
    }
  )
);