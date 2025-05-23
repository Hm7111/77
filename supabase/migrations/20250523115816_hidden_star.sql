/*
  # إضافة صلاحيات الموافقة على الخطابات

  1. التغييرات
    - إضافة صلاحيات جديدة متعلقة بنظام الموافقات
    - تحديث الأدوار الافتراضية لتشمل صلاحيات الموافقة
    
  2. الأمان
    - ضمان أن المستخدمين لديهم الصلاحيات المناسبة للوصول إلى نظام الموافقات
    - تحسين التحكم في الوصول للخطابات والموافقات
*/

-- إضافة صلاحيات الموافقة إلى جدول الصلاحيات
INSERT INTO permissions (name, code, description) VALUES
  ('عرض الموافقات', 'view:approvals', 'عرض طلبات الموافقة والاطلاع عليها'),
  ('طلب موافقة', 'request:approval', 'إرسال طلب موافقة على خطاب'),
  ('الموافقة على الخطابات', 'approve:letters', 'الموافقة على الخطابات المرسلة للمراجعة'),
  ('رفض الخطابات', 'reject:letters', 'رفض الخطابات المرسلة للمراجعة')
ON CONFLICT (code) DO NOTHING;

-- تحديث دور المدير ليشمل جميع صلاحيات الموافقة
UPDATE user_roles
SET permissions = (
  SELECT jsonb_agg(id) FROM permissions
)
WHERE name = 'مدير';

-- تحديث دور المستخدم ليشمل صلاحيات عرض الموافقات وطلب الموافقة
UPDATE user_roles
SET permissions = (
  SELECT jsonb_agg(id) FROM permissions 
  WHERE code IN (
    'view:letters', 'create:letters', 'edit:letters:own', 
    'delete:letters:own', 'view:templates', 'view:approvals', 
    'request:approval'
  )
)
WHERE name = 'مستخدم';

-- تحسين سياسات الوصول للمعتمدين
DO $$ 
BEGIN
  -- سياسة للسماح للمعتمدين بتحديث طلبات الموافقة
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'approvers_can_update_approval_requests' AND tablename = 'approval_requests') THEN
    CREATE POLICY "approvers_can_update_approval_requests"
    ON approval_requests
    FOR UPDATE
    TO authenticated
    USING (assigned_to = auth.uid())
    WITH CHECK (assigned_to = auth.uid());
  END IF;

  -- سياسة للسماح للمعتمدين بتحديث الخطابات
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'approvers_can_update_assigned_letters' AND tablename = 'letters') THEN
    CREATE POLICY "approvers_can_update_assigned_letters"
    ON letters
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM approval_requests
        WHERE approval_requests.letter_id = letters.id
        AND approval_requests.assigned_to = auth.uid()
      )
    );
  END IF;
END $$;