/*
  # إنشاء bucket لتخزين قوالب الخطابات

  1. التخزين
    - إنشاء bucket جديد باسم `templates`
    - تمكين الوصول العام للقراءة
    - تمكين الوصول المقيد للكتابة والحذف

  2. السياسات
    - سياسة للرفع: المستخدمون المصادقون فقط
    - سياسة للحذف: المستخدمون المصادقون فقط
    - سياسة للقراءة: عامة
*/

-- إنشاء bucket للقوالب
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'templates'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('templates', 'templates', true);
  END IF;
END $$;

-- إعداد السياسات
DROP POLICY IF EXISTS "المستخدمون المصادقون يمكنهم رفع الملفات" ON storage.objects;
CREATE POLICY "المستخدمون المصادقون يمكنهم رفع الملفات"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'templates');

DROP POLICY IF EXISTS "المستخدمون المصادقون يمكنهم حذف الملفات" ON storage.objects;
CREATE POLICY "المستخدمون المصادقون يمكنهم حذف الملفات"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'templates');

DROP POLICY IF EXISTS "يمكن للجميع قراءة الملفات" ON storage.objects;
CREATE POLICY "يمكن للجميع قراءة الملفات"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'templates');