/*
  # تصحيح سياسات الأمان لجدول المستخدمين

  1. التغييرات
    - إزالة جميع السياسات القديمة لتجنب التكرار اللانهائي
    - إنشاء سياسات جديدة مبسطة وواضحة
    - تحسين أداء الاستعلامات

  2. السياسات الجديدة
    - المدراء لديهم وصول كامل لجميع المستخدمين
    - المستخدمون العاديون يمكنهم فقط قراءة وتحديث بياناتهم الشخصية
*/

-- حذف جميع السياسات الحالية
DROP POLICY IF EXISTS "المدراء فقط يمكنهم إضافة مستخدمين" ON users;
DROP POLICY IF EXISTS "المدراء فقط يمكنهم حذف المستخدمين" ON users;
DROP POLICY IF EXISTS "المدراء والمستخدمون يمكنهم تحديث " ON users;
DROP POLICY IF EXISTS "المدراء يمكنهم رؤية جميع المستخدم" ON users;

-- إنشاء السياسات الجديدة
CREATE POLICY "سياسة القراءة للمستخدمين"
ON users
FOR SELECT
TO authenticated
USING (
  role = 'admin'
  OR
  id = auth.uid()
);

CREATE POLICY "سياسة الإضافة للمدراء"
ON users
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "سياسة التحديث للمستخدمين"
ON users
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
  OR
  id = auth.uid()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
  OR
  id = auth.uid()
);

CREATE POLICY "سياسة الحذف للمدراء"
ON users
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
);