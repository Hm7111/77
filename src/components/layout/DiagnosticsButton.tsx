import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useDiagnostics } from '../../hooks/useDiagnostics';

interface DiagnosticsButtonProps {
  className?: string;
}

/**
 * زر فتح لوحة تشخيص الأخطاء
 */
export function DiagnosticsButton({ className = '' }: DiagnosticsButtonProps) {
  const { openDiagnosticsPanel } = useDiagnostics();
  
  return (
    <button
      onClick={openDiagnosticsPanel}
      className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 group relative text-gray-500 dark:text-gray-400 ${className}`}
      title="تشخيص الأخطاء"
    >
      <AlertCircle className="h-5 w-5" />
      <div className="help-tooltip -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap">
        تشخيص الأخطاء
      </div>
    </button>
  );
}