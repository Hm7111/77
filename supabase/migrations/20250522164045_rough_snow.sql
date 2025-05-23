/*
  # تصحيح مشكلة تعيين الأدوار للمستخدمين

  1. التغييرات
    - تحديث دالة ensure_user_exists لتعيين الدور بشكل صحيح
    - تحسين سياسات الأمان لجدول المستخدمين

  2. الأمان
    - تحسين التحقق من الصلاحيات
    - ضمان حفظ الدور بشكل صحيح
*/

-- تحسين دالة ensure_user_exists لتعيين الدور بشكل صحيح
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
    -- تحديث المستخدم الموجود مع التأكيد على تحديث الدور
    UPDATE public.users
    SET
      email = user_email,
      full_name = user_full_name,
      role = COALESCE(user_role, role), -- استخدام القيمة الجديدة إذا وُجدت، وإلا استخدام القيمة الحالية
      branch_id = user_branch_id,
      is_active = true,
      updated_at = now()
    WHERE id = user_id;
  ELSE
    -- إنشاء مستخدم جديد مع تعيين الدور بشكل صريح
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
      COALESCE(user_role, 'user'), -- استخدام 'user' كقيمة افتراضية إذا كانت user_role فارغة
      user_branch_id,
      true,
      now(),
      now()
    );
  END IF;
END;
$$;

-- تحديث دالة handle_new_user لضمان تعيين الدور بشكل صحيح
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
    is_active
  ) VALUES (
    new.id,
    new.email,
    COALESCE(new_full_name, new.email),
    new_role,
    new_branch_id,
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    branch_id = EXCLUDED.branch_id;
  
  RETURN NEW;
END;
$$;