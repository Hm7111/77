import React from 'react';
import { Save, Download, Printer } from 'lucide-react';
import { LetterContent } from '../../types';
import { Template } from '../../../../types/database';

interface FinalStepProps {
  content: LetterContent;
  template: Template;
  nextNumber: number | null;
  currentYear: number;
  onSubmit: () => void;
  onSaveAsDraft: () => void;
  onPrintClick: () => void;
  onExportClick: () => void;
  isLoading: boolean;
  prevStep: () => void;
}

/**
 * الخطوة النهائية: معاينة وحفظ الخطاب
 */
export default function FinalStep({
  content,
  template,
  nextNumber,
  currentYear,
  onSubmit,
  onSaveAsDraft,
  onPrintClick,
  onExportClick,
  isLoading,
  prevStep
}: FinalStepProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">المعاينة النهائية والحفظ</h3>
      
      <div className="bg-white rounded-lg border p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">رقم الخطاب</h4>
              <p className="font-medium">{nextNumber}/{currentYear}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">التاريخ</h4>
              <p className="font-medium">{content.date}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">الموضوع</h4>
              <p className="font-medium">{content.subject}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">الجهة المرسل إليها</h4>
              <p className="font-medium">{content.to}</p>
            </div>
            
            {content.category && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">التصنيف</h4>
                <p className="font-medium">{content.category}</p>
              </div>
            )}
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">القالب</h4>
              <p className="font-medium">{template.name}</p>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">المحتوى</h4>
            <div className="p-4 bg-gray-50 rounded-lg border text-sm max-h-60 overflow-y-auto">
              <div dangerouslySetInnerHTML={{ __html: content.body || '' }} />
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="text-blue-800 font-medium flex items-center gap-2 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          ملاحظات مهمة
        </h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside mr-4">
          <li>تأكد من مراجعة محتوى الخطاب قبل الحفظ</li>
          <li>بعد الحفظ سيتم إضافة رمز QR للتحقق من صحة الخطاب</li>
          <li>يمكنك الطباعة أو التصدير كملف PDF بعد الحفظ</li>
        </ul>
      </div>
      
      <div className="flex flex-wrap items-center justify-between pt-4 border-t">
        <div className="flex gap-2">
          <button
            onClick={prevStep}
            className="px-4 py-2 border rounded-lg"
          >
            السابق
          </button>
          
          <button
            onClick={onSaveAsDraft}
            className="px-4 py-2 border border-yellow-500 text-yellow-700 rounded-lg flex items-center gap-2"
            disabled={isLoading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
            </svg>
            <span>{isLoading ? 'جارٍ الحفظ...' : 'حفظ كمسودة'}</span>
          </button>
        </div>
        
        <div className="flex gap-2 mt-2 sm:mt-0">
          <button
            onClick={onPrintClick}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            <span>طباعة</span>
          </button>
          
          <button
            onClick={onExportClick}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            <span>تصدير PDF</span>
          </button>
          
          <button
            onClick={onSubmit}
            disabled={isLoading}
            className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            <span>{isLoading ? 'جارٍ الحفظ...' : 'حفظ الخطاب'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}