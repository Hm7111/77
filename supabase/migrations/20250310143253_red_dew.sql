/*
  # تصحيح سياسة قراءة المستخدمين

  1. التغييرات
    - تحديث سياسة القراءة لتستخدم دور المستخدم المصادق عليه
    - استخدام استعلام فرعي للتحقق من دور المستخدم

  2. الأمان
    - التأكد من أن المدراء فقط يمكنهم رؤية جميع المستخدمين
    - السماح للمستخدمين العاديين برؤية بياناتهم فقط
*/

-- حذف السياسة القديمة
DROP POLICY IF EXISTS "select_users" ON users;

-- إنشاء السياسة الجديدة
CREATE POLICY "select_users" ON users
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ) OR auth.uid() = id
);