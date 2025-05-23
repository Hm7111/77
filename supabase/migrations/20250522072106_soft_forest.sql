/*
  # إضافة نظام الصلاحيات RBAC

  1. الجداول الجديدة
    - `permissions`: الصلاحيات المتاحة في النظام
    - `user_roles`: الأدوار المتاحة في النظام
    - تحديث جدول `users` لإضافة حقل permissions

  2. الأمان
    - تفعيل RLS على جداول الصلاحيات والأدوار
    - إضافة سياسات أمان مناسبة
*/

-- إنشاء جدول الصلاحيات
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  code text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- إنشاء جدول الأدوار
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  permissions jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- تحديث جدول المستخدمين لإضافة حقل الصلاحيات الخاصة
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '[]';

-- تفعيل RLS
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- إضافة سياسات الأمان للصلاحيات
CREATE POLICY "المستخدمون المصادقون يمكنهم قراءة الصلاحيات"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "المدراء يمكنهم إنشاء الصلاحيات"
  ON permissions FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "المدراء يمكنهم تعديل الصلاحيات"
  ON permissions FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "المدراء يمكنهم حذف الصلاحيات"
  ON permissions FOR DELETE
  TO authenticated
  USING (is_admin());

-- إضافة سياسات الأمان للأدوار
CREATE POLICY "المستخدمون المصادقون يمكنهم قراءة الأدوار"
  ON user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "المدراء يمكنهم إنشاء الأدوار"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "المدراء يمكنهم تعديل الأدوار"
  ON user_roles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "المدراء يمكنهم حذف الأدوار"
  ON user_roles FOR DELETE
  TO authenticated
  USING (is_admin());

-- إضافة صلاحيات النظام الأساسية
INSERT INTO permissions (name, code, description) VALUES
  ('عرض الخطابات', 'view:letters', 'عرض قائمة الخطابات'),
  ('إنشاء الخطابات', 'create:letters', 'إنشاء خطابات جديدة'),
  ('تعديل الخطابات', 'edit:letters', 'تعديل جميع الخطابات'),
  ('تعديل الخطابات الخاصة', 'edit:letters:own', 'تعديل الخطابات التي أنشأها المستخدم فقط'),
  ('حذف الخطابات', 'delete:letters', 'حذف أي خطاب'),
  ('حذف الخطابات الخاصة', 'delete:letters:own', 'حذف الخطابات التي أنشأها المستخدم فقط'),
  
  ('عرض القوالب', 'view:templates', 'عرض قوالب الخطابات'),
  ('إنشاء القوالب', 'create:templates', 'إنشاء قوالب جديدة'),
  ('تعديل القوالب', 'edit:templates', 'تعديل القوالب الموجودة'),
  ('حذف القوالب', 'delete:templates', 'حذف القوالب'),
  
  ('عرض المستخدمين', 'view:users', 'عرض قائمة المستخدمين'),
  ('إنشاء المستخدمين', 'create:users', 'إنشاء مستخدمين جدد'),
  ('تعديل المستخدمين', 'edit:users', 'تعديل بيانات المستخدمين'),
  ('حذف المستخدمين', 'delete:users', 'حذف المستخدمين'),
  
  ('عرض الفروع', 'view:branches', 'عرض قائمة الفروع'),
  ('إنشاء الفروع', 'create:branches', 'إنشاء فروع جديدة'),
  ('تعديل الفروع', 'edit:branches', 'تعديل بيانات الفروع'),
  ('حذف الفروع', 'delete:branches', 'حذف الفروع'),
  
  ('عرض الإعدادات', 'view:settings', 'الوصول إلى صفحة الإعدادات'),
  ('تعديل الإعدادات', 'edit:settings', 'تعديل إعدادات النظام'),
  
  ('عرض سجلات الأحداث', 'view:audit_logs', 'عرض سجلات الأحداث والتغييرات'),
  ('عرض الصلاحيات', 'view:permissions', 'عرض نظام الصلاحيات والأدوار'),
  ('إدارة الصلاحيات', 'manage:permissions', 'إدارة الصلاحيات والأدوار')
  
ON CONFLICT (code) DO NOTHING;

-- إنشاء الأدوار الافتراضية
INSERT INTO user_roles (name, description, permissions)
SELECT 
  'مدير',
  'صلاحيات كاملة لإدارة النظام',
  (SELECT jsonb_agg(id) FROM permissions)
WHERE NOT EXISTS (SELECT 1 FROM user_roles WHERE name = 'مدير');

INSERT INTO user_roles (name, description, permissions)
SELECT 
  'مستخدم',
  'صلاحيات محدودة للعمل على الخطابات',
  (SELECT jsonb_agg(id) FROM permissions 
   WHERE code IN ('view:letters', 'create:letters', 'edit:letters:own', 'delete:letters:own', 'view:templates'))
WHERE NOT EXISTS (SELECT 1 FROM user_roles WHERE name = 'مستخدم');