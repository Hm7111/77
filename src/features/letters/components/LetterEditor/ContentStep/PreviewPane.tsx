import React, { lazy, Suspense, RefObject } from 'react';
import QRCode from 'qrcode.react';
import { Copy, Share2, Eye, Maximize2 } from 'lucide-react';
import { EditorConfig, EditorState, LetterContent } from '../../../types';
import { Template } from '../../../../../types/database';
import { useToast } from '../../../../../hooks/useToast';

// تحميل محرر النصوص بشكل كسول
const RichTextWrapper = lazy(() => import('./RichTextWrapper'));

interface PreviewPaneProps {
  content: LetterContent;
  onContentChange: (updater: (prevContent: LetterContent) => LetterContent) => void;
  selectedTemplate: Template;
  editorConfig: EditorConfig;
  editorState: EditorState;
  letterPreviewRef: RefObject<HTMLDivElement>;
  nextNumber: number | null;
  currentYear: number;
  showDatePicker: boolean;
  onDateClick: () => void;
  MONTHS_AR: string[];
  onDateSelect: (day: number, month: number, year: number) => void;
}

/**
 * مكون معاينة الخطاب
 */
export default function PreviewPane({
  content,
  onContentChange,
  selectedTemplate,
  editorConfig,
  editorState,
  letterPreviewRef,
  nextNumber,
  currentYear,
  showDatePicker,
  onDateClick,
  MONTHS_AR,
  onDateSelect
}: PreviewPaneProps) {
  const { toast } = useToast();
  const today = new Date();
  const currentHijriMonth = 0; // يمكن استبداله بالمنطق المناسب
  const currentHijriYear = 0; // يمكن استبداله بالمنطق المناسب
  const currentHijriDay = 0; // يمكن استبداله بالمنطق المناسب
  const daysInMonth = 30; // يمكن استبداله بالمنطق المناسب

  // نسخ رابط التحقق
  const copyVerificationUrl = () => {
    if (!content.verification_url) return;
    
    const url = `${window.location.origin}/verify/${content.verification_url}`;
    navigator.clipboard.writeText(url)
      .then(() => {
        toast({
          title: 'تم النسخ',
          description: 'تم نسخ رابط التحقق بنجاح',
          type: 'success'
        });
      })
      .catch(() => {
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء نسخ الرابط',
          type: 'error'
        });
      });
  };

  // تكبير المعاينة
  const zoomPreview = () => {
    if (letterPreviewRef.current) {
      // تنفيذ منطق التكبير
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">معاينة الخطاب</h3>
        <button
          onClick={zoomPreview}
          className="text-gray-600 hover:text-gray-900 p-1"
          title="تكبير المعاينة"
        >
          <Maximize2 className="h-5 w-5" />
        </button>
      </div>
      
      <div className={`
        relative mx-auto overflow-hidden bg-white rounded-lg shadow
        ${editorState.previewScale === 'fit' && editorState.previewMode ? 'max-w-full h-auto' : ''}
      `}>
        <div
          ref={letterPreviewRef}
          className={`w-[595px] h-[842px] bg-white ${editorState.previewScale === 'fit' && editorState.previewMode ? 'scale-[0.7] sm:scale-[0.85] md:scale-[1]' : ''} mx-auto transition-transform origin-top`}
          style={{
            backgroundImage: selectedTemplate ? `url(${selectedTemplate.image_url})` : 'none',
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            direction: 'rtl'
          }}
        >
          <div className="absolute inset-0">
            {editorState.showGuides && (
              <>
                <div className="absolute top-[25px] left-[85px] w-10 h-8 border-2 border-yellow-500 rounded pointer-events-none" />
                <div className="absolute top-[60px] left-[40px] w-32 h-8 border-2 border-yellow-500 rounded pointer-events-none" />
                <div className="absolute top-[120px] right-[35px] left-[40px] bottom-[120px] border-2 border-yellow-500 rounded pointer-events-none" />
              </>
            )}
            
            {/* رقم الخطاب */}
            <input
              type="text"
              value={content.number ?? ''}
              readOnly
              className="absolute top-[25px] left-[85px] w-10 p-1 text-sm font-semibold bg-transparent text-center focus:outline-none"
            />
            
            {/* تاريخ الخطاب */}
            <input
              type="text"
              value={content.date ?? ''}
              onChange={(e) => onContentChange(prev => ({ ...prev, date: e.target.value }))}
              onClick={onDateClick}
              readOnly={editorState.previewMode}
              className="absolute top-[60px] left-[40px] w-32 p-1 text-sm font-semibold bg-transparent text-center cursor-pointer focus:outline-none"
            />
            
            {/* منتقي التاريخ */}
            {showDatePicker && !editorState.previewMode && (
              <div className="absolute top-[90px] left-[120px] w-64 bg-white rounded-lg shadow-lg border p-2 z-10">
                <div className="text-center mb-2 font-semibold">
                  {MONTHS_AR[currentHijriMonth]} {currentHijriYear}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => onDateSelect(day, currentHijriMonth, currentHijriYear)}
                      className={`p-1 text-sm rounded hover:bg-gray-100 ${
                        day === currentHijriDay ? 'bg-primary text-white hover:bg-primary/90' : ''
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* المحتوى - إما محرر WYSIWYG داخل القالب أو العرض فقط */}
            {editorState.editorStyle === 'inside' && !editorState.previewMode ? (
              <div className="absolute top-[120px] right-[35px] left-[40px] bottom-[120px] p-6">
                <div className="w-full h-full">
                  {editorState.showEditorControls && (
                    <Suspense fallback={
                      <div className="h-full w-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    }>
                      <RichTextWrapper
                        value={content.body ?? ''}
                        onChange={(value) => onContentChange(prev => ({ ...prev, body: value }))}
                        style={{
                          fontSize: editorConfig.fontSize,
                          lineHeight: String(editorConfig.lineHeight),
                        }}
                        inlineMode={true}
                        editorType={editorState.editorType}
                      />
                    </Suspense>
                  )}
                </div>
              </div>
            ) : (
              <div 
                dangerouslySetInnerHTML={{ __html: content.body ? content.body : '' }}
                className={`absolute top-[120px] right-[35px] left-[40px] bottom-[120px] p-6 text-sm bg-transparent ${
                  editorState.editorStyle === 'inside' && !editorState.previewMode ? 'border border-dashed border-gray-300' : ''
                }`}
                style={{
                  fontFamily: 'Cairo',
                  fontSize: editorConfig.fontSize,
                  lineHeight: editorConfig.lineHeight.toString(),
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  textAlign: 'right',
                  direction: 'rtl'
                }}
              />
            )}
            
            {/* رمز QR - عرضه فقط في وضع المعاينة أو إذا تم تفعيله يدويًا */}
            {(editorState.previewMode || editorState.showQRInEditor) && (
              <div className="absolute bottom-[40px] right-[40px] flex flex-col items-center gap-1">
                {content.verification_url ? (
                  <>
                    <QRCode
                      value={`${window.location.origin}/verify/${content.verification_url}`}
                      size={80}
                      level="H"
                      includeMargin
                      className="bg-white p-1.5 rounded"
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={copyVerificationUrl}
                        className="p-1 bg-gray-100 rounded hover:bg-gray-200"
                        title="نسخ رابط التحقق"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      
                      <button
                        onClick={() => window.open(`${window.location.origin}/verify/${content.verification_url}`, '_blank')}
                        className="p-1 bg-gray-100 rounded hover:bg-gray-200"
                        title="فتح صفحة التحقق"
                      >
                        <Share2 className="h-3 w-3" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-[80px] h-[80px] border-2 border-dashed border-gray-300 rounded flex items-center justify-center bg-gray-50 text-xs text-gray-500 text-center p-2">
                    سيظهر رمز QR بعد حفظ الخطاب
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}