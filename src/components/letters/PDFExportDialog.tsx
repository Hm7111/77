import { useState, useEffect, useRef } from 'react';
import { PDFPreview } from './PDFPreview';
import { pdfExportService } from '../../lib/pdf-export-service';
import { Letter } from '../../types/database';
import { X, Download, FileText, Maximize2, Minimize2 } from 'lucide-react';
import { ExportOptionsDialog } from './ExportOptionsDialog';

interface PDFExportDialogProps {
  letter: Letter;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * نافذة حوار معاينة وتصدير PDF بجودة عالية
 */
export function PDFExportDialog({ letter, isOpen, onClose }: PDFExportDialogProps) {
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  
  const dialogRef = useRef<HTMLDivElement>(null);

  // إنشاء المعاينة عند فتح النافذة
  useEffect(() => {
    if (isOpen) {
      generatePreview();
    }
  }, [isOpen, letter.id]);

  // إنشاء معاينة PDF
  async function generatePreview() {
    if (!isOpen) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // إنشاء PDF باستخدام نفس الخدمة
      const pdfBytes = await pdfExportService.createPreview(letter);
      setPdfData(pdfBytes);
    } catch (error) {
      console.error('Error generating PDF preview:', error);
      setError('حدث خطأ أثناء إنشاء معاينة الملف');
    } finally {
      setIsLoading(false);
    }
  }

  // تصدير الملف
  function handleExport() {
    setShowExportOptions(true);
  }
  
  // معالجة خيارات التصدير
  async function handleExportOptions(options: {withTemplate: boolean, action: 'print' | 'export'}) {
    setShowExportOptions(false);
    
    try {
      await pdfExportService.exportLetter(letter, {
        filename: `خطاب-${letter.number || '0'}-${letter.year || new Date().getFullYear()}.pdf`,
        withTemplate: options.withTemplate
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      setError('حدث خطأ أثناء تصدير الملف');
    }
  }

  // تبديل وضع ملء الشاشة
  function toggleFullScreen() {
    setIsFullScreen(prev => !prev);
  }

  // إغلاق النافذة عند النقر خارجها
  function handleBackdropClick(e: React.MouseEvent) {
    if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
      onClose();
    }
  }

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div 
        ref={dialogRef}
        className={`bg-white dark:bg-gray-900 rounded-lg shadow-xl overflow-hidden transition-all duration-300 ${
          isFullScreen ? 'fixed inset-4' : 'max-w-4xl w-full max-h-[90vh]'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-800">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">معاينة الخطاب بجودة عالية</h2>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleFullScreen}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={isFullScreen ? "إلغاء ملء الشاشة" : "ملء الشاشة"}
            >
              {isFullScreen ? (
                <Minimize2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <Maximize2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              )}
            </button>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="إغلاق"
            >
              <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
        
        <div className="overflow-auto p-4" style={{ maxHeight: isFullScreen ? 'calc(100% - 70px - 72px)' : '70vh' }}>
          {isLoading ? (
            <div className="flex h-96 w-full items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-primary border-b-transparent border-l-primary border-r-transparent"></div>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="text-red-500 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">حدث خطأ</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
              <button
                onClick={generatePreview}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : pdfData ? (
            <PDFPreview 
              pdfData={pdfData} 
              width={isFullScreen ? window.innerWidth - 64 : 580}
              onError={(err) => setError('حدث خطأ أثناء عرض المعاينة')}
            />
          ) : null}
        </div>
        
        <div className="border-t dark:border-gray-800 p-4 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            هذه معاينة بجودة عالية للخطاب، يمكنك تصديره كملف PDF للطباعة.
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              إغلاق
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              تصدير PDF
            </button>
          </div>
        </div>
      </div>
      
      {/* نافذة خيارات التصدير */}
      {showExportOptions && (
        <ExportOptionsDialog 
          isOpen={showExportOptions}
          letter={letter}
          onClose={() => setShowExportOptions(false)}
          onConfirm={handleExportOptions}
          defaultAction="export"
        />
      )}
    </div>
  );
}