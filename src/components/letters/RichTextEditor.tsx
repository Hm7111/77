import React, { useState } from 'react';
import { TinyEditor } from './TinyEditor';
import { EditorSelector } from './EditorSelector';
import { motion } from 'framer-motion';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  style?: React.CSSProperties;
  readOnly?: boolean;
  placeholder?: string;
  onShowTemplateSelector?: () => void;
  inlineMode?: boolean;
  editorType?: 'tinymce';
  allowEditorSelection?: boolean;
}

/**
 * مكون محرر النصوص المتقدم مع دعم كامل للغة العربية
 * يضمن توافق العرض والتصدير مع المعاينة بنسبة 100%
 */
export function RichTextEditor({
  value = '',
  onChange,
  style,
  readOnly = false,
  placeholder = 'ابدأ الكتابة هنا...',
  onShowTemplateSelector,
  inlineMode = false,
  editorType = 'tinymce',
  allowEditorSelection = true,
}: RichTextEditorProps) {
  // حالة المحرر النشط
  const [currentEditor] = useState<'tinymce'>('tinymce');
  
  // تأثير الظهور التدريجي
  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } }
  };

  // التأكد من توحيد خصائص التنسيق بين المحرر والمعاينة
  const editorStyles = {
    fontSize: style?.fontSize || '14px',
    lineHeight: style?.lineHeight || 1.5,
    height: inlineMode ? style?.height || '602px' : style?.height || '602px',
    ...style
  };

  return (
    <motion.div 
      className="rich-text-editor-container letter-editor" 
      dir="rtl"
      initial="hidden"
      animate="visible"
      variants={fadeIn}
    >
      {allowEditorSelection && !readOnly && (
        <div className="mb-3 flex justify-end">
          <EditorSelector 
            currentEditor={currentEditor} 
            onSelectEditor={() => {}} // حالياً نستخدم TinyMCE فقط
          />
        </div>
      )}
      
      <TinyEditor
        value={value || ''}
        onChange={onChange}
        style={editorStyles}
        readOnly={readOnly}
        placeholder={placeholder}
        onShowTemplateSelector={onShowTemplateSelector}
        inlineMode={inlineMode}
      />
    </motion.div>
  );
}