/*
  # إضافة سياسات الأمان لمجلد القوالب

  1. السياسات
    - إضافة سياسات القراءة والكتابة لمجلد القوالب
  2. الأمان
    - تمكين الوصول العام للقراءة
    - السماح للمستخدمين المسجلين بالرفع والتعديل والحذف
*/

-- إنشاء سياسات الأمان للمجلد
CREATE POLICY "القوالب مرئية للجميع"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'templates');

CREATE POLICY "المستخدمون المسجلون يمكنهم رفع القوالب"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'templates');

CREATE POLICY "المستخدمون المسجلون يمكنهم تعديل القوالب"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'templates');

CREATE POLICY "المستخدمون المسجلون يمكنهم حذف القوالب"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'templates');