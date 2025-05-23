/*
  # إنشاء جداول القوالب والخطابات

  1. الجداول الجديدة
     - `letter_templates`: قوالب الخطابات
       - `id` (uuid): معرف فريد
       - `name` (text): اسم القالب
       - `description` (text): وصف القالب
       - `image_url` (text): رابط صورة القالب
       - `is_active` (boolean): حالة القالب
       - `created_at` (timestamp): تاريخ الإنشاء
       - `updated_at` (timestamp): تاريخ التحديث

  2. الأمان
     - تفعيل RLS على جدول `letter_templates`
     - إضافة سياسات للقراءة والتعديل
*/

-- إنشاء جدول قوالب الخطابات
CREATE TABLE IF NOT EXISTS letter_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE letter_templates ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان
CREATE POLICY "القوالب مرئية للجميع"
  ON letter_templates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "فقط المسؤولون يمكنهم التعديل"
  ON letter_templates
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');