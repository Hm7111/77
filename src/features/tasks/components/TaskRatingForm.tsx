import { useState } from 'react';
import { Star, StarOff, Save } from 'lucide-react';

interface TaskRatingFormProps {
  taskId: string;
  initialRating?: number | null;
  onSubmit: (rating: number, notes: string) => Promise<void>;
  isLoading: boolean;
}

/**
 * نموذج تقييم المهمة
 */
export function TaskRatingForm({ taskId, initialRating, onSubmit, isLoading }: TaskRatingFormProps) {
  const [rating, setRating] = useState(initialRating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [notes, setNotes] = useState('');
  
  // معالجة تقديم النموذج
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating > 0) {
      await onSubmit(rating, notes);
    }
  };
  
  // الحصول على النص الوصفي للتقييم
  const getRatingText = (value: number): string => {
    switch (value) {
      case 1: return 'ضعيف جداً';
      case 2: return 'ضعيف';
      case 3: return 'متوسط';
      case 4: return 'جيد';
      case 5: return 'ممتاز';
      default: return 'لم يتم التقييم بعد';
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-900 p-6 rounded-lg border dark:border-gray-800 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">تقييم أداء المهمة</h3>
      
      <div>
        <label className="block text-sm font-medium mb-2">التقييم العام</label>
        
        <div className="flex items-center gap-2 mb-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              onMouseEnter={() => setHoverRating(value)}
              onMouseLeave={() => setHoverRating(0)}
              className="text-2xl text-gray-300 hover:text-yellow-400 focus:outline-none transition-colors"
            >
              {(hoverRating || rating) >= value ? (
                <Star className="h-8 w-8 text-yellow-500 fill-yellow-500" />
              ) : (
                <StarOff className="h-8 w-8" />
              )}
            </button>
          ))}
          
          <span className="mr-2 text-sm font-medium">
            {hoverRating > 0 ? getRatingText(hoverRating) : rating > 0 ? getRatingText(rating) : 'اختر تقييمًا'}
          </span>
        </div>
      </div>
      
      <div>
        <label htmlFor="rating-notes" className="block text-sm font-medium mb-2">
          ملاحظات التقييم (اختيارية)
        </label>
        <textarea
          id="rating-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors h-24"
          placeholder="أدخل ملاحظات أو تفاصيل حول تقييمك للمهمة..."
          dir="rtl"
        />
      </div>
      
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={rating === 0 || isLoading}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>جارِ الحفظ...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>حفظ التقييم</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}