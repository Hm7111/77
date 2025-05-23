import { useState } from 'react';
import { FileText } from 'lucide-react';
import type { Letter } from '../../../types/database';
import { useToast } from '../../../hooks/useToast';
import { pdfExportService } from '../../../lib/pdf-export-service';
import { ExportOptionsDialog } from './ExportOptionsDialog';

interface HighQualityExportButtonProps {
  letter: Letter;
  className?: string;
  children?: React.ReactNode;
  onExportStart?: () => void;
  onExportComplete?: () => void;
  onExportError?: (error: Error) => void;
}

/**
 * زر تصدير PDF بجودة عالية 
 */
export function HighQualityExportButton({
  letter,
  className = '',
  children,
  onExportStart,
  onExportComplete,
  onExportError
}: HighQualityExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const { toast } = useToast();

  async function handleExport() {
    if (isExporting) return;
    setShowExportOptions(true);
  }
  
  async function handleExportConfirm(options: {withTemplate: boolean, action: 'print' | 'export'}) {
    setShowExportOptions(false);
    
    if (options.action !== 'export') return;
    
    setIsExporting(true);
    setProgress(0);
    onExportStart?.();
    
    try {
      toast({
        title: 'جارِ التصدير بجودة عالية...',
        description: 'يتم إنشاء PDF بجودة طباعة عالية',
        type: 'info'
      });
      
      await pdfExportService.exportLetter(letter, {
        filename: `خطاب-${letter.number || '0'}-${letter.year || new Date().getFullYear()}.pdf`,
        showProgress: (value) => {
          setProgress(Math.round(value * 100));
        },
        withTemplate: options.withTemplate
      });
      
      toast({
        title: 'تم التصدير',
        description: 'تم تصدير الخطاب بنجاح وبجودة عالية',
        type: 'success'
      });
      
      onExportComplete?.();
    } catch (error) {
      console.error('Error exporting PDF:', error);
      
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء تصدير الملف',
        type: 'error'
      });
      
      if (error instanceof Error) {
        onExportError?.(error);
      }
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  }

  return (
    <>
      <button
        onClick={handleExport}
        disabled={isExporting}
        className={`flex items-center gap-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg ${className} ${
          isExporting ? 'opacity-70 cursor-wait' : ''
        }`}
        title="تصدير PDF بجودة طباعة عالية"
      >
        {isExporting ? (
          <>
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <span className="hidden sm:inline">
              {progress > 0 ? `جارِ التصدير... ${progress}%` : 'جارِ التصدير...'}
            </span>
          </>
        ) : (
          <>
            {children || (
              <>
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">تصدير بجودة عالية</span>
              </>
            )}
          </>
        )}
      </button>
      
      {showExportOptions && (
        <ExportOptionsDialog
          isOpen={showExportOptions}
          letter={letter}
          onClose={() => setShowExportOptions(false)}
          onConfirm={handleExportConfirm}
          defaultAction="export"
        />
      )}
    </>
  );
}