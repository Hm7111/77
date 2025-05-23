import { useState, useEffect, useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { TinyEditorFallback } from './TinyEditorFallback';

interface TinyEditorProps {
  value: string;
  onChange: (value: string) => void;
  style?: React.CSSProperties;
  readOnly?: boolean;
  placeholder?: string;
  onShowTemplateSelector?: () => void;
  inlineMode?: boolean;
}

/**
 * محرر TinyMCE المحسن مع دعم كامل للغة العربية وتنسيق محسن
 * ضمان مطابقة محتوى المحرر للمعاينة والتصدير
 */
export function TinyEditor({
  value = '',
  onChange,
  style = {},
  readOnly = false,
  placeholder = 'ابدأ الكتابة هنا...',
  onShowTemplateSelector,
  inlineMode = false,
}: TinyEditorProps) {
  const editorRef = useRef<any>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [useFallback, setUseFallback] = useState(false);
  
  // تنفيذ عملية الإعداد المؤجل للمحرر
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!isEditorReady && isLoading) {
        console.warn('TinyMCE initialization timeout - switching to fallback editor');
        setUseFallback(true);
        setIsLoading(false);
      }
    }, 10000); // زيادة فترة الانتظار إلى 10 ثوان
    
    return () => clearTimeout(timeoutId);
  }, [isEditorReady, isLoading]);
  
  // تنظيف المحرر عند إزالة المكون
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        try {
          editorRef.current.destroy();
        } catch (err) {
          console.warn('Error cleaning up TinyMCE editor', err);
        }
      }
    };
  }, []);

  // تحديد ارتفاع المحرر بناءً على وضع العرض
  const editorHeight = inlineMode ? style?.height || '602px' : style?.height || '602px';
  
  // استخدام نفس ارتفاع السطر في جميع الأماكن للتطابق التام
  const lineHeight = style?.lineHeight ? String(style.lineHeight) : '1.5';

  // إعدادات TinyMCE المحسنة
  const editorConfig = {
    apiKey: 'f05biaod4kou49jaqhin0gpvhmzxkysw6zbhsknadhzqdpp3',
    height: editorHeight,
    min_height: inlineMode ? 300 : 602,
    menubar: false,
    branding: false,
    promotion: false,
    statusbar: false, // إزالة شريط الحالة تماماً
    
    // قائمة مدمجة للإضافات لضمان الاستقرار
    plugins: [
      'directionality', 'advlist', 'autolink', 'lists', 'link', 
      'charmap', 'searchreplace', 'fullscreen', 'table'
    ],
    
    // ترتيب محسن لشريط الأدوات مع مزيد من خيارات التنسيق
    toolbar1: 'styles | fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor',
    toolbar2: 'alignright aligncenter alignleft alignjustify | rtl ltr | indent outdent | bullist numlist',
    toolbar3: 'table link unlink charmap | removeformat | fullscreen',
    
    toolbar_mode: 'wrap', // أفضل رؤية على جميع أحجام الشاشة
    
    // خيارات الخطوط المحسنة
    font_family_formats:
      'Cairo=Cairo,sans-serif;' +
      'Arial=Arial,sans-serif;' +
      'Times New Roman=Times New Roman,serif;' + 
      'Tajawal=Tajawal,sans-serif;' +
      'Almarai=Almarai,sans-serif;',
    
    // خيارات موسعة لحجم الخط
    font_size_formats: '8px 9px 10px 11px 12px 13px 14px 16px 18px 20px 24px 28px',
    
    // الإعدادات الأخرى
    directionality: 'rtl',
    language: 'ar',
    paste_data_images: true,
    convert_fonts_to_spans: true,
    entity_encoding: 'raw',
    browser_spellcheck: true,
    contextmenu: false,
    skin: 'oxide',
    content_css: 'default',
    
    // الإعدادات الأساسية للمحتوى RTL مع الحفاظ على ارتفاع السطر المستهدف
    content_style: `
      @import url('https://fonts.googleapis.com/css2?family=Cairo&display=swap'); 
      
      html, body, div, p, h1, h2, h3, h4, h5, h6, ul, ol, li, table, tr, td, th {
        direction: rtl !important;
        text-align: inherit !important;
        unicode-bidi: embed !important;
      }
      
      body { 
        font-family: 'Cairo', sans-serif; 
        font-size: ${style?.fontSize || '14px'};
        line-height: ${lineHeight};
        max-width: 100%;
        padding: 24px; /* تطابق مع تنسيق القالب */
        margin: 0;
        color: #000000;
        background-color: transparent;
      }
      
      p, h1, h2, h3, h4, h5, h6, li, td, div, span {
        direction: rtl !important;
        text-align: inherit !important;
        unicode-bidi: embed !important;
        font-family: 'Cairo', sans-serif;
        margin: 0 !important;
        padding: 0 !important;
        line-height: ${lineHeight} !important;
        color: #000;
      }

      /* تثبيت ارتفاع السطر بدقة عالية */
      p, div, li {
        line-height: ${lineHeight} !important;
        margin-bottom: ${Number(lineHeight) > 0 ? '0.5em' : '0'} !important;
      }

      /* Fix for RTL tables */
      table {
        width: 100%;
        border-collapse: collapse;
        direction: rtl !important;
      }
      
      table th, table td {
        border: 1px solid #ccc;
        padding: 0.4em;
        text-align: right !important;
      }
      
      img {
        max-width: 100%;
        height: auto;
      }

      /* إصلاح تباعد الفقرات */
      p {
        margin: 0 !important;
        padding: 0 !important;
      }
      
      /* إصلاح القوائم RTL */
      ul, ol {
        padding-right: 20px !important;
        padding-left: 0 !important;
        margin-right: 0 !important;
        margin-left: 0 !important;
      }
      
      /* تضمين محتويات النصوص بشكل صحيح */
      .mce-content-body {
        line-height: ${lineHeight} !important;
      }
      
      /* تصحيح المسافات البادئة */
      .mce-content-body [data-mce-style*="margin-right"] {
        margin-right: 2em !important;
      }
      
      /* تصحيح عرض الأسطر الفارغة */
      br {
        display: block !important;
        content: "" !important;
        margin-top: ${Number(lineHeight) > 0 ? '0.5em' : '0'} !important;
        line-height: ${lineHeight} !important;
      }

      [data-placeholder]::before {
        content: attr(data-placeholder);
        color: rgba(34, 47, 62, 0.5);
        position: absolute;
        top: 0;
        right: 0;
        padding: 0.75rem 1rem;
        pointer-events: none;
      }
      
      /* تحسين محاذاة النصوص */
      .mce-content-body [data-mce-style*="text-align: center"] {
        text-align: center !important;
      }
      
      .mce-content-body [data-mce-style*="text-align: left"] {
        text-align: left !important;
      }
      
      .mce-content-body [data-mce-style*="text-align: right"] {
        text-align: right !important;
      }
      
      .mce-content-body [data-mce-style*="text-align: justify"] {
        text-align: justify !important;
      }
    `,
    placeholder: placeholder,
    readonly: readOnly,
    
    setup: function(editor) {
      // إضافة زر القوالب الجاهزة عند الحاجة
      if (onShowTemplateSelector) {
        editor.ui.registry.addButton('templateselector', {
          icon: 'template',
          tooltip: 'إضافة نص جاهز',
          onAction: () => {
            onShowTemplateSelector();
          }
        });
      }

      // تهيئة المحرر بإعدادات RTL المناسبة
      editor.on('init', function() {
        // تعيين اتجاه المستند إلى RTL
        editor.getDoc().documentElement.dir = 'rtl';
        editor.getDoc().documentElement.setAttribute('lang', 'ar');
        
        const body = editor.getBody();
        body.dir = 'rtl';
        body.style.direction = 'rtl';
        
        // الحفاظ على المحاذاة الأصلية للنص
        if (!body.style.textAlign) {
          body.style.textAlign = 'right';
        }
        
        body.style.lineHeight = lineHeight;
        body.style.padding = '24px'; // تطابق مع تنسيق القالب
        body.style.margin = '0';
        
        // تطبيق اتجاه RTL على جميع العناصر الموجودة
        const allNodes = editor.getBody().querySelectorAll('*');
        allNodes.forEach(function(element) {
          if (element.nodeType === 1) { // Element node
            element.dir = 'rtl';
            
            // الحفاظ على المحاذاة الأصلية إذا كانت محددة
            if (!element.style.textAlign) {
              element.style.textAlign = 'right';
            }
            
            element.style.direction = 'rtl';
            element.style.lineHeight = lineHeight;
          }
        });
        
        // تطبيق المحتوى الأولي
        if (value) {
          editor.setContent(value);
          editor.undoManager.clear();
        }
      });
      
      // معالجة إدخال النصوص RTL
      editor.on('input', function() {
        const selection = editor.selection;
        const node = selection.getNode();
        if (node) {
          node.dir = 'rtl';
          node.style.direction = 'rtl';
          
          // الحفاظ على المحاذاة الأصلية إذا كانت محددة
          if (!node.style.textAlign) {
            node.style.textAlign = 'right';
          }
          
          node.style.lineHeight = lineHeight;
        }
      });

      // معالجة لصق النصوص مع الحفاظ على تنسيق RTL
      editor.on('paste', function() {
        setTimeout(function() {
          // تطبيق اتجاه RTL على جميع العناصر الملصقة
          const allElements = editor.getBody().querySelectorAll('*');
          allElements.forEach(function(element) {
            if (element.nodeType === 1) {
              element.dir = 'rtl';
              
              // الحفاظ على المحاذاة الأصلية إذا كانت محددة
              if (!element.style.textAlign) {
                element.style.textAlign = 'right';
              }
              
              element.style.direction = 'rtl';
              element.style.lineHeight = lineHeight;
              
              // تصحيح تباعد الفقرات
              if (element.tagName === 'P' || element.tagName === 'DIV') {
                element.style.margin = '0';
                element.style.padding = '0';
              }
            }
          });
          
          // تنظيف الأسطر الفارغة المتعددة
          const content = editor.getContent();
          const cleanedContent = content
            .replace(/(<p>\s*<\/p>){2,}/gi, `<p dir="rtl" style="text-align: right; direction: rtl; line-height: ${lineHeight}; margin: 0; padding: 0;">&nbsp;</p>`)
            .replace(/(<br\s*\/?>){2,}/gi, '<br>');
          
          editor.setContent(cleanedContent);
        }, 50);
      });
      
      // معالجة تغيير العقدة الحالية
      editor.on('NodeChange', function() {
        // تطبيق اتجاه RTL على جسم المستند
        editor.getBody().dir = 'rtl';
        editor.getBody().style.direction = 'rtl';
        
        // الحفاظ على المحاذاة الأصلية للنص
        if (!editor.getBody().style.textAlign) {
          editor.getBody().style.textAlign = 'right';
        }
        
        editor.getBody().style.lineHeight = lineHeight;
        editor.getBody().style.padding = '24px'; // تطابق مع تنسيق القالب
        
        // تطبيق اتجاه RTL على العقدة الحالية
        const node = editor.selection.getNode();
        if (node && node.style) {
          node.dir = 'rtl';
          
          // الحفاظ على المحاذاة الأصلية إذا كانت محددة
          if (!node.style.textAlign) {
            node.style.textAlign = 'right';
          }
          
          node.style.direction = 'rtl';
          node.style.lineHeight = lineHeight;
        }
        
        // تصحيح تباعد الفقرات
        const allParagraphs = editor.getBody().querySelectorAll('p, div');
        allParagraphs.forEach(function(p) {
          p.style.margin = '0';
          p.style.padding = '0';
        });
      });
      
      // إرسال تغييرات المحتوى إلى المكون الأب
      editor.on('change', function() {
        const content = editor.getContent();
        onChange(content);
      });
      
      // معالجة مفتاح Enter - لإنشاء فقرة جديدة مع الحفاظ على تباعد السطور
      editor.on('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          
          // الحصول على المحاذاة الحالية
          const currentNode = editor.selection.getNode();
          const currentAlign = currentNode.style.textAlign || 'right';
          
          // إدراج فقرة جديدة مع تعيين نفس ارتفاع السطر والمحاذاة
          editor.execCommand('mceInsertContent', false, 
            `<p dir="rtl" style="text-align: ${currentAlign}; direction: rtl; line-height: ${lineHeight}; margin: 0; padding: 0;">&nbsp;</p>`
          );
          
          // ضمان وضع المؤشر في الفقرة الجديدة
          const rng = editor.selection.getRng();
          rng.selectNodeContents(editor.selection.getNode());
          rng.collapse(false);
          editor.selection.setRng(rng);
          
          return false;
        }
      });
    },
    
    init_instance_callback: (editor) => {
      if (editor) {
        try {
          editorRef.current = editor;
          setIsEditorReady(true);
          setIsLoading(false);
          
          // تنسيق المحرر للتوافق مع RTL
          editor.getDoc().documentElement.dir = 'rtl';
          editor.getDoc().documentElement.setAttribute('lang', 'ar');
          editor.getBody().dir = 'rtl';
          editor.getBody().style.direction = 'rtl';
          
          // الحفاظ على المحاذاة الأصلية للنص
          if (!editor.getBody().style.textAlign) {
            editor.getBody().style.textAlign = 'right';
          }
          
          editor.getBody().style.lineHeight = lineHeight;
          editor.getBody().style.padding = '24px'; // تطابق تنسيق القالب
          
          // تطبيق المحتوى الأولي
          if (value) {
            editor.setContent(value);
            editor.undoManager.clear();
          }
        } catch (error) {
          setEditorError("فشل في تهيئة المحرر");
          setUseFallback(true);
          setIsLoading(false);
        }
      }
    },
    
    // معالج رفع الصور
    images_upload_handler: (blobInfo, progress) => {
      return new Promise<string>((resolve, reject) => {
        // للأغراض التجريبية فقط، نقوم بتحويل الصورة إلى Base64
        const reader = new FileReader();
        reader.onload = () => {
          resolve(reader.result as string);
        };
        reader.onerror = () => {
          reject('فشل في قراءة الملف');
        };
        reader.readAsDataURL(blobInfo.blob());
      });
    }
  };

  // إذا كان المحرر الاحتياطي مفعل، استخدمه
  if (useFallback) {
    return (
      <div className="tinymce-editor">
        {editorError && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 text-sm mb-2 rounded-lg">
            <p>تم التحويل إلى المحرر البسيط نظراً لمشكلة في تحميل المحرر المتقدم.</p>
            {editorError && <p className="mt-1 text-xs opacity-75">{editorError}</p>}
          </div>
        )}
        
        <TinyEditorFallback
          value={value}
          onChange={onChange}
          style={{
            ...style,
            lineHeight: lineHeight
          }}
          readOnly={readOnly}
          placeholder={placeholder}
          onShowTemplateSelector={onShowTemplateSelector}
          inlineMode={inlineMode}
        />
      </div>
    );
  }

  return (
    <div className="tinymce-editor letter-editor bg-white border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden" dir="rtl">
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
      
      {/* عرض حالة التحميل إذا كان المحرر قيد التهيئة */}
      {isLoading && !isEditorReady && (
        <div className="flex justify-center items-center p-8 bg-gray-50 dark:bg-gray-800">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          <span className="mr-3">جارِ تحميل المحرر...</span>
        </div>
      )}

      {/* عرض رسالة الخطأ إذا فشل تحميل المحرر */}
      {editorError && !useFallback && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
          <p className="font-bold mb-2">خطأ في تحميل المحرر:</p>
          <p>{editorError}</p>
          <div className="flex mt-2 gap-2">
            <button 
              onClick={() => setEditorError(null)} 
              className="px-3 py-1 bg-red-100 dark:bg-red-900/30 rounded"
            >
              إعادة المحاولة
            </button>
            <button 
              onClick={() => setUseFallback(true)} 
              className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded"
            >
              استخدام المحرر البسيط
            </button>
          </div>
        </div>
      )}

      {/* محرر TinyMCE */}
      <div style={{ display: isLoading && !isEditorReady ? 'none' : 'block' }}>
        <Editor
          tinymceScriptSrc={`https://cdn.tiny.cloud/1/f05biaod4kou49jaqhin0gpvhmzxkysw6zbhsknadhzqdpp3/tinymce/6/tinymce.min.js`}
          onInit={(evt, editor) => {
            editorRef.current = editor;
            setIsEditorReady(true);
            setIsLoading(false);
          }}
          value={value}
          onEditorChange={(newValue) => {
            onChange(newValue);
          }}
          init={editorConfig}
          disabled={readOnly}
          onError={(err) => {
            console.error('TinyMCE error:', err);
            setEditorError('حدث خطأ أثناء تحميل المحرر. استخدم المحرر البسيط بدلاً من ذلك.');
            setUseFallback(true);
            setIsLoading(false);
          }}
        />
      </div>
      
      {/* زر التحويل إلى المحرر البسيط إذا حدث خطأ */}
      {editorError && !useFallback && (
        <div className="p-4 border-t border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end">
          <button
            onClick={() => {
              setEditorError(null);
              setIsLoading(true);
              setUseFallback(true);
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
          >
            استخدام المحرر البسيط
          </button>
        </div>
      )}
    </div>
  );
}