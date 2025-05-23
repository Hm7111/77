/*
  # إنشاء bucket لتخزين قوالب الخطابات

  1. Buckets الجديدة
    - `templates`: لتخزين صور قوالب الخطابات
      - عام للقراءة
      - يتطلب المصادقة للكتابة والحذف

  2. الأمان
    - سياسات للرفع والحذف للمستخدمين المصادقين
    - سياسة للقراءة العامة
*/

-- إنشاء bucket للقوالب إذا لم يكن موجوداً
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'templates'
  ) THEN
    insert into storage.buckets (id, name, public)
    values ('templates', 'templates', true);
  END IF;
END $$;

-- إنشاء السياسات للتحكم في الوصول
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