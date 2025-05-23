/*
  # إصلاح صلاحيات جدول المستخدمين

  1. التغييرات
    - إعادة تعيين سياسات الوصول لجدول المستخدمين
    - إضافة سياسات للقراءة والتعديل والحذف
    - تحسين الأمان والتحكم في الوصول

  2. الأمان
    - تفعيل نظام أمان الصفوف (RLS)
    - تحديد صلاحيات محددة للمستخدمين والمدراء
*/

-- إعادة تعيين السياسات الحالية
DROP POLICY IF EXISTS "admins_all" ON public.users;
DROP POLICY IF EXISTS "users_read_own" ON public.users;

-- تفعيل نظام أمان الصفوف
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: المدراء يمكنهم قراءة كل شيء، والمستخدمون يقرؤون بياناتهم فقط
CREATE POLICY "users_select_policy" ON public.users
FOR SELECT TO authenticated
USING (
  (role = 'admin' AND is_active = true) OR 
  auth.uid() = id
);

-- سياسة الإضافة: المدراء فقط
CREATE POLICY "users_insert_policy" ON public.users
FOR INSERT TO authenticated
WITH CHECK (
  role = 'admin' AND 
  is_active = true
);

-- سياسة التعديل: المدراء يمكنهم تعديل كل شيء، والمستخدمون يعدلون بياناتهم فقط
CREATE POLICY "users_update_policy" ON public.users
FOR UPDATE TO authenticated
USING (
  (role = 'admin' AND is_active = true) OR 
  auth.uid() = id
)
WITH CHECK (
  (role = 'admin' AND is_active = true) OR 
  auth.uid() = id
);

-- سياسة الحذف: المدراء فقط
CREATE POLICY "users_delete_policy" ON public.users
FOR DELETE TO authenticated
USING (
  role = 'admin' AND 
  is_active = true
);