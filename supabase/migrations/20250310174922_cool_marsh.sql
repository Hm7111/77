/*
  # إصلاح مشكلة التكرار في سياسات الوصول للمستخدمين

  1. التغييرات
    - إزالة السياسات القديمة التي تسبب التكرار
    - إنشاء سياسات جديدة آمنة
    - تحسين التحكم في الوصول

  2. الأمان
    - منع التكرار اللانهائي في السياسات
    - الحفاظ على صلاحيات المدير
    - حماية بيانات المستخدمين
*/

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;

-- إنشاء دالة للتحقق من صلاحيات المدير
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = user_id AND role = 'admin' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- إنشاء سياسات جديدة
CREATE POLICY "users_select_policy" ON public.users
FOR SELECT TO authenticated
USING (
  is_admin(auth.uid()) OR id = auth.uid()
);

CREATE POLICY "users_insert_policy" ON public.users
FOR INSERT TO authenticated
WITH CHECK (
  is_admin(auth.uid())
);

CREATE POLICY "users_update_policy" ON public.users
FOR UPDATE TO authenticated
USING (
  is_admin(auth.uid()) OR id = auth.uid()
)
WITH CHECK (
  is_admin(auth.uid()) OR id = auth.uid()
);

CREATE POLICY "users_delete_policy" ON public.users
FOR DELETE TO authenticated
USING (
  is_admin(auth.uid())
);