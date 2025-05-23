/*
  # تحسين سياسات الأمان لجدول الخطابات

  1. التغييرات
    - تحديث سياسات القراءة والكتابة للخطابات
    - تحسين التحكم في الوصول للبيانات
    - إضافة فحوصات أمنية إضافية

  2. الأمان
    - المدراء يمكنهم رؤية جميع الخطابات
    - المستخدمون العاديون يرون خطاباتهم فقط
    - منع تسرب البيانات بين المستخدمين
*/

-- إعادة تعيين السياسات الحالية
DROP POLICY IF EXISTS "Users can read own letters" ON letters;
DROP POLICY IF EXISTS "Admins can read all letters" ON letters;
DROP POLICY IF EXISTS "Users can create letters" ON letters;
DROP POLICY IF EXISTS "Users can update own letters" ON letters;
DROP POLICY IF EXISTS "Users can delete own letters" ON letters;

-- إنشاء دالة للتحقق من صلاحيات المدير
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  );
END;
$$;

-- سياسة القراءة: المدراء يمكنهم قراءة كل شيء، والمستخدمون يقرؤون خطاباتهم فقط
CREATE POLICY "allow_read_letters"
ON letters FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  (SELECT is_admin())
);

-- سياسة الإنشاء: المستخدمون يمكنهم إنشاء خطابات لأنفسهم فقط
CREATE POLICY "allow_create_letters"
ON letters FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

-- سياسة التحديث: المدراء يمكنهم تحديث كل شيء، والمستخدمون يحدثون خطاباتهم فقط
CREATE POLICY "allow_update_letters"
ON letters FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR
  (SELECT is_admin())
)
WITH CHECK (
  user_id = auth.uid() OR
  (SELECT is_admin())
);

-- سياسة الحذف: المدراء يمكنهم حذف كل شيء، والمستخدمون يحذفون خطاباتهم فقط
CREATE POLICY "allow_delete_letters"
ON letters FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() OR
  (SELECT is_admin())
);

-- التأكد من تفعيل RLS
ALTER TABLE letters ENABLE ROW LEVEL SECURITY;