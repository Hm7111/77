-- إصلاح مشكلة تسجيل الدخول للمدير والمستخدمين

-- 1. حذف المشغل الموجود مسبقًا إذا وجد
DROP TRIGGER IF EXISTS check_user_active ON auth.sessions;
DROP FUNCTION IF EXISTS auth.check_user_is_active();

-- 2. التأكد من أن الحسابات الأساسية نشطة
UPDATE public.users
SET is_active = true
WHERE email IN ('admin@example.com', 'csi1ksa@gmail.com');

-- 3. تحسين وظيفة handle_new_user
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
  
  -- التعامل مع حساب المدير بشكل خاص
  IF new.email = 'admin@example.com' THEN
    new_role := 'admin';
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
    role = CASE 
      WHEN EXCLUDED.email = 'admin@example.com' THEN 'admin' 
      ELSE COALESCE(EXCLUDED.role, users.role)
    END,
    branch_id = COALESCE(EXCLUDED.branch_id, users.branch_id),
    updated_at = now(),
    is_active = CASE 
      WHEN EXCLUDED.email = 'admin@example.com' THEN true 
      ELSE COALESCE(users.is_active, true)
    END;
  
  RETURN NEW;
END;
$$;

-- 4. إضافة دالة للتأكد من أن المستخدم نشط قبل تسجيل الدخول
CREATE OR REPLACE FUNCTION public.check_user_active_status(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_active boolean;
  is_admin boolean;
BEGIN
  -- التحقق من حالة المستخدم ودوره
  SELECT 
    u.is_active,
    (u.role = 'admin')
  INTO 
    is_active,
    is_admin
  FROM public.users u
  WHERE u.id = user_id;
  
  -- السماح دائمًا للمدير بالدخول، أو التحقق من نشاط المستخدم العادي
  RETURN is_admin OR is_active;
END;
$$;