/*
  # تحسين صلاحيات المدير

  1. التغييرات
    - تحسين آلية التحقق من صلاحيات المدير
    - تبسيط السياسات الأمنية
    - إضافة سياسات جديدة للمدير

  2. الأمان
    - تحسين التحكم في الوصول
    - حماية البيانات
*/

-- إنشاء دالة للتحقق من صلاحيات المدير
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  );
$$;

-- إعادة إنشاء السياسات
DROP POLICY IF EXISTS "allow_read_all_for_admin" ON public.users;
DROP POLICY IF EXISTS "allow_read_own_data" ON public.users;
DROP POLICY IF EXISTS "allow_update_for_admin" ON public.users;
DROP POLICY IF EXISTS "allow_update_own_data" ON public.users;
DROP POLICY IF EXISTS "allow_delete_for_admin" ON public.users;

-- سياسات القراءة
CREATE POLICY "allow_read_all_for_admin"
ON public.users
FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "allow_read_own_data"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- سياسات التحديث
CREATE POLICY "allow_update_for_admin"
ON public.users
FOR UPDATE
TO authenticated
USING (is_admin());

CREATE POLICY "allow_update_own_data"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id AND NOT is_admin());

-- سياسة الحذف
CREATE POLICY "allow_delete_for_admin"
ON public.users
FOR DELETE
TO authenticated
USING (is_admin());