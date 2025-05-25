import { useState } from 'react';
import { Paperclip, File, X, Upload, Download } from 'lucide-react';
import { TaskAttachment } from '../types';

interface TaskAttachmentsProps {
  attachments: TaskAttachment[];
  taskId: string;
  onUpload: (file: File) => void;
  onDelete: (attachmentId: string) => void;
  isUploading: boolean;
  isDeleting: Record<string, boolean>;
}

/**
 * مكون لعرض وإدارة مرفقات المهمة
 */
export function TaskAttachments({ 
  attachments, 
  taskId, 
  onUpload, 
  onDelete,
  isUploading,
  isDeleting
}: TaskAttachmentsProps) {
  const [dragActive, setDragActive] = useState(false);
  
  // تنسيق حجم الملف
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  // تحديد أيقونة الملف
  const getFileIcon = (type: string): JSX.Element => {
    const color = type.startsWith('image/') 
      ? 'text-blue-500'
      : type.includes('pdf') 
      ? 'text-red-500'
      : type.includes('word') || type.includes('document')
      ? 'text-blue-700'
      : type.includes('excel') || type.includes('sheet')
      ? 'text-green-600'
      : type.includes('presentation')
      ? 'text-orange-500'
      : 'text-gray-500';
    
    return <File className={`h-8 w-8 ${color}`} />;
  };
  
  // تعامل مع السحب والإفلات
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  // تعامل مع إفلات الملفات
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0]);
    }
  };
  
  // تعامل مع اختيار ملف
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
      // إعادة تعيين قيمة حقل الإدخال لتمكين اختيار نفس الملف مرة أخرى
      e.target.value = '';
    }
  };
  
  // تحميل المرفق
  const handleDownload = (attachment: TaskAttachment) => {
    window.open(attachment.file_url, '_blank');
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Paperclip className="h-5 w-5 text-primary" />
        المرفقات
        {attachments.length > 0 && (
          <span className="text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
            {attachments.length}
          </span>
        )}
      </h3>
      
      {/* منطقة سحب وإفلات الملفات */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center ${
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <Paperclip className="h-10 w-10 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          اسحب وأفلت ملفًا هنا، أو انقر لتحديد ملف
        </p>
        <input
          type="file"
          id="file-upload"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => document.getElementById('file-upload')?.click()}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2 mx-auto"
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>جارِ الرفع...</span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              <span>اختيار ملف</span>
            </>
          )}
        </button>
      </div>
      
      {/* قائمة المرفقات */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {attachments.map(attachment => (
            <div
              key={attachment.id}
              className="border dark:border-gray-700 rounded-lg p-3 flex items-start hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {/* أيقونة الملف */}
              <div className="mr-3 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                {getFileIcon(attachment.file_type)}
              </div>
              
              {/* تفاصيل الملف */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 dark:text-white truncate">{attachment.file_name}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(attachment.file_size)} • {new Date(attachment.uploaded_at).toLocaleDateString('ar-SA')}
                </p>
                {attachment.user && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1">
                    <User className="h-3 w-3 mr-1" />
                    {attachment.user.full_name}
                  </p>
                )}
              </div>
              
              {/* أزرار الإجراءات */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleDownload(attachment)}
                  className="p-1 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  title="تحميل"
                >
                  <Download className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => onDelete(attachment.id)}
                  className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  title="حذف"
                  disabled={isDeleting[`delete_attachment_${attachment.id}`]}
                >
                  {isDeleting[`delete_attachment_${attachment.id}`] ? (
                    <span className="h-4 w-4 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin"></span>
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}