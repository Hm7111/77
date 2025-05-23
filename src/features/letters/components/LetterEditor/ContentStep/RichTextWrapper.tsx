import React, { Suspense } from 'react';
import { RichTextEditor } from '../../../../../components/letters/RichTextEditor';

interface RichTextWrapperProps {
  value: string;
  onChange: (value: string) => void;
  style?: React.CSSProperties;
  onShowTemplateSelector?: () => void;
  editorType: 'tinymce';
  inlineMode?: boolean;
}

/**
 * مغلف لمحرر النصوص المتقدم مع دعم التحميل الكسول
 */
export default function RichTextWrapper({
  value,
  onChange,
  style,
  onShowTemplateSelector,
  editorType,
  inlineMode = false
}: RichTextWrapperProps) {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <div className="letter-editor">
        <RichTextEditor
          value={value}
          onChange={onChange}
          style={style}
          onShowTemplateSelector={onShowTemplateSelector}
          editorType={editorType}
          inlineMode={inlineMode}
        />
      </div>
    </Suspense>
  );
}