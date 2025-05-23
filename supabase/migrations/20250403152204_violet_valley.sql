/*
  # إصلاح مشكلة دالة digest وإعداد الامتدادات

  1. التغييرات
    - تمكين امتداد pgcrypto في المخطط العام
    - إعادة إنشاء دالة توليد رابط التحقق
    - تحسين استخدام الدوال الآمنة

  2. الأمان
    - استخدام SECURITY DEFINER للدوال
    - تعيين search_path بشكل صريح
*/

-- تمكين امتداد pgcrypto في المخطط العام
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- إعادة إنشاء دالة توليد رابط التحقق
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
  -- توليد رابط تحقق فريد باستخدام دالة digest
  SELECT encode(
    digest(
      gen_random_uuid()::text || 
      NEW.id::text || 
      extract(epoch from now())::text,
      'sha256'
    ),
    'hex'
  ) INTO new_url;
  
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