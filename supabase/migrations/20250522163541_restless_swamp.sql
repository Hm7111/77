/*
  # إصلاح شامل لنظام إدارة المستخدمين
  
  1. التغييرات
    - تصحيح سياسات RLS لجدول المستخدمين
    - تحسين دالة ensure_user_exists
    - إضافة دالة is_admin محسنة
    
  2. الأمان
    - تحسين التحكم في الوصول للبيانات
    - منع تسرب البيانات بين المستخدمين
    - حماية عمليات الإنشاء والتعديل
*/

-- إنشاء دالة محسنة للتحقق من صلاحيات المدير
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  );
END;
$$;

-- إعادة تعيين سياسات الجدول
DROP POLICY IF EXISTS "allow_read_all_for_admin" ON users;
DROP POLICY IF EXISTS "allow_read_own_data" ON users;
DROP POLICY IF EXISTS "allow_insert_for_admin" ON users;
DROP POLICY IF EXISTS "allow_update_for_admin" ON users;
DROP POLICY IF EXISTS "allow_update_own_data" ON users;
DROP POLICY IF EXISTS "allow_delete_for_admin" ON users;
DROP POLICY IF EXISTS "المدير يمكنه إنشاء المستخدمين" ON users;
DROP POLICY IF EXISTS "المدير يمكنه تعديل المستخدمين" ON users;
DROP POLICY IF EXISTS "المدير يمكنه حذف المستخدمين" ON users;
DROP POLICY IF EXISTS "المدير يمكنه رؤية جميع المستخدمين" ON users;
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_delete_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "select_users" ON users;
DROP POLICY IF EXISTS "insert_users" ON users;
DROP POLICY IF EXISTS "update_users" ON users;
DROP POLICY IF EXISTS "delete_users" ON users;

-- سياسة القراءة: المدراء يمكنهم قراءة جميع المستخدمين، والمستخدمون يرون بياناتهم فقط
CREATE POLICY "users_select_policy" ON users
FOR SELECT
TO authenticated
USING (
  is_admin() OR 
  auth.uid() = id
);

-- سياسة الإضافة: المدراء والمستخدم نفسه يمكنهم إضافة مستخدمين
CREATE POLICY "users_insert_policy" ON users
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin() OR 
  auth.uid() = id
);

-- سياسة التعديل: المدراء يمكنهم تعديل أي مستخدم، المستخدمون يمكنهم تعديل بياناتهم فقط
CREATE POLICY "users_update_policy" ON users
FOR UPDATE
TO authenticated
USING (
  is_admin() OR 
  auth.uid() = id
)
WITH CHECK (
  is_admin() OR 
  auth.uid() = id
);

-- سياسة الحذف: المدراء فقط يمكنهم حذف المستخدمين
CREATE POLICY "users_delete_policy" ON users
FOR DELETE
TO authenticated
USING (is_admin());

-- تحسين دالة ensure_user_exists
CREATE OR REPLACE FUNCTION public.ensure_user_exists(
  user_id UUID,
  user_email TEXT,
  user_full_name TEXT,
  user_role TEXT,
  user_branch_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- التحقق من وجود المستخدم
  IF EXISTS (SELECT 1 FROM public.users WHERE id = user_id) THEN
    -- تحديث المستخدم الموجود
    UPDATE public.users
    SET
      email = user_email,
      full_name = user_full_name,
      role = user_role,
      branch_id = user_branch_id,
      is_active = true,
      updated_at = now()
    WHERE id = user_id;
  ELSE
    -- إنشاء مستخدم جديد
    INSERT INTO public.users (
      id,
      email,
      full_name,
      role,
      branch_id,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      user_id,
      user_email,
      user_full_name,
      user_role,
      user_branch_id,
      true,
      now(),
      now()
    );
  END IF;
END;
$$;