/*
  # تصحيح سياسات الأمان لجدول المستخدمين

  1. التغييرات
    - تحديث سياسات القراءة والكتابة لجدول المستخدمين
    - السماح للمدير بإدارة جميع المستخدمين
    - السماح للمستخدم العادي بقراءة وتحديث بياناته فقط

  2. الأمان
    - تمكين RLS على جدول المستخدمين
    - إضافة سياسات جديدة للقراءة والكتابة
*/

-- إعادة تعيين السياسات الحالية
DROP POLICY IF EXISTS "users_delete_admin_only" ON users;
DROP POLICY IF EXISTS "users_insert_admin_only" ON users;
DROP POLICY IF EXISTS "users_read_access" ON users;
DROP POLICY IF EXISTS "users_update_admin_only" ON users;

-- سياسة القراءة: المدير يمكنه قراءة جميع المستخدمين، والمستخدم العادي يقرأ بياناته فقط
CREATE POLICY "users_read_policy" ON users
  FOR SELECT USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- سياسة الإضافة: المدير فقط
CREATE POLICY "users_insert_policy" ON users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- سياسة التحديث: المدير يمكنه تحديث أي مستخدم، والمستخدم العادي يحدث بياناته فقط
CREATE POLICY "users_update_policy" ON users
  FOR UPDATE USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- سياسة الحذف: المدير فقط
CREATE POLICY "users_delete_policy" ON users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );