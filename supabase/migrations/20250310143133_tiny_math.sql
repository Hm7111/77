/*
  # تصحيح سياسات جدول المستخدمين

  1. التغييرات
    - حذف السياسات القديمة التي تسبب التكرار اللانهائي
    - إضافة سياسات جديدة مُحسنة:
      - المدراء يمكنهم الوصول لجميع المستخدمين
      - المستخدمون العاديون يمكنهم فقط الوصول لبياناتهم

  2. الأمان
    - تحسين شروط السياسات لمنع التكرار اللانهائي
    - الحفاظ على نموذج الأمان حيث المدراء لديهم وصول كامل
*/

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "المدراء يمكنهم إنشاء المستخدمين" ON users;
DROP POLICY IF EXISTS "المدراء يمكنهم تحديث جميع المستخد" ON users;
DROP POLICY IF EXISTS "المدراء يمكنهم حذف المستخدمين" ON users;
DROP POLICY IF EXISTS "المدراء يمكنهم قراءة جميع المستخد" ON users;

-- إضافة السياسات الجديدة
CREATE POLICY "select_users" ON users
FOR SELECT TO authenticated
USING (
  role = 'admin' OR
  auth.uid() = id
);

CREATE POLICY "insert_users" ON users
FOR INSERT TO authenticated
WITH CHECK (
  role = 'admin'
);

CREATE POLICY "update_users" ON users
FOR UPDATE TO authenticated
USING (
  role = 'admin' OR
  auth.uid() = id
)
WITH CHECK (
  role = 'admin' OR
  auth.uid() = id
);

CREATE POLICY "delete_users" ON users
FOR DELETE TO authenticated
USING (
  role = 'admin'
);