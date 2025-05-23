-- تمكين امتداد pgcrypto في المخطط العام
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- إعادة إنشاء دالة توليد رابط التحقق بدون استخدام digest
CREATE OR REPLACE FUNCTION public.generate_verification_url()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_url text;
  qr_info jsonb;
BEGIN
  -- توليد رابط تحقق فريد باستخدام UUID
  new_url := replace(gen_random_uuid()::text, '-', '');
  
  -- إنشاء بيانات QR
  qr_info := json_build_object(
    'url', new_url,
    'created_at', now(),
    'letter_id', NEW.id,
    'number', NEW.number,
    'year', NEW.year
  );
  
  -- تحديث البيانات
  NEW.verification_url := new_url;
  NEW.qr_data := qr_info;
  NEW.status := 'completed';
  
  RETURN NEW;
END;
$$;

-- إعادة إنشاء المشغل
DROP TRIGGER IF EXISTS set_verification_url ON letters;
CREATE TRIGGER set_verification_url
  BEFORE INSERT ON letters
  FOR EACH ROW
  EXECUTE FUNCTION generate_verification_url();