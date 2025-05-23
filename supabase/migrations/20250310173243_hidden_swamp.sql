/*
  # إصلاح سياسات جدول المستخدمين

  1. التغييرات
    - إضافة سياسات جديدة لإدارة المستخدمين
    - تحسين الأمان والصلاحيات
    
  2. الأمان
    - التأكد من أن المدير فقط يمكنه إدارة المستخدمين
    - السماح للمستخدم العادي برؤية بياناته فقط
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

-- إعادة تعيين سياسات الجدول
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "المدير يمكنه رؤية جميع المستخدمين" ON public.users;
DROP POLICY IF EXISTS "المدير يمكنه إضافة مستخدمين" ON public.users;
DROP POLICY IF EXISTS "المدير يمكنه تعديل المستخدمين" ON public.users;
DROP POLICY IF EXISTS "المدير يمكنه حذف المستخدمين" ON public.users;

-- إنشاء السياسات الجديدة
CREATE POLICY "المدير يمكنه رؤية جميع المستخدمين"
ON public.users FOR SELECT TO authenticated
USING (
  is_admin() OR (auth.uid() = id)
);

CREATE POLICY "المدير يمكنه إضافة مستخدمين"
ON public.users FOR INSERT TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "المدير يمكنه تعديل المستخدمين"
ON public.users FOR UPDATE TO authenticated
USING (is_admin());

CREATE POLICY "المدير يمكنه حذف المستخدمين"
ON public.users FOR DELETE TO authenticated
USING (is_admin());