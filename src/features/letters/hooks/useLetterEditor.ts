import { useState, useCallback, useEffect, RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../lib/auth';
import { LetterContent, EditorConfig, EditorState } from '../types';
import { useLetters } from '../../../hooks/useLetters';
import { useToast } from '../../../hooks/useToast';

interface UseLetterEditorProps {
  letterRef?: RefObject<HTMLDivElement>;
}

/**
 * هوك مخصص لإدارة حالة محرر الخطابات
 */
export function useLetterEditor({ letterRef }: UseLetterEditorProps = {}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { dbUser, user } = useAuth();
  const { saveDraft, createLetter } = useLetters();
  
  // حالة المحرر
  const [editorState, setEditorState] = useState<EditorState>({
    activeStep: 1,
    previewMode: false,
    showGuides: false,
    editorStyle: 'outside',
    previewScale: 'fit',
    livePreview: true,
    showQRInEditor: false,
    showTemplateSelector: false,
    editorType: 'tinymce',
    showEditorControls: true,
    autosaveEnabled: true,
  });
  
  // إعدادات المحرر
  const [editorConfig, setEditorConfig] = useState<EditorConfig>({
    fontSize: '16px',
    lineHeight: 1.5,
    fontFamily: 'Cairo',
  });
  
  // محتوى الخطاب
  const [content, setContent] = useState<LetterContent>({
    date: new Date().toLocaleDateString('ar-SA'),
    subject: '',
    to: ''
  });
  
  // معرف القالب المحدد
  const [templateId, setTemplateId] = useState<string>('');
  
  // حالات التحميل
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  // التاريخ ومنتقي التاريخ
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentYear] = useState(new Date().getFullYear());
  const [nextNumber, setNextNumber] = useState<number | null>(null);

  // تحديث الخطوة النشطة
  const setActiveStep = useCallback((step: number) => {
    setEditorState(prev => ({ ...prev, activeStep: step }));
  }, []);

  // تبديل وضع المعاينة
  const togglePreviewMode = useCallback(() => {
    setEditorState(prev => ({ ...prev, previewMode: !prev.previewMode }));
  }, []);

  // تبديل إظهار الدلائل
  const toggleShowGuides = useCallback(() => {
    setEditorState(prev => ({ ...prev, showGuides: !prev.showGuides }));
  }, []);

  // تبديل نمط المحرر
  const toggleEditorStyle = useCallback(() => {
    setEditorState(prev => ({ 
      ...prev, 
      editorStyle: prev.editorStyle === 'inside' ? 'outside' : 'inside' 
    }));
  }, []);

  // تبديل إظهار أدوات المحرر
  const toggleShowEditorControls = useCallback(() => {
    setEditorState(prev => ({ 
      ...prev, 
      showEditorControls: !prev.showEditorControls 
    }));
  }, []);

  // تبديل إظهار منتقي النماذج النصية
  const toggleShowTemplateSelector = useCallback(() => {
    setEditorState(prev => ({ 
      ...prev, 
      showTemplateSelector: !prev.showTemplateSelector 
    }));
  }, []);

  // تبديل التخزين التلقائي
  const toggleAutosaveEnabled = useCallback(() => {
    setEditorState(prev => ({ 
      ...prev, 
      autosaveEnabled: !prev.autosaveEnabled 
    }));
  }, []);

  // تحديث حالة المحرر
  const updateEditorState = useCallback((state: Partial<EditorState>) => {
    setEditorState(prev => ({ ...prev, ...state }));
  }, []);

  // تحديث محتوى الخطاب
  const updateContent = useCallback((newContent: Partial<LetterContent>) => {
    setContent(prev => ({ ...prev, ...newContent }));
  }, []);

  // تحديث إعدادات المحرر
  const updateEditorConfig = useCallback((config: Partial<EditorConfig>) => {
    setEditorConfig(prev => ({ ...prev, ...config }));
  }, []);

  // تكبير منطقة المعاينة
  const zoomPreview = useCallback(() => {
    if (letterRef?.current) {
      // تنفيذ منطق التكبير هنا
    }
  }, [letterRef]);

  // حفظ الخطاب كمسودة
  const saveAsDraft = useCallback(async () => {
    if (!dbUser?.id || !templateId) return;
    
    try {
      setIsLoading(true);
      
      // تحسين: تقليل حجم template_snapshot
      // فقط حفظ البيانات الضرورية من القالب
      const selectedTemplate = await getTemplateMinimalData(templateId);
      
      const draft = await saveDraft({
        user_id: dbUser.id,
        template_id: templateId,
        template_snapshot: selectedTemplate, // استخدام النسخة المصغرة
        content,
        status: 'draft',
        number: nextNumber,
        year: currentYear,
        creator_name: dbUser?.full_name || user?.email,
        sync_status: 'pending'
      });
      
      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ المسودة بنجاح',
        type: 'success'
      });
      
      setTimeout(() => navigate('/admin/letters'), 1000);
      return draft;
    } catch (error) {
      console.error('Error saving draft:', error);
      
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حفظ المسودة',
        type: 'error'
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [dbUser, user, templateId, content, nextNumber, currentYear, toast, navigate, saveDraft]);

  // إنشاء وحفظ الخطاب بشكل نهائي
  const createAndSaveLetter = useCallback(async () => {
    if (!dbUser?.id || !templateId || !content.body) {
      toast({
        title: 'خطأ',
        description: 'يجب ملء جميع المعلومات المطلوبة',
        type: 'error'
      });
      return null;
    }
    
    setIsLoading(true);
    const verificationUrl = crypto.randomUUID();

    try {
      // تحسين: تقليل حجم template_snapshot
      // فقط حفظ البيانات الضرورية من القالب
      const selectedTemplate = await getTemplateMinimalData(templateId);
      
      // إنشاء مسودة أولاً
      const draft = await saveDraft({
        user_id: dbUser.id,
        template_id: templateId,
        template_snapshot: selectedTemplate, // استخدام النسخة المصغرة
        content: {
          ...content,
          verification_url: verificationUrl
        },
        status: 'completed',
        number: nextNumber,
        year: currentYear,
        creator_name: dbUser?.full_name || user?.email,
        sync_status: 'pending',
        verification_url: verificationUrl
      });

      // إنشاء الخطاب النهائي
      const letter = await createLetter(draft);
      
      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ الخطاب بنجاح',
        type: 'success'
      });
      
      setIsSaved(true);
      setTimeout(() => navigate('/admin/letters'), 2000);
      
      return letter;
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير متوقع أثناء إنشاء الخطاب';
      
      toast({
        title: 'خطأ',
        description: errorMessage,
        type: 'error'
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [dbUser, user, templateId, content, nextNumber, currentYear, saveDraft, createLetter, toast, navigate]);

  // وظيفة مساعدة للحصول على بيانات مصغرة من القالب
  async function getTemplateMinimalData(templateId: string) {
    try {
      const { data } = await supabase
        .from('letter_templates')
        .select(`
          id, 
          name, 
          image_url, 
          qr_position,
          letter_elements,
          version
        `)
        .eq('id', templateId)
        .single();
      
      return data;
    } catch (error) {
      console.error('Error fetching template minimal data:', error);
      return null;
    }
  }

  // وظائف إضافية للمحرر
  return {
    // الحالة
    editorState,
    editorConfig,
    content,
    templateId,
    isLoading,
    isSaved,
    showDatePicker,
    currentYear,
    nextNumber,
    
    // الإجراءات
    setActiveStep,
    togglePreviewMode,
    toggleShowGuides,
    toggleEditorStyle,
    toggleShowEditorControls,
    toggleShowTemplateSelector,
    toggleAutosaveEnabled,
    updateEditorState,
    updateContent,
    updateEditorConfig,
    setTemplateId,
    zoomPreview,
    setShowDatePicker,
    setNextNumber,
    
    // الحفظ والإنشاء
    saveAsDraft,
    createAndSaveLetter
  };
}