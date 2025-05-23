/*
  # تحسين سياسات الوصول لجدول المستخدمين

  1. التغييرات
    - تحسين سياسة القراءة للمستخدمين
    - السماح للمدراء بقراءة جميع المستخدمين

  2. الأمان
    - تحديث سياسات RLS لتحسين الوصول
    - الحفاظ على أمان البيانات
*/

-- إعادة تعيين سياسة القراءة
DROP POLICY IF EXISTS "users_select_policy" ON public.users;

-- إنشاء سياسة قراءة جديدة
CREATE POLICY "users_select_policy" ON public.users
FOR SELECT TO authenticated
USING (
  CASE 
    WHEN (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' THEN true
    ELSE id = auth.uid()
  END
);