import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../hooks/useToast';
import { Upload, Image, X, Save, Check } from 'lucide-react';

interface SignatureUploaderProps {
  onSuccess?: (signatureUrl: string, signatureId: string) => void;
  className?: string;
}

export function SignatureUploader({ onSuccess, className = '' }: SignatureUploaderProps) {
  const { dbUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [signatureId, setSignatureId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // تحميل التوقيع الحالي إن وجد
  useEffect(() => {
    loadSignature();
  }, [dbUser]);

  // تحميل التوقيع الحالي للمستخدم
  async function loadSignature() {
    if (!dbUser) return;

    try {
      setIsLoading(true);
      
      // البحث عن التوقيع الأحدث للمستخدم
      const { data, error } = await supabase
        .from('signatures')
        .select('*')
        .eq('user_id', dbUser.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setSignature(data[0].signature_url);
        setSignatureId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading signature:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل التوقيع',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }

  // معالجة تحديد الملف
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // التحقق من نوع الملف
    if (!selectedFile.type.startsWith('image/')) {
      toast({
        title: 'خطأ',
        description: 'يرجى اختيار ملف صورة صالح',
        type: 'error'
      });
      return;
    }

    // التحقق من حجم الملف (الحد الأقصى 2 ميجابايت)
    if (selectedFile.size > 2 * 1024 * 1024) {
      toast({
        title: 'خطأ',
        description: 'حجم الملف كبير جدًا. الحد الأقصى هو 2 ميجابايت',
        type: 'error'
      });
      return;
    }

    setFile(selectedFile);
  }

  // رفع التوقيع
  async function uploadSignature() {
    if (!file || !dbUser) return;

    setIsLoading(true);
    try {
      // أولاً، تأكد من وجود الـ bucket - إذا لم يكن موجوداً فقم بإنشائه
      const { data: buckets, error: bucketsError } = await supabase
        .storage
        .listBuckets();
      
      const bucketExists = buckets?.some(b => b.name === 'signatures');
      
      if (!bucketExists) {
        // إنشاء bucket جديد للتوقيعات
        const { error: createBucketError } = await supabase
          .storage
          .createBucket('signatures', {
            public: true,
            fileSizeLimit: 2 * 1024 * 1024 // 2MB
          });
        
        if (createBucketError) {
          console.error('Error creating bucket:', createBucketError);
          throw new Error('فشل في إنشاء مخزن التوقيعات');
        }
        
        // تعيين سياسات التخزين العامة
        const { error: policyError } = await supabase
          .storage
          .from('signatures')
          .createSignedUrl('test.txt', 60);
          
        if (policyError && !policyError.message.includes('not found')) {
          console.error('Error setting storage policy:', policyError);
        }
      }

      // رفع الملف إلى التخزين
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
      const filePath = `${dbUser.id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // الحصول على الرابط العام للملف
      const { data: { publicUrl } } = supabase.storage
        .from('signatures')
        .getPublicUrl(filePath);

      // إنشاء سجل التوقيع في قاعدة البيانات
      const { data: signatureData, error: signatureError } = await supabase
        .from('signatures')
        .insert({
          user_id: dbUser.id,
          signature_url: publicUrl
        })
        .select()
        .single();

      if (signatureError) throw signatureError;

      // تحديث الحالة
      setSignature(publicUrl);
      setSignatureId(signatureData.id);
      setFile(null);

      // استدعاء دالة النجاح إن وجدت
      if (onSuccess) {
        onSuccess(publicUrl, signatureData.id);
      }

      toast({
        title: 'تم الرفع',
        description: 'تم رفع التوقيع بنجاح',
        type: 'success'
      });
    } catch (error) {
      console.error('Error uploading signature:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء رفع التوقيع',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }

  // حذف التوقيع الحالي
  async function deleteSignature() {
    if (!signature || !signatureId || !dbUser) return;

    if (!confirm('هل أنت متأكد من حذف التوقيع الحالي؟')) {
      return;
    }

    setIsLoading(true);
    try {
      // حذف التوقيع من قاعدة البيانات
      const { error } = await supabase
        .from('signatures')
        .delete()
        .eq('id', signatureId);

      if (error) throw error;

      // حذف الملف من التخزين (استخلاص المسار من الرابط)
      const urlParts = signature.split('/');
      const bucketName = urlParts[urlParts.indexOf('signatures') + 1];
      const objectPath = urlParts.slice(urlParts.indexOf(bucketName) + 1).join('/');
      
      if (bucketName && objectPath) {
        try {
          await supabase.storage
            .from('signatures')
            .remove([`${dbUser.id}/${objectPath}`]);
        } catch (storageError) {
          console.error('Error removing file from storage:', storageError);
          // Continue even if storage removal fails
        }
      }

      // إعادة تعيين الحالة
      setSignature(null);
      setSignatureId(null);

      toast({
        title: 'تم الحذف',
        description: 'تم حذف التوقيع بنجاح',
        type: 'success'
      });
    } catch (error) {
      console.error('Error deleting signature:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حذف التوقيع',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={`signature-uploader ${className}`}>
      {/* عرض التوقيع الحالي */}
      {signature ? (
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium text-gray-900 dark:text-white">التوقيع الحالي</h3>
            <button
              onClick={deleteSignature}
              disabled={isLoading}
              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30"
              title="حذف التوقيع"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex justify-center bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
            <img
              src={signature}
              alt="التوقيع الشخصي"
              className="max-h-24 object-contain"
            />
          </div>

          <div className="text-sm text-center text-gray-500 dark:text-gray-400 mt-2">
            <Check className="h-4 w-4 text-green-500 inline-block mr-1" />
            تم رفع التوقيع بنجاح
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-4">
          <div className="text-center">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 mb-2">
                <Image className="h-6 w-6" />
              </div>
              <h3 className="text-gray-900 dark:text-white font-medium">رفع التوقيع</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                قم برفع صورة توقيعك الشخصي لاستخدامها في الموافقات
              </p>
            </div>

            <div className="flex justify-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png,image/jpeg,image/gif"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm flex items-center"
                disabled={isLoading}
              >
                <Upload className="h-4 w-4 mr-2" />
                اختيار صورة التوقيع
              </button>
            </div>

            {file && (
              <div className="mt-4 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Image className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-sm">{file.name}</span>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="p-1 text-red-600 hover:text-red-800 rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={uploadSignature}
                    disabled={isLoading}
                    className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm flex items-center gap-1.5"
                  >
                    {isLoading ? (
                      <>
                        <span className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin"></span>
                        <span>جارٍ الرفع...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5" />
                        <span>رفع التوقيع</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        <p>* يجب أن يكون التوقيع بصيغة PNG أو JPEG وبخلفية شفافة للحصول على أفضل نتيجة</p>
        <p>* الحد الأقصى لحجم الملف هو 2MB</p>
      </div>
    </div>
  );
}