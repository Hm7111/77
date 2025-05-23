import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocumentProxy } from 'pdfjs-dist';

// تعيين مسار العامل
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PDFPreviewProps {
  pdfData: Uint8Array | string;
  width?: number;
  height?: number;
  onLoad?: () => void;
  onError?: (error: any) => void;
}

/**
 * مكون لعرض معاينة ملفات PDF
 */
export function PDFPreview({
  pdfData,
  width = 595,
  height = 842,
  onLoad,
  onError
}: PDFPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [scale, setScale] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // تحميل ملف PDF
  useEffect(() => {
    async function loadPDF() {
      try {
        setIsLoading(true);

        // تحويل البيانات إلى تنسيق مناسب
        let pdfBytes: Uint8Array;
        if (typeof pdfData === 'string') {
          // إذا كانت البيانات سلسلة نصية (URL أو Base64)
          if (pdfData.startsWith('data:application/pdf;base64,')) {
            // تحويل البيانات من Base64
            const base64 = pdfData.replace(/^data:application\/pdf;base64,/, '');
            pdfBytes = new Uint8Array(atob(base64).split('').map(char => char.charCodeAt(0)));
          } else {
            // تحميل من URL
            const response = await fetch(pdfData);
            const buffer = await response.arrayBuffer();
            pdfBytes = new Uint8Array(buffer);
          }
        } else {
          // استخدام البيانات الثنائية مباشرة
          pdfBytes = pdfData;
        }

        // تحميل الملف
        const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
        const pdf = await loadingTask.promise;
        
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);
        onLoad?.();
      } catch (error) {
        console.error('Error loading PDF:', error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    }

    loadPDF();
    
    // تنظيف عند إزالة المكون
    return () => {
      if (pdfDocument) {
        pdfDocument.destroy();
      }
    };
  }, [pdfData]);

  // عرض الصفحة الحالية
  useEffect(() => {
    if (!pdfDocument || !canvasRef.current) return;

    async function renderPage() {
      try {
        const page = await pdfDocument.getPage(currentPage);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const viewport = page.getViewport({ scale });
        const context = canvas.getContext('2d');
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context!,
          viewport
        };

        await page.render(renderContext).promise;
      } catch (error) {
        console.error('Error rendering PDF page:', error);
        onError?.(error);
      }
    }

    renderPage();
  }, [pdfDocument, currentPage, scale]);

  // وظائف التنقل
  function nextPage() {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }

  function prevPage() {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }

  function zoomIn() {
    setScale(prev => Math.min(prev + 0.2, 3));
  }

  function zoomOut() {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  }

  return (
    <div className="pdf-preview-container">
      {isLoading ? (
        <div className="flex h-96 w-full items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-primary border-b-transparent border-l-primary border-r-transparent"></div>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="relative bg-gray-100 rounded-lg p-2 mb-4 overflow-hidden" style={{ width, height: 'auto', maxWidth: '100%' }}>
            <canvas
              ref={canvasRef}
              className="mx-auto shadow-lg bg-white"
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '80vh',
                objectFit: 'contain'
              }}
            />
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-4 bg-white p-2 rounded-lg shadow">
            {totalPages > 1 && (
              <>
                <button 
                  onClick={prevPage} 
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                >
                  السابق
                </button>
                <span className="mx-2">
                  الصفحة {currentPage} من {totalPages}
                </span>
                <button 
                  onClick={nextPage} 
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                >
                  التالي
                </button>
                
                <div className="mx-4 h-6 border-r border-gray-200"></div>
              </>
            )}
            
            <button 
              onClick={zoomOut} 
              className="px-2 py-1.5 rounded bg-gray-100 hover:bg-gray-200"
              title="تصغير"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
            </button>
            
            <span className="mx-1 text-sm">{Math.round(scale * 100)}%</span>
            
            <button 
              onClick={zoomIn} 
              className="px-2 py-1.5 rounded bg-gray-100 hover:bg-gray-200"
              title="تكبير"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}