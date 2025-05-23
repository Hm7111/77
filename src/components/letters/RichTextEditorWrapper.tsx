import React from 'react';
import { RichTextEditor } from './RichTextEditor';
import { useEditorTypeStore } from '../../hooks/useEditorTypeStore';

interface RichTextEditorWrapperProps {
  value: string;
  onChange: (value: string) => void;
  style?: React.CSSProperties;
  readOnly?: boolean;
  placeholder?: string;
  onShowTemplateSelector?: () => void;
  inlineMode?: boolean;
  preferredEditorType?: 'tinymce';
}

/**
 * مكون تغليف لمحرر النصوص لتبسيط واجهة الاستخدام
 * يستخدم RichTextEditor ولكن مع إعدادات مبسطة
 */
export function RichTextEditorWrapper({
  value,
  onChange,
  style,
  readOnly = false,
  placeholder = 'ابدأ الكتابة هنا...',
  onShowTemplateSelector,
  inlineMode = false,
  preferredEditorType
}: RichTextEditorWrapperProps) {
  const { editorType } = useEditorTypeStore();
  
  return (
    <RichTextEditor
      value={value}
      onChange={onChange}
      style={style}
      readOnly={readOnly}
      placeholder={placeholder}
      onShowTemplateSelector={onShowTemplateSelector}
      inlineMode={inlineMode}
      editorType="tinymce"
      allowEditorSelection={!readOnly}
    />
  );
}