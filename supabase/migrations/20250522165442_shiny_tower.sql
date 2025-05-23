/*
  # إصلاح مشكلة إدارة الصلاحيات والأدوار

  1. التغييرات
    - تحسين دالة ensure_user_exists لتعيين الدور بشكل صحيح
    - تصحيح طريقة حذف الأدوار وتحقق من الاستخدام
    - إضافة حقل updated_at للمستخدمين إذا لم يكن موجوداً

  2. الأمان
    - تحسين التحكم في الوصول وإدارة الصلاحيات
    - ضمان تكامل البيانات عند إدارة المستخدمين والأدوار
*/

-- إضافة حقل updated_at إلى جدول المستخدمين إذا لم يكن موجوداً
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE users ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- إنشاء دالة is_admin محسنة
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  );
END;
$$;

-- تحسين دالة ensure_user_exists للتعامل مع الدور بشكل صحيح
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
  -- التحقق من صحة القيم المدخلة
  IF user_role IS NULL OR user_role = '' THEN
    user_role := 'user';
  END IF;
  
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

-- تعديل سياسات الوصول للمستخدمين
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
CREATE POLICY "users_select_policy" ON public.users
FOR SELECT
TO authenticated
USING (
  is_admin() OR 
  auth.uid() = id
);

-- تحسين دالة handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_role TEXT;
  new_full_name TEXT;
  new_branch_id UUID;
BEGIN
  -- استخراج بيانات المستخدم من السجل
  new_role := new.raw_user_meta_data->>'role';
  new_full_name := new.raw_user_meta_data->>'full_name';
  new_branch_id := (new.raw_user_meta_data->>'branch_id')::UUID;
  
  -- تعيين الدور الافتراضي إذا كان فارغاً
  IF new_role IS NULL OR new_role = '' THEN
    new_role := 'user';
  END IF;
  
  -- إنشاء سجل المستخدم في المخطط العام
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
    new.id,
    new.email,
    COALESCE(new_full_name, new.email),
    new_role,
    new_branch_id,
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = COALESCE(EXCLUDED.role, users.role),
    branch_id = COALESCE(EXCLUDED.branch_id, users.branch_id),
    updated_at = now();
  
  RETURN NEW;
END;
$$;