/*
  # تبسيط سياسات الأمان للمستخدمين

  1. التغييرات
    - إزالة جميع السياسات القديمة
    - إضافة سياسات مبسطة وفعالة
    
  2. السياسات الجديدة
    - سياسة واحدة لكل عملية (SELECT, INSERT, UPDATE, DELETE)
    - استخدام شروط بسيطة لتجنب التكرار
*/

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "select_users" ON users;
DROP POLICY IF EXISTS "insert_users" ON users;
DROP POLICY IF EXISTS "update_users" ON users;
DROP POLICY IF EXISTS "delete_users" ON users;

-- إضافة سياسات جديدة ومبسطة
CREATE POLICY "allow_select" ON users
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
  OR id = auth.uid()
);

CREATE POLICY "allow_insert" ON users
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

CREATE POLICY "allow_update" ON users
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
  OR id = auth.uid()
);

CREATE POLICY "allow_delete" ON users
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);