/*
  # تصحيح سياسات الأمان لجدول المستخدمين

  1. التغييرات
    - إعادة تعريف سياسات الأمان لجدول المستخدمين
    - تبسيط شروط الوصول للمستخدمين والمدراء

  2. السياسات الجديدة
    - المدراء يمكنهم الوصول لجميع المستخدمين
    - المستخدمون العاديون يمكنهم فقط رؤية وتعديل بياناتهم الشخصية
*/

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "users_delete_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_read_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;

-- تعريف السياسات الجديدة
CREATE POLICY "المدراء يمكنهم رؤية جميع المستخدمين"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
    OR
    auth.uid() = id
  );

CREATE POLICY "المدراء فقط يمكنهم إضافة مستخدمين"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

CREATE POLICY "المدراء فقط يمكنهم حذف المستخدمين"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

CREATE POLICY "المدراء والمستخدمون يمكنهم تحديث بياناتهم"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
    OR
    auth.uid() = id
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
    OR
    auth.uid() = id
  );