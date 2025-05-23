/*
  # إصلاح جدول الخطابات وسياسات الأمان

  1. التغييرات
    - إعادة إنشاء جدول الخطابات مع الحقول الصحيحة
    - تحديث سياسات الأمان
    - إضافة المؤشرات اللازمة
*/

-- إعادة إنشاء جدول الخطابات إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  template_id uuid REFERENCES letter_templates(id) ON DELETE CASCADE NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL CHECK (status IN ('draft', 'completed')) DEFAULT 'draft',
  number integer,
  year integer,
  last_saved timestamptz DEFAULT now(),
  local_id uuid,
  sync_status text CHECK (sync_status IN ('pending', 'synced', 'failed')) DEFAULT 'synced',
  verification_url text UNIQUE,
  qr_data jsonb DEFAULT '{}',
  creator_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إضافة المؤشرات
CREATE INDEX IF NOT EXISTS letters_last_saved_idx ON letters(last_saved);
CREATE INDEX IF NOT EXISTS letters_local_id_idx ON letters(local_id);
CREATE INDEX IF NOT EXISTS letters_verification_url_idx ON letters(verification_url);

-- تفعيل RLS
ALTER TABLE letters ENABLE ROW LEVEL SECURITY;

-- إعادة إنشاء سياسات الأمان
DROP POLICY IF EXISTS "allow_read_letters" ON letters;
DROP POLICY IF EXISTS "allow_create_letters" ON letters;
DROP POLICY IF EXISTS "allow_update_letters" ON letters;
DROP POLICY IF EXISTS "allow_delete_letters" ON letters;

-- سياسة القراءة
CREATE POLICY "allow_read_letters"
ON letters FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  (SELECT is_admin())
);

-- سياسة الإنشاء
CREATE POLICY "allow_create_letters"
ON letters FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

-- سياسة التحديث
CREATE POLICY "allow_update_letters"
ON letters FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR
  (SELECT is_admin())
)
WITH CHECK (
  user_id = auth.uid() OR
  (SELECT is_admin())
);

-- سياسة الحذف
CREATE POLICY "allow_delete_letters"
ON letters FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() OR
  (SELECT is_admin())
);