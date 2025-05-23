import React from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { Template } from '../../../../types/database';
import { TemplateSelector } from '../TemplateSelector';

interface TemplateStepProps {
  templates: Template[];
  selectedTemplateId: string;
  onSelectTemplate: (id: string) => void;
  isLoading: boolean;
  onPreviousStep: () => void;
}

/**
 * خطوة اختيار قالب الخطاب
 */
export default function TemplateStep({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  isLoading,
  onPreviousStep
}: TemplateStepProps) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">اختر القالب المناسب</h3>
      
      {/* حالة تحميل القوالب أو الخطأ */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">جاري تحميل القوالب...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <WifiOff className="h-5 w-5 text-red-500" />
            </div>
            <div className="mr-3">
              <h3 className="text-sm font-medium text-red-800">تعذر تحميل القوالب</h3>
              <div className="mt-1 text-sm text-red-700">
                <p>تعذر الاتصال بالخادم. تأكد من اتصالك بالإنترنت ثم حاول مرة أخرى.</p>
              </div>
              <div className="mt-3">
                <button
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  إعادة المحاولة
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <TemplateSelector
          templates={templates}
          selectedId={selectedTemplateId}
          onSelect={onSelectTemplate}
        />
      )}
      
      {/* أزرار التنقل */}
      <div className="flex justify-between mt-4">
        <button
          onClick={onPreviousStep}
          className="px-4 py-2 text-sm border rounded-lg"
        >
          السابق
        </button>
      </div>
    </div>
  );
}