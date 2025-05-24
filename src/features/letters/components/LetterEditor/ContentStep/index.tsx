import { RefObject, lazy, Suspense } from 'react';
import React from 'react';
import { BookTemplate as FileTemplate, Check } from 'lucide-react';
import { EditorConfig, EditorState, LetterContent } from '../../../types';
import { Template } from '../../../../../types/database';
import EditorControls from './EditorControls';
import PreviewPane from './PreviewPane';

// تحميل المحرر بطريقة كسولة للأداء الأمثل
const RichTextWrapper = lazy(() => import('./RichTextWrapper'));

interface ContentStepProps {
  content: LetterContent;
  onContentChange: (content: Partial<LetterContent>) => void;
  selectedTemplate: Template;
  editorConfig: EditorConfig;
  editorState: EditorState;
  onLineHeightChange: (height: number) => void;
  onFontSizeChange: (size: string) => void;
  letterPreviewRef: RefObject<HTMLDivElement>;
  nextNumber: number | null;
  currentYear: number;
  MONTHS_AR: string[];
  showDatePicker: boolean;
  onDateClick: () => void;
  onDateSelect: (day: number, month: number, year: number) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onManualSave: () => void;
  onShowTemplateSelector: () => void;
}

/**
 * خطوة تحرير محتوى الخطاب
 */
export default function ContentStep({
  content,
  onContentChange,
  selectedTemplate,
  editorConfig,
  editorState,
  onLineHeightChange,
  onFontSizeChange,
  letterPreviewRef,
  nextNumber,
  currentYear,
  MONTHS_AR,
  showDatePicker,
  onDateClick,
  onDateSelect,
  onNextStep,
  onPrevStep,
  onManualSave,
  onShowTemplateSelector
}: ContentStepProps) {
  // معالجة زر "التالي"
  const handleNext = () => {
    if (content.body) {
      onNextStep();
    }
  };

  return (
    <div className="space-y-6">
      {/* شريط أدوات المحرر */}
      <EditorControls
        editorConfig={editorConfig}
        editorState={editorState}
        onLineHeightChange={onLineHeightChange}
        onFontSizeChange={onFontSizeChange}
        onManualSave={onManualSave}
      />

      <div className={`flex ${editorState.previewMode ? 'flex-col' : 'lg:flex-row'} gap-6`}>
        {/* المحرر - يظهر فقط إذا كان الأسلوب "خارجي" أو ليس في وضع المعاينة */}
        <div className={`relative ${editorState.previewMode ? 'hidden' : editorState.editorStyle === 'inside' ? 'hidden' : 'flex-1'}`}>
          <div className="sticky top-4">
            <h3 className="text-lg font-semibold mb-4">محرر النصوص</h3>
            <div className="bg-white rounded-lg border shadow-sm">
              {editorState.showEditorControls && (
                <Suspense fallback={<div className="h-[400px] flex items-center justify-center">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-opacity-25 rounded-full border-t-primary"></div>
                </div>}>
                  <RichTextWrapper
                    value={content.body ?? ''}
                    onChange={(value) => onContentChange({ body: value })}
                    style={{
                      fontSize: editorConfig.fontSize,
                      lineHeight: String(editorConfig.lineHeight),
                    }}
                    onShowTemplateSelector={onShowTemplateSelector}
                    editorType={editorState.editorType}
                  />
                </Suspense>
              )}
            </div>
            
            {/* أزرار النماذج النصية */}
            <div className="mt-4">
              <button 
                onClick={onShowTemplateSelector}
                className="w-full px-4 py-2 flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg"
              >
                <FileTemplate className="h-4 w-4 text-primary" />
                <span>إضافة نموذج نصي جاهز</span>
              </button>
            </div>
          </div>
        </div>

        {/* القسم الأيمن - معاينة القالب */}
        <div className={`${editorState.previewMode ? 'w-full' : editorState.editorStyle === 'inside' ? 'w-full' : 'flex-1'}`}>
          <PreviewPane
            content={content}
            onContentChange={onContentChange}
            selectedTemplate={selectedTemplate}
            editorConfig={editorConfig}
            editorState={editorState}
            letterPreviewRef={letterPreviewRef}
            nextNumber={nextNumber}
            currentYear={currentYear}
            showDatePicker={showDatePicker}
            onDateClick={onDateClick}
            MONTHS_AR={MONTHS_AR}
            onDateSelect={onDateSelect}
          />
        </div>
      </div>
      
      {/* أزرار التنقل */}
      <div className="flex items-center justify-between mt-6">
        <div className="flex gap-2">
          <button
            onClick={onPrevStep}
            className="px-4 py-2 text-sm border rounded-lg"
          >
            السابق
          </button>
          
          {/* زر إضافة نموذج نصي */}
          <button
            onClick={onShowTemplateSelector}
            className="px-4 py-2 text-sm border border-primary text-primary rounded-lg flex items-center gap-x-2"
          >
            <FileTemplate className="h-4 w-4" />
            إضافة نص جاهز
          </button>
        </div>
        
        <button
          onClick={handleNext}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg flex items-center gap-2"
        >
          <span>التالي (المعاينة النهائية)</span>
          <Check className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}