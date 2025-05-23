/*
  # إصلاح صلاحيات المستخدمين وإضافة وظائف مساعدة

  1. التغييرات
    - إضافة وظيفة للتحقق من صلاحيات المدير
    - تحديث سياسات الجدول
    
  2. الأمان
    - التحقق من صلاحيات المستخدم بشكل آمن
    - منع التكرار اللانهائي
*/

-- إنشاء وظيفة للتحقق من صلاحيات المدير
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إعادة تعيين سياسات الجدول
DROP POLICY IF EXISTS "allow_select" ON users;
DROP POLICY IF EXISTS "allow_insert" ON users;
DROP POLICY IF EXISTS "allow_update" ON users;
DROP POLICY IF EXISTS "allow_delete" ON users;

-- سياسات جديدة باستخدام الوظيفة المساعدة
CREATE POLICY "allow_select" ON users
FOR SELECT TO authenticated
USING (
  is_admin() OR id = auth.uid()
);

CREATE POLICY "allow_insert" ON users
FOR INSERT TO authenticated
WITH CHECK (
  is_admin()
);

CREATE POLICY "allow_update" ON users
FOR UPDATE TO authenticated
USING (
  is_admin() OR id = auth.uid()
);

CREATE POLICY "allow_delete" ON users
FOR DELETE TO authenticated
USING (
  is_admin()
);