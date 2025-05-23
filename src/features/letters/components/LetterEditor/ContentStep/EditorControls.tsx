import React from 'react';
import { Sliders, Eye, FileText, BookTemplate as FileTemplate, History } from 'lucide-react';
import { EditorConfig, EditorState } from '../../../types';

interface EditorControlsProps {
  editorConfig: EditorConfig;
  editorState: EditorState;
  onLineHeightChange: (height: number) => void;
  onFontSizeChange: (size: string) => void;
  onManualSave: () => void;
}

/**
 * شريط أدوات المحرر المحسن
 */
export default function EditorControls({
  editorConfig,
  editorState,
  onLineHeightChange,
  onFontSizeChange,
  onManualSave
}: EditorControlsProps) {
  return (
    <div className="flex flex-wrap gap-2 bg-gray-50 p-2 rounded-lg">
      <div className="flex items-center gap-1 mr-auto">
        <span className="text-xs text-gray-500">حجم الخط:</span>
        <select
          value={editorConfig.fontSize}
          onChange={(e) => onFontSizeChange(e.target.value)}
          className="text-xs p-1.5 border rounded"
        >
          {['8px', '9px', '10px', '11px', '12px', '13px', '14px', '16px', '18px', '20px', '24px', '28px'].map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
        
        <span className="text-xs text-gray-500 mr-2">ارتفاع السطر:</span>
        <select
          value={editorConfig.lineHeight}
          onChange={(e) => onLineHeightChange(parseFloat(e.target.value))}
          className="text-xs p-1.5 border rounded"
        >
          <option value="0">0</option>
          <option value="0.5">0.5</option>
          <option value="1">1</option>
          <option value="1.5">1.5</option>
          <option value="1.8">1.8</option>
          <option value="2">2</option>
          <option value="2.5">2.5</option>
        </select>
        
        <button
          onClick={onManualSave}
          className="mr-2 px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 bg-gray-200 hover:bg-gray-300"
          title="حفظ مؤقت"
        >
          <History className="h-3.5 w-3.5" />
          حفظ مؤقت
        </button>
      </div>
    </div>
  );
}