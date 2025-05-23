/*
  # تحديث سياسات جدول المستخدمين

  1. التغييرات
    - تحديث سياسات الوصول للمستخدمين
    - السماح للمدراء بإدارة جميع المستخدمين
    - السماح للمستخدمين العاديين برؤية بياناتهم فقط

  2. الأمان
    - تفعيل RLS على جدول المستخدمين
    - إضافة سياسات محددة للقراءة والإضافة والتعديل والحذف
*/

-- إعادة ضبط السياسات الحالية
DROP POLICY IF EXISTS "سياسة القراءة للمستخدمين" ON users;
DROP POLICY IF EXISTS "سياسة الإضافة للمدراء" ON users;
DROP POLICY IF EXISTS "سياسة التحديث للمستخدمين" ON users;
DROP POLICY IF EXISTS "سياسة الحذف للمدراء" ON users;

-- إضافة السياسات الجديدة
CREATE POLICY "سياسة القراءة للمستخدمين"
ON users FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ) OR id = auth.uid()
);

CREATE POLICY "سياسة الإضافة للمدراء"
ON users FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "سياسة التحديث للمستخدمين"
ON users FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ) OR id = auth.uid()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ) OR id = auth.uid()
);

CREATE POLICY "سياسة الحذف للمدراء"
ON users FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);