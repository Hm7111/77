/*
  # تحسين سياسات الأمان وإضافة الدوال المساعدة

  1. التغييرات
    - إنشاء دالة is_admin مع تحسينات أمنية
    - تحديث سياسات جدول المستخدمين
    - إضافة فحوصات أمان إضافية

  2. الأمان
    - تعيين search_path بشكل صريح
    - استخدام SECURITY DEFINER مع الإعدادات الآمنة
    - تحسين سياسات RLS
*/

-- إنشاء دالة للتحقق من صلاحيات المدير مع تحسينات أمنية
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  );
END;
$$;

-- إعادة إنشاء السياسات مع تحسينات أمنية
DROP POLICY IF EXISTS "admins_all" ON public.users;
DROP POLICY IF EXISTS "users_read_own" ON public.users;

-- سياسة للمدراء للتحكم الكامل
CREATE POLICY "admins_all"
ON public.users
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  (is_admin() OR auth.uid() = id)
  AND EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND auth.email() = email)
)
WITH CHECK (
  (is_admin() OR auth.uid() = id)
  AND EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND auth.email() = email)
);

-- سياسة للمستخدمين لقراءة بياناتهم
CREATE POLICY "users_read_own"
ON public.users
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR is_admin()
);

-- التأكد من تفعيل نظام أمان الصفوف
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;