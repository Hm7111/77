/*
  # تصحيح سياسات الوصول للمستخدمين

  1. التغييرات
    - إعادة تعريف دالة is_admin بشكل آمن
    - تحديث سياسات الوصول للمستخدمين
    - إضافة سياسات جديدة للقراءة والتعديل

  2. الأمان
    - تحسين التحكم في الوصول
    - منع التكرار في السياسات
    - حماية بيانات المستخدمين
*/

-- إعادة تعريف دالة is_admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    JOIN public.users ON auth.users.id = public.users.id
    WHERE auth.users.id = user_id 
    AND public.users.role = 'admin'
    AND public.users.is_active = true
  );
$$;

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;

-- إنشاء سياسات جديدة
CREATE POLICY "allow_read_all_for_admin"
ON public.users
FOR SELECT
TO authenticated
USING (
  (SELECT is_admin(auth.uid()))
);

CREATE POLICY "allow_read_own_data"
ON public.users
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);

CREATE POLICY "allow_insert_for_admin"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT is_admin(auth.uid()))
);

CREATE POLICY "allow_update_for_admin"
ON public.users
FOR UPDATE
TO authenticated
USING (
  (SELECT is_admin(auth.uid()))
);

CREATE POLICY "allow_update_own_data"
ON public.users
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
)
WITH CHECK (
  auth.uid() = id
  AND role = (SELECT role FROM public.users WHERE id = auth.uid())
);

CREATE POLICY "allow_delete_for_admin"
ON public.users
FOR DELETE
TO authenticated
USING (
  (SELECT is_admin(auth.uid()))
);