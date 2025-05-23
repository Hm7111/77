/*
  # إنشاء جدول الخطابات

  1. جداول جديدة
    - `letters`
      - `id` (uuid): معرف الخطاب
      - `user_id` (uuid): معرف المستخدم المنشئ
      - `template_id` (uuid): معرف القالب المستخدم
      - `content` (jsonb): محتوى الخطاب
      - `status` (text): حالة الخطاب (مسودة، مكتمل)
      - `created_at` (timestamp): تاريخ الإنشاء
      - `updated_at` (timestamp): تاريخ التحديث

  2. الأمان
    - تفعيل RLS على جدول الخطابات
    - إضافة سياسات للقراءة والكتابة والتعديل والحذف
*/

-- إنشاء جدول الخطابات
CREATE TABLE IF NOT EXISTS letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  template_id uuid REFERENCES letter_templates(id) ON DELETE CASCADE NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL CHECK (status IN ('draft', 'completed')) DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE letters ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان

-- المستخدمون يمكنهم قراءة خطاباتهم فقط
CREATE POLICY "Users can read own letters"
  ON letters
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- المدراء يمكنهم قراءة جميع الخطابات
CREATE POLICY "Admins can read all letters"
  ON letters
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- المستخدمون يمكنهم إنشاء خطابات جديدة
CREATE POLICY "Users can create letters"
  ON letters
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- المستخدمون يمكنهم تعديل خطاباتهم فقط
CREATE POLICY "Users can update own letters"
  ON letters
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- المستخدمون يمكنهم حذف خطاباتهم فقط
CREATE POLICY "Users can delete own letters"
  ON letters
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);