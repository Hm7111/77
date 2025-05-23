/*
  # إضافة نظام إدارة الفروع

  1. الجداول الجديدة
     - `branches`: جدول الفروع
       - `id` (uuid): معرف فريد
       - `name` (text): اسم الفرع
       - `city` (text): المدينة
       - `code` (text): رمز الفرع
       - `is_active` (boolean): حالة الفرع
       - `created_at` (timestamp): تاريخ الإنشاء
       - `updated_at` (timestamp): تاريخ التحديث
  
  2. التعديلات
     - إضافة `branch_id` لجدول `users` لربط المستخدمين بالفروع
  
  3. الأمان
     - تفعيل RLS على جدول `branches`
     - إضافة سياسات للقراءة والتعديل
*/

-- إنشاء جدول الفروع
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL,
  code text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إضافة معرف الفرع إلى جدول المستخدمين
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id);

-- تفعيل RLS على جدول الفروع
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: المستخدمون المصادقون يمكنهم قراءة جميع الفروع
CREATE POLICY "branches_read_policy" ON branches
FOR SELECT TO authenticated
USING (true);

-- سياسة الإنشاء: المدراء فقط
CREATE POLICY "branches_insert_policy" ON branches
FOR INSERT TO authenticated
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- سياسة التعديل: المدراء فقط
CREATE POLICY "branches_update_policy" ON branches
FOR UPDATE TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- سياسة الحذف: المدراء فقط
CREATE POLICY "branches_delete_policy" ON branches
FOR DELETE TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- إنشاء الفروع الأساسية
INSERT INTO branches (name, city, code)
VALUES 
  ('الفرع الرئيسي', 'الرياض', 'RYD'),
  ('فرع الدمام', 'الدمام', 'DMM'),
  ('فرع جدة', 'جدة', 'JED')
ON CONFLICT (code) DO NOTHING;

-- تحديث سياسات المستخدمين لدعم الفروع
-- إضافة شرط الفرع للسياسات المناسبة حسب الحاجة