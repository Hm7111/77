/*
  # تحسين سياسات الأمان للقوالب

  ١. السياسات الأمنية
    - تعديل سياسة إضافة القوالب للسماح للمستخدمين المصرح لهم
    - تحسين سياسة عرض القوالب
    - إضافة سياسات للتعديل والحذف
*/

-- إعادة تعريف سياسات الجدول
DROP POLICY IF EXISTS "Anyone can view active templates" ON letter_templates;
DROP POLICY IF EXISTS "Only admins can delete templates" ON letter_templates;
DROP POLICY IF EXISTS "Only admins can insert templates" ON letter_templates;
DROP POLICY IF EXISTS "Only admins can update templates" ON letter_templates;
DROP POLICY IF EXISTS "القوالب مرئية للجميع" ON letter_templates;
DROP POLICY IF EXISTS "فقط المسؤولون يمكنهم التعديل" ON letter_templates;

-- سياسة عرض القوالب
CREATE POLICY "عرض القوالب"
ON letter_templates FOR SELECT TO authenticated
USING (true);

-- سياسة إضافة القوالب
CREATE POLICY "إضافة القوالب"
ON letter_templates FOR INSERT TO authenticated
WITH CHECK (true);

-- سياسة تعديل القوالب
CREATE POLICY "تعديل القوالب"
ON letter_templates FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- سياسة حذف القوالب
CREATE POLICY "حذف القوالب"
ON letter_templates FOR DELETE TO authenticated
USING (true);