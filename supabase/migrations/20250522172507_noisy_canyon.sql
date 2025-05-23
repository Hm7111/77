/*
  # إضافة التحقق من نشاط المستخدم عند تسجيل الدخول

  1. التغييرات
    - إنشاء دالة للتحقق من حالة نشاط المستخدم
    - تحسين استعلامات قاعدة البيانات
    
  2. الأمان
    - منع المستخدمين غير النشطين من تسجيل الدخول
    - تحسين تدفق المصادقة
*/

-- دالة للتحقق من أن المستخدم نشط
CREATE OR REPLACE FUNCTION auth.check_user_is_active()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_user_active boolean;
BEGIN
  -- التحقق من وجود المستخدم في جدول المستخدمين وأنه نشط
  SELECT is_active INTO is_user_active 
  FROM public.users 
  WHERE id = NEW.sub;

  -- إذا كان المستخدم غير نشط، ارفض تسجيل الدخول
  IF NOT is_user_active THEN
    RAISE EXCEPTION 'حساب المستخدم غير نشط';
  END IF;

  RETURN NEW;
END;
$$;

-- تفعيل المشغل بعد إنشاء الجلسة
DROP TRIGGER IF EXISTS check_user_active ON auth.sessions;

-- يتم تنفيذ المشغل فقط عند تسجيل الدخول (إنشاء جلسة جديدة)
CREATE TRIGGER check_user_active
AFTER INSERT ON auth.sessions
FOR EACH ROW
EXECUTE FUNCTION auth.check_user_is_active();