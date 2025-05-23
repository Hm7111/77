/*
  # تحديث سياسات الأمان لجدول المستخدمين

  1. التغييرات
    - تحديث سياسة إضافة المستخدمين للمدراء
    - تحديث سياسة تعديل المستخدمين للمدراء
    - تحديث سياسة حذف المستخدمين للمدراء
    - تحديث سياسة قراءة المستخدمين للمستخدمين المصادقين

  2. الأمان
    - التأكد من أن المدراء لديهم صلاحيات كاملة
    - السماح للمستخدمين المصادقين بقراءة بيانات المستخدمين
*/

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "يمكن للمدراء إضافة المستخدمين" ON public.users;
DROP POLICY IF EXISTS "يمكن للمدراء تعديل المستخدمين" ON public.users;
DROP POLICY IF EXISTS "يمكن للمدراء حذف المستخدمين" ON public.users;
DROP POLICY IF EXISTS "يمكن للمستخدمين المصادقين قراءة ا" ON public.users;

-- إنشاء السياسات الجديدة
CREATE POLICY "enable_insert_for_admins"
ON public.users
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

CREATE POLICY "enable_update_for_admins"
ON public.users
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

CREATE POLICY "enable_delete_for_admins"
ON public.users
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

CREATE POLICY "enable_select_for_authenticated"
ON public.users
FOR SELECT TO authenticated
USING (true);