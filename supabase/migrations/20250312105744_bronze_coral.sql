/*
  # تحسين نظام القوالب

  1. التغييرات
    - إضافة حقول جديدة لجدول القوالب
    - إضافة جدول لتصنيفات القوالب
    - إضافة جدول لمناطق الكتابة في القوالب
    - إضافة جدول للمتغيرات المتاحة

  2. الجداول الجديدة
    - `template_categories`: تصنيفات القوالب
    - `template_zones`: مناطق الكتابة في القوالب
    - `template_variables`: المتغيرات المتاحة في القوالب
*/

-- إنشاء جدول تصنيفات القوالب
CREATE TABLE template_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إضافة حقول جديدة لجدول القوالب
ALTER TABLE letter_templates
ADD COLUMN category_id uuid REFERENCES template_categories(id),
ADD COLUMN variables jsonb DEFAULT '[]',
ADD COLUMN zones jsonb DEFAULT '[]',
ADD COLUMN parent_id uuid REFERENCES letter_templates(id),
ADD COLUMN version integer DEFAULT 1;

-- إنشاء جدول مناطق الكتابة
CREATE TABLE template_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES letter_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  x integer NOT NULL,
  y integer NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  font_size integer DEFAULT 14,
  font_family text DEFAULT 'Cairo',
  alignment text DEFAULT 'right',
  created_at timestamptz DEFAULT now()
);

-- إنشاء جدول المتغيرات
CREATE TABLE template_variables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  default_value text,
  type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- تفعيل RLS على الجداول الجديدة
ALTER TABLE template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_variables ENABLE ROW LEVEL SECURITY;

-- إضافة سياسات الأمان
CREATE POLICY "المستخدمون المصادقون يمكنهم قراءة التصنيفات"
  ON template_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "المستخدمون المصادقون يمكنهم قراءة المناطق"
  ON template_zones FOR SELECT TO authenticated USING (true);

CREATE POLICY "المستخدمون المصادقون يمكنهم قراءة المتغيرات"
  ON template_variables FOR SELECT TO authenticated USING (true);

-- إضافة بعض التصنيفات الأساسية
INSERT INTO template_categories (name, description) VALUES
  ('خطابات رسمية', 'قوالب للخطابات الرسمية والمراسلات الحكومية'),
  ('خطابات داخلية', 'قوالب للمراسلات الداخلية بين الإدارات'),
  ('تعاميم', 'قوالب للتعاميم والإعلانات العامة');

-- إضافة بعض المتغيرات الأساسية
INSERT INTO template_variables (name, description, type, default_value) VALUES
  ('اسم_المستلم', 'اسم الشخص أو الجهة المستلمة', 'text', 'سعادة/'),
  ('التاريخ_هجري', 'التاريخ الهجري الحالي', 'date', null),
  ('رقم_الخطاب', 'الرقم التسلسلي للخطاب', 'number', null),
  ('المرفقات', 'عدد المرفقات', 'number', '0');