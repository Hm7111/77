/*
  # تحسين سياسات الأمان للخطابات

  1. التغييرات
    - تحديث سياسات الوصول للخطابات
    - منع المدراء من رؤية خطابات المستخدمين
    - السماح للمستخدمين برؤية خطاباتهم فقط

  2. الأمان
    - تحسين الخصوصية بين المستخدمين
    - منع تسرب البيانات
*/

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "allow_read_letters" ON letters;
DROP POLICY IF EXISTS "allow_create_letters" ON letters;
DROP POLICY IF EXISTS "allow_update_letters" ON letters;
DROP POLICY IF EXISTS "allow_delete_letters" ON letters;

-- سياسة القراءة: المستخدمون يقرؤون خطاباتهم فقط
CREATE POLICY "allow_read_own_letters"
ON letters FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- سياسة الإنشاء: المستخدمون ينشئون خطابات لأنفسهم فقط
CREATE POLICY "allow_create_own_letters"
ON letters FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

-- سياسة التحديث: المستخدمون يعدلون خطاباتهم فقط
CREATE POLICY "allow_update_own_letters"
ON letters FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
);

-- سياسة الحذف: المستخدمون يحذفون خطاباتهم فقط
CREATE POLICY "allow_delete_own_letters"
ON letters FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
);