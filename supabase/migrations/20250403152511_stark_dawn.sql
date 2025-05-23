/*
  # تصحيح سياسات الوصول للخطابات

  1. التغييرات
    - تحديث سياسات الوصول للخطابات
    - تبسيط شروط التحقق من الصلاحيات
    - إضافة سياسات للمستخدمين العاديين

  2. الأمان
    - تحسين التحكم في الوصول
    - السماح للمستخدمين بإنشاء وتعديل خطاباتهم
*/

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "allow_read_letters" ON letters;
DROP POLICY IF EXISTS "allow_create_letters" ON letters;
DROP POLICY IF EXISTS "allow_update_letters" ON letters;
DROP POLICY IF EXISTS "allow_delete_letters" ON letters;

-- سياسة القراءة: المستخدمون يقرؤون خطاباتهم فقط
CREATE POLICY "allow_read_letters"
ON letters FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- سياسة الإنشاء: المستخدمون يمكنهم إنشاء خطابات جديدة
CREATE POLICY "allow_create_letters"
ON letters FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

-- سياسة التحديث: المستخدمون يمكنهم تحديث خطاباتهم فقط
CREATE POLICY "allow_update_letters"
ON letters FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
);

-- سياسة الحذف: المستخدمون يمكنهم حذف خطاباتهم فقط
CREATE POLICY "allow_delete_letters"
ON letters FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
);