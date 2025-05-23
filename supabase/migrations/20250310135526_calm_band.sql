/*
  # إنشاء جدول المستخدمين وسياسات الأمان

  1. الجداول الجديدة
    - `users`
      - `id` (uuid, المفتاح الرئيسي)
      - `email` (text, فريد)
      - `full_name` (text)
      - `role` (text)
      - `is_active` (boolean)
      - `created_at` (timestamp)

  2. الأمان
    - تفعيل RLS على جدول `users`
    - إضافة سياسات للقراءة والتعديل والحذف للمستخدمين المصادقين
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'user')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "يمكن للمستخدمين المصادقين قراءة المستخدمين"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "يمكن للمدراء إضافة المستخدمين"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "يمكن للمدراء تعديل المستخدمين"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "يمكن للمدراء حذف المستخدمين"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );