/*
  # تحسين نظام التحقق من الخطابات

  1. التغييرات
    - تحديث دالة توليد رابط التحقق
    - تحسين آلية التحقق من الخطابات
    - إضافة فحوصات إضافية للأمان

  2. الأمان
    - استخدام UUID لضمان فرادة روابط التحقق
    - تحسين آلية التشفير
*/

-- تحديث دالة توليد رابط التحقق
CREATE OR REPLACE FUNCTION generate_verification_url()
RETURNS trigger AS $$
BEGIN
  -- استخدام UUID مع الطابع الزمني لضمان الفرادة
  NEW.verification_url := encode(
    digest(
      gen_random_uuid()::text || 
      NEW.id::text || 
      extract(epoch from now())::text,
      'sha256'
    ),
    'hex'
  );
  
  -- تعيين الحالة إلى مكتمل عند الإنشاء
  NEW.status := 'completed';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إعادة إنشاء المؤشر إذا لم يكن موجوداً
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'letters' 
    AND indexname = 'letters_verification_url_idx'
  ) THEN
    CREATE INDEX letters_verification_url_idx ON letters(verification_url);
  END IF;
END $$;

-- تحديث الخطابات القديمة التي ليس لديها رابط تحقق
DO $$
BEGIN
  UPDATE letters
  SET verification_url = encode(
    digest(
      gen_random_uuid()::text || 
      id::text || 
      extract(epoch from now())::text,
      'sha256'
    ),
    'hex'
  ),
  status = 'completed'
  WHERE verification_url IS NULL;
END $$;