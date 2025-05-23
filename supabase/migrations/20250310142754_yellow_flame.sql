/*
  # تصحيح سياسات الأمان لجدول المستخدمين

  1. التغييرات
    - إزالة السياسات القديمة
    - إضافة سياسات جديدة وواضحة
    
  2. السياسات الجديدة
    - المدراء يمكنهم الوصول لجميع المستخدمين
    - المستخدمون العاديون يمكنهم فقط رؤية وتعديل بياناتهم
*/

-- إزالة السياسات القديمة
DROP POLICY IF EXISTS "admins_can_create_users" ON users;
DROP POLICY IF EXISTS "admins_can_delete_users" ON users;
DROP POLICY IF EXISTS "admins_can_read_all_users_and_users_can_read_themselves" ON users;
DROP POLICY IF EXISTS "admins_can_update_all_users_and_users_can_update_themselves" ON users;

-- إضافة سياسات جديدة
CREATE POLICY "المدراء يمكنهم إنشاء المستخدمين"
ON users FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  )
);

CREATE POLICY "المدراء يمكنهم قراءة جميع المستخدمين"
ON users FOR SELECT TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  OR
  id = auth.uid()
);

CREATE POLICY "المدراء يمكنهم تحديث جميع المستخدمين"
ON users FOR UPDATE TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  OR
  id = auth.uid()
)
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  OR
  id = auth.uid()
);

CREATE POLICY "المدراء يمكنهم حذف المستخدمين"
ON users FOR DELETE TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);