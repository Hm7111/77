/*
  # تحديث سياسات جدول المستخدمين

  1. التغييرات
    - إضافة دالة مساعدة للتحقق من صلاحيات المدير
    - إضافة سياسات للمدير للوصول إلى بيانات المستخدمين
    
  2. الأمان
    - السماح فقط للمدير بإدارة المستخدمين
    - السماح للمستخدم العادي برؤية بياناته فقط
*/

-- إضافة دالة للتحقق من صلاحيات المدير
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;

-- إضافة السياسات الجديدة
CREATE POLICY "المدير يمكنه رؤية جميع المستخدمين"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    is_admin() OR
    auth.uid() = id
  );

CREATE POLICY "المدير يمكنه إضافة مستخدمين"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "المدير يمكنه تعديل المستخدمين"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "المدير يمكنه حذف المستخدمين"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (is_admin());