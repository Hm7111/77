import { useState } from 'react';
import { Send } from 'lucide-react';

interface TaskCommentFormProps {
  taskId: string;
  onSubmit: (comment: string) => void;
  isLoading: boolean;
}

/**
 * نموذج إضافة تعليق للمهمة
 */
export function TaskCommentForm({ taskId, onSubmit, isLoading }: TaskCommentFormProps) {
  const [comment, setComment] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (comment.trim()) {
      onSubmit(comment);
      setComment('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <div className="flex items-start">
        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center ml-3 flex-shrink-0">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 text-gray-500" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="أضف تعليقًا..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors h-20"
            dir="rtl"
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
              disabled={isLoading || comment.trim() === ''}
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>جارِ الإرسال...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>إرسال</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}