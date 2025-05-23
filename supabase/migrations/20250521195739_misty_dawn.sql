/*
  # إضافة نظام إدارة الفروع

  1. الجداول الجديدة
    - `branches`: جدول للفروع 
      - `id` (uuid): معرف الفرع
      - `name` (text): اسم الفرع
      - `city` (text): المدينة
      - `code` (text): رمز الفرع
      - `is_active` (boolean): حالة الفرع
      - `created_at` (timestamp): تاريخ الإنشاء
      - `updated_at` (timestamp): تاريخ التحديث

  2. التغييرات
    - إضافة `branch_id` إلى جدول المستخدمين
    
  3. الأمان
    - تفعيل RLS على جدول الفروع
    - إضافة سياسات للقراءة والكتابة والتعديل والحذف
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

-- تفعيل RLS
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- إضافة حقل للفروع في جدول المستخدمين
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id) ON DELETE SET NULL;

-- سياسات الأمان للفروع

-- المستخدمون يمكنهم قراءة كل الفروع
CREATE POLICY "users_can_read_branches"
  ON branches
  FOR SELECT
  TO authenticated
  USING (true);

-- المدراء فقط يمكنهم إنشاء الفروع
CREATE POLICY "admins_can_insert_branches"
  ON branches
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- المدراء فقط يمكنهم تعديل الفروع
CREATE POLICY "admins_can_update_branches"
  ON branches
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- المدراء فقط يمكنهم حذف الفروع
CREATE POLICY "admins_can_delete_branches"
  ON branches
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- إضافة الفروع الافتراضية
INSERT INTO branches (name, city, code) VALUES
  ('الفرع الرئيسي', 'الرياض', 'RYD'),
  ('فرع الدمام', 'الدمام', 'DMM'),
  ('فرع جدة', 'جدة', 'JED')
ON CONFLICT (code) DO NOTHING;