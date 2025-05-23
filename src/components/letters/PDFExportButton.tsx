import { useState } from 'react'
import { Download } from 'lucide-react'
import { exportLetterToPDF } from '../../lib/letter-utils'
import type { Letter } from '../../types/database'
import { useToast } from '../../hooks/useToast'

interface PDFExportButtonProps {
  letter: Letter
  className?: string
  onExportStart?: () => void
  onExportComplete?: () => void
  onExportError?: (error: Error) => void
  children?: React.ReactNode
}

export function PDFExportButton({
  letter,
  className = '',
  onExportStart,
  onExportComplete,
  onExportError,
  children
}: PDFExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  async function handleExport() {
    if (isExporting) return

    setIsExporting(true)
    onExportStart?.()

    try {
      toast({
        title: 'جارِ التصدير...',
        description: 'يتم تصدير الخطاب كملف PDF',
        type: 'info'
      })

      await exportLetterToPDF(letter)
      
      toast({
        title: 'تم التصدير',
        description: 'تم تصدير الخطاب بنجاح',
        type: 'success'
      })
      
      onExportComplete?.()
    } catch (error) {
      console.error('Error exporting PDF:', error)
      
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء تصدير الملف',
        type: 'error'
      })
      
      if (error instanceof Error) {
        onExportError?.(error)
      }
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className={`flex items-center gap-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg ${className} ${
        isExporting ? 'opacity-70 cursor-wait' : ''
      }`}
      title="تصدير كملف PDF"
    >
      {isExporting ? (
        <>
          <div className="w-4 h-4 border-2 border-gray-600/30 border-t-gray-600 rounded-full animate-spin"></div>
          <span className="hidden sm:inline">جارٍ التصدير...</span>
        </>
      ) : (
        <>
          {children || (
            <>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">تصدير PDF</span>
            </>
          )}
        </>
      )}
    </button>
  )
}