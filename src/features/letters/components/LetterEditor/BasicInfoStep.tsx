import React from 'react';
import { LetterContent } from '../../types';

interface BasicInfoStepProps {
  content: LetterContent;
  onContentChange: (updater: (prevContent: LetterContent) => LetterContent) => void;
  onNextStep: () => void;
  autosaveEnabled: boolean;
  onToggleAutosave: () => void;
}

/**
 * خطوة إدخال البيانات الأساسية للخطاب
 */
export default function BasicInfoStep({
  content,
  onContentChange,
  onNextStep,
  autosaveEnabled,
  onToggleAutosave
}: BasicInfoStepProps) {
  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">البيانات الأساسية للخطاب</h3>
      <div>
        <label className="block text-sm font-medium mb-2">موضوع الخطاب <span className="text-red-500">*</span></label>
        <input
          type="text"
          value={content.subject ?? ''}
          onChange={(e) => onContentChange(prev => ({ ...prev, subject: e.target.value }))}
          className="w-full p-3 border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all"
          placeholder="أدخل موضوع الخطاب (للأرشفة والبحث)"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">صادر إلى <span className="text-red-500">*</span></label>
        <input
          type="text"
          value={content.to ?? ''}
          onChange={(e) => onContentChange(prev => ({ ...prev, to: e.target.value }))}
          className="w-full p-3 border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all"
          placeholder="أدخل الجهة المرسل إليها (للأرشفة والبحث)"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">التصنيف (اختياري)</label>
        <select
          value={content.category ?? ''}
          onChange={(e) => onContentChange(prev => ({ ...prev, category: e.target.value }))}
          className="w-full p-3 border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all"
        >
          <option value="">بدون تصنيف</option>
          <option value="رسمي">خطاب رسمي</option>
          <option value="داخلي">خطاب داخلي</option>
          <option value="تعميم">تعميم</option>
          <option value="قرار إداري">قرار إداري</option>
          <option value="مذكرة داخلية">مذكرة داخلية</option>
          <option value="خطاب تعريف">خطاب تعريف</option>
          <option value="دعوة">دعوة</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">ملاحظات (اختياري)</label>
        <textarea
          value={content.notes ?? ''}
          onChange={(e) => onContentChange(prev => ({ ...prev, notes: e.target.value }))}
          className="w-full p-3 border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-all h-24 resize-none"
          placeholder="أدخل أي ملاحظات إضافية عن الخطاب (للأرشفة الداخلية فقط)"
        />
      </div>
      <div className="pt-4 flex justify-between">
        <div>
          <label className="flex items-center gap-x-2">
            <input 
              type="checkbox"
              checked={autosaveEnabled}
              onChange={onToggleAutosave}
              className="rounded text-primary"
            />
            <span className="text-sm">حفظ تلقائي للمسودة</span>
          </label>
        </div>
        <button
          onClick={onNextStep}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
        >
          التالي
        </button>
      </div>
    </div>
  );
}