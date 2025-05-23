import React, { useState } from 'react'
import { X, FileText, FileOutput, Printer, Download, Check } from 'lucide-react'
import type { Letter } from '../../types/database'

export interface ExportOptions {
  withTemplate: boolean;
  action: 'print' | 'export';
}

interface ExportOptionsDialogProps {
  isOpen: boolean;
  letter: Letter;
  onClose: () => void;
  onConfirm: (options: ExportOptions) => void;
  defaultAction?: 'print' | 'export';
}

export function ExportOptionsDialog({
  isOpen,
  letter,
  onClose,
  onConfirm,
  defaultAction = 'export'
}: ExportOptionsDialogProps) {
  const [withTemplate, setWithTemplate] = useState(true);
  const [action, setAction] = useState<'print' | 'export'>(defaultAction);
  
  if (!isOpen) return null;

  function handleConfirm() {
    onConfirm({
      withTemplate,
      action
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-md shadow-xl">
        <div className="p-5 border-b dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {action === 'print' ? (
              <Printer className="h-5 w-5 text-primary" />
            ) : (
              <Download className="h-5 w-5 text-primary" />
            )}
            <h2 className="text-xl font-semibold">خيارات {action === 'print' ? 'الطباعة' : 'التصدير'}</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        <div className="p-6">
          <h3 className="font-medium text-lg mb-4">كيف ترغب {action === 'print' ? 'بطباعة' : 'بتصدير'} الخطاب؟</h3>
          
          <div className="space-y-4">
            <button
              onClick={() => setWithTemplate(true)}
              className={`w-full flex items-start p-4 rounded-lg border ${
                withTemplate 
                  ? 'border-primary bg-primary/5 dark:bg-primary/10' 
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <div className="shrink-0 h-6 w-6 mt-0.5">
                <div className={`h-5 w-5 rounded-full flex items-center justify-center ${
                  withTemplate ? 'bg-primary text-white' : 'border border-gray-300 dark:border-gray-600'
                }`}>
                  {withTemplate && <Check className="h-3 w-3" />}
                </div>
              </div>
              <div className="mr-3 flex-1">
                <h4 className="font-medium text-base flex items-center gap-2">
                  <FileOutput className="h-4 w-4 text-primary" />
                  {action === 'print' ? 'طباعة' : 'تصدير'} مع القالب
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {action === 'print' ? 'طباعة' : 'تصدير'} الخطاب متضمناً القالب الرسمي (الشعار والتنسيق الكامل)
                </p>
              </div>
            </button>

            <button
              onClick={() => setWithTemplate(false)}
              className={`w-full flex items-start p-4 rounded-lg border ${
                !withTemplate 
                  ? 'border-primary bg-primary/5 dark:bg-primary/10' 
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <div className="shrink-0 h-6 w-6 mt-0.5">
                <div className={`h-5 w-5 rounded-full flex items-center justify-center ${
                  !withTemplate ? 'bg-primary text-white' : 'border border-gray-300 dark:border-gray-600'
                }`}>
                  {!withTemplate && <Check className="h-3 w-3" />}
                </div>
              </div>
              <div className="mr-3 flex-1">
                <h4 className="font-medium text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  {action === 'print' ? 'طباعة' : 'تصدير'} بدون القالب
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {action === 'print' ? 'طباعة' : 'تصدير'} النص فقط مع رمز QR، بدون عناصر التصميم
                </p>
              </div>
            </button>
          </div>
          
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg p-4 text-blue-800 dark:text-blue-300 text-sm">
            <p>
              <span className="font-medium">ملاحظة:</span> خيار التصدير بجودة عالية يقوم بإنشاء ملف PDF بدقة عالية جداً مناسب للطباعة الاحترافية.
            </p>
          </div>
          
          <div className="mt-6">
            <div className="text-sm font-medium mb-2">اختر الإجراء:</div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAction('print')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md ${
                  action === 'print'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Printer className="h-4 w-4" />
                طباعة
              </button>
              
              <button
                type="button"
                onClick={() => setAction('export')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md ${
                  action === 'export'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Download className="h-4 w-4" />
                تصدير PDF
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t dark:border-gray-800 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 border dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            إلغاء
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
          >
            {action === 'print' ? (
              <>
                <Printer className="h-4 w-4" />
                طباعة
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                تصدير
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}