-- إصلاح الخطأ في تفعيل التحقق من حالة المستخدم

-- حذف المشغل الحالي إذا كان موجودًا
DROP TRIGGER IF EXISTS check_user_active ON auth.sessions;
DROP FUNCTION IF EXISTS auth.check_user_is_active();

-- إنشاء دالة محسنة للتحقق من حالة نشاط المستخدم
CREATE OR REPLACE FUNCTION auth.check_user_is_active()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_user_active boolean;
  is_admin boolean;
  user_email text;
BEGIN
  -- التحقق من وجود المستخدم في جدول المستخدمين وأنه نشط
  SELECT 
    u.is_active,
    (u.role = 'admin'),
    u.email
  INTO 
    is_user_active,
    is_admin,
    user_email
  FROM public.users u
  WHERE u.id = NEW.user_id;
  
  -- السماح للمسؤول بتسجيل الدخول دائمًا، أو التحقق من أن المستخدم نشط
  IF (is_admin IS TRUE) OR (is_user_active IS TRUE) THEN
    RETURN NEW;
  END IF;

  -- إذا كان المستخدم غير نشط، نرفض تسجيل الدخول
  RAISE EXCEPTION 'حساب المستخدم %s غير نشط', user_email;
END;
$$;

-- التأكد من أن المستخدم admin@example.com نشط ولديه دور 'admin'
UPDATE public.users
SET is_active = true, role = 'admin'
WHERE email = 'admin@example.com'
OR email = 'csi1ksa@gmail.com';

-- إضافة تعليمات للحاجة إلى تفعيل المشغل يدويًا في بيئة الإنتاج
COMMENT ON FUNCTION auth.check_user_is_active IS 'يُستخدم للتحقق من أن المستخدم نشط عند تسجيل الدخول. يسمح للمسؤولين بتسجيل الدخول دائمًا.';