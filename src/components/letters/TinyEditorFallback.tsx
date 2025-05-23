import React, { useEffect, useRef, useState } from 'react';

interface TinyEditorFallbackProps {
  value: string;
  onChange: (value: string) => void;
  style?: React.CSSProperties;
  readOnly?: boolean;
  placeholder?: string;
  onShowTemplateSelector?: () => void;
  inlineMode?: boolean;
}

/**
 * محرر احتياطي بسيط متوافق مع ارتفاع السطر ونفس الخصائص مثل المحرر الأساسي
 */
export function TinyEditorFallback({
  value = '',
  onChange,
  style,
  readOnly = false,
  placeholder = 'ابدأ الكتابة هنا...',
  onShowTemplateSelector,
  inlineMode = false
}: TinyEditorFallbackProps) {
  const [textValue, setTextValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // تحديث القيمة عند تغيرها من الخارج
  useEffect(() => {
    setTextValue(value);
  }, [value]);
  
  // معالجة التغييرات في textarea
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setTextValue(newValue);
    onChange(newValue);
  };
  
  // ضبط ارتفاع textarea حسب المحتوى
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = scrollHeight + 'px';
    }
  }, [textValue]);

  // الأنماط الافتراضية للـ textarea مع مطابقة خصائص محرر TinyMCE
  const lineHeight = style?.lineHeight || 1.5;
  
  const defaultStyle: React.CSSProperties = {
    width: '100%',
    minHeight: inlineMode ? '602px' : '602px',
    height: style?.height || 'auto',
    padding: '24px',
    fontFamily: 'Cairo, sans-serif',
    fontSize: style?.fontSize || '14px',
    lineHeight: String(lineHeight),
    color: '#000',
    border: 'none',
    outline: 'none',
    resize: 'none',
    direction: 'rtl',
    textAlign: 'right',
    backgroundColor: 'transparent',
    whiteSpace: 'pre-wrap'
  };
  
  return (
    <div className="fallback-editor-container" style={{
      border: '1px solid #e2e8f0',
      borderRadius: '0.375rem',
      overflow: 'hidden',
      backgroundColor: 'white',
      ...style
    }}>
      {/* أزرار إضافة النص الجاهز */}
      {onShowTemplateSelector && (
        <div className="flex justify-end p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
          <button
            onClick={onShowTemplateSelector}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
            إضافة نص جاهز
          </button>
        </div>
      )}
      
      <div className="flex justify-between p-2 border-b border-gray-200">
        {/* Text formatting toolbar */}
        <div className="flex space-x-1 rtl:space-x-reverse">
          <button className="p-1 hover:bg-gray-100 rounded" title="غامق" onClick={() => {
            // Basic bold implementation
            if (textareaRef.current) {
              const start = textareaRef.current.selectionStart;
              const end = textareaRef.current.selectionEnd;
              const selectedText = textValue.substring(start, end);
              const newValue = textValue.substring(0, start) + '**' + selectedText + '**' + textValue.substring(end);
              setTextValue(newValue);
              onChange(newValue);
            }
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
              <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
            </svg>
          </button>
          <button className="p-1 hover:bg-gray-100 rounded" title="مائل" onClick={() => {
            if (textareaRef.current) {
              const start = textareaRef.current.selectionStart;
              const end = textareaRef.current.selectionEnd;
              const selectedText = textValue.substring(start, end);
              const newValue = textValue.substring(0, start) + '*' + selectedText + '*' + textValue.substring(end);
              setTextValue(newValue);
              onChange(newValue);
            }
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="4" x2="10" y2="4"></line>
              <line x1="14" y1="20" x2="5" y2="20"></line>
              <line x1="15" y1="4" x2="9" y2="20"></line>
            </svg>
          </button>
        </div>

        {/* Font size and family */}
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <select 
            className="text-sm border rounded p-1 bg-transparent"
            onChange={(e) => {
              // Update container style with selected font size
              if (textareaRef.current) {
                textareaRef.current.style.fontSize = e.target.value;
              }
            }}
            defaultValue={style?.fontSize || '14px'}
          >
            {['8px', '9px', '10px', '11px', '12px', '13px', '14px', '16px', '18px', '20px', '24px', '28px'].map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          
          <select 
            className="text-sm border rounded p-1 bg-transparent"
            onChange={(e) => {
              // Update container style with selected line height
              if (textareaRef.current) {
                textareaRef.current.style.lineHeight = e.target.value;
              }
            }}
            defaultValue={String(lineHeight)}
          >
            {['0', '0.5', '1', '1.5', '1.8', '2', '2.5'].map(height => (
              <option key={height} value={height}>ارتفاع السطر: {height}</option>
            ))}
          </select>
        </div>
      </div>
      
      <textarea
        ref={textareaRef}
        value={textValue}
        onChange={handleChange}
        placeholder={placeholder}
        readOnly={readOnly}
        style={defaultStyle}
        className="focus:ring-2 focus:ring-primary/50 transition-colors"
        dir="rtl"
        onKeyDown={(e) => {
          // معالجة خاصة لمفتاح Enter لتحسين تجربة المستخدم
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const start = e.currentTarget.selectionStart;
            const end = e.currentTarget.selectionEnd;
            
            // إضافة سطر جديد في المكان المناسب
            const newValue = textValue.substring(0, start) + '\n' + textValue.substring(end);
            setTextValue(newValue);
            onChange(newValue);
            
            // ضبط موضع المؤشر على السطر التالي
            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.selectionStart = start + 1;
                textareaRef.current.selectionEnd = start + 1;
              }
            }, 0);
          }
        }}
      />
      
      <div className="p-2 border-t border-gray-200 bg-gray-50 flex justify-between text-xs text-gray-500">
        <span>{textValue.length} حرف</span>
        <span>محرر بسيط (احتياطي)</span>
      </div>
    </div>
  );
}