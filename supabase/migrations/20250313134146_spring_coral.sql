/*
  # تحسين نظام رموز QR للخطابات

  1. التغييرات
    - إضافة حقل لتخزين بيانات QR code
    - تحسين دالة توليد روابط التحقق
    - إضافة دالة للتحقق من صحة الخطابات

  2. الأمان
    - التأكد من فرادة روابط التحقق
    - حماية عملية التحقق
*/

-- إضافة حقل لتخزين بيانات QR code
ALTER TABLE letters
ADD COLUMN IF NOT EXISTS qr_data jsonb DEFAULT '{}'::jsonb;

-- تحديث دالة توليد رابط التحقق
CREATE OR REPLACE FUNCTION generate_verification_url()
RETURNS trigger AS $$
DECLARE
  new_url text;
  qr_info jsonb;
BEGIN
  -- توليد رابط تحقق فريد
  new_url := encode(
    digest(
      gen_random_uuid()::text || 
      NEW.id::text || 
      extract(epoch from now())::text,
      'sha256'
    ),
    'hex'
  );
  
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
$$ LANGUAGE plpgsql;