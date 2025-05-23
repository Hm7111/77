/*
  # إصلاح إضافي لنظام المستخدمين والصلاحيات

  1. التغييرات
    - إضافة دالة للتحقق مما إذا كان المستخدم لديه صلاحية معينة
    - تصحيح سياسات الأمان للمستخدمين والأدوار
    - تحسين آلية التحقق من الصلاحيات

  2. الأمان
    - تحسين التحكم في الوصول
    - ضمان فصل المخاوف الأمنية
*/

-- إضافة دالة للتحقق من صلاحيات المستخدم
CREATE OR REPLACE FUNCTION public.has_permission(user_id UUID, permission_code TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  has_perm boolean;
BEGIN
  -- الحصول على دور المستخدم
  SELECT role INTO user_role FROM public.users WHERE id = user_id;
  
  -- التحقق مما إذا كان المستخدم مديراً (لديه جميع الصلاحيات)
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- التحقق من وجود الصلاحية المحددة لدى المستخدم
  SELECT EXISTS (
    SELECT 1 FROM permissions p
    JOIN users u ON u.id = user_id
    WHERE u.permissions @> ARRAY[p.id]::jsonb
    AND p.code = permission_code
  ) INTO has_perm;
  
  RETURN has_perm;
END;
$$;

-- إعادة تعيين مؤشر الحذف للأدوار إلى permissions
CREATE OR REPLACE FUNCTION check_role_usage(role_id UUID)
RETURNS TABLE (user_id UUID, user_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.full_name
  FROM users u
  WHERE 
    u.permissions @> ARRAY[role_id]::jsonb OR 
    u.permissions::text LIKE '%' || role_id || '%';
END;
$$;