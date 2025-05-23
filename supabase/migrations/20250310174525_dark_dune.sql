/*
  # إضافة سياسات لجدول المستخدمين

  1. التغييرات
    - إنشاء دالة للتحقق من صلاحيات المدير
    - إضافة سياسات جديدة تسمح للمدير بإدارة المستخدمين
    - إضافة سياسة تسمح للمستخدمين برؤية بياناتهم الخاصة

  2. الأمان
    - تفعيل نظام أمان الصفوف (RLS)
    - إضافة سياسات محددة للمدراء والمستخدمين العاديين
*/

-- إنشاء دالة للتحقق من صلاحيات المدير
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "admins_all" ON public.users;
DROP POLICY IF EXISTS "users_read_own" ON public.users;

-- سياسة تسمح للمدير بكل الصلاحيات
CREATE POLICY "admins_all" ON public.users
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  is_admin() OR auth.uid() = id
)
WITH CHECK (
  is_admin() OR auth.uid() = id
);

-- سياسة تسمح للمستخدمين برؤية بياناتهم فقط
CREATE POLICY "users_read_own" ON public.users
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR is_admin()
);

-- التأكد من تفعيل نظام أمان الصفوف
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;