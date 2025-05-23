/*
  # إضافة نظام تسجيل الأحداث (Audit Log)

  1. الجداول الجديدة
    - `audit_logs`: سجل الأحداث
      - `id` (uuid): معرّف فريد
      - `user_id` (uuid): معرّف المستخدم الذي قام بالعملية
      - `action_type` (text): نوع العملية (create, update, delete)
      - `entity_type` (text): نوع الكيان (letter, template)
      - `entity_id` (uuid): معرّف الكيان
      - `details` (jsonb): تفاصيل العملية
      - `created_at` (timestamptz): تاريخ ووقت العملية
      - `user_name` (text): اسم المستخدم للعرض

  2. وظائف ومشغلات (Triggers)
    - وظيفة تسجيل الأحداث للخطابات
    - وظيفة تسجيل الأحداث للقوالب
    - مشغل للتسجيل التلقائي عند إنشاء أو تعديل أو حذف الخطابات والقوالب

  3. الأمان
    - تفعيل RLS على جدول سجل الأحداث
    - سياسات لقراءة السجل (للمدراء فقط)
*/

-- إنشاء جدول سجل الأحداث
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action_type text NOT NULL CHECK (action_type IN ('create', 'update', 'delete', 'view')),
  entity_type text NOT NULL CHECK (entity_type IN ('letter', 'template')),
  entity_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  user_name text
);

-- تفعيل نظام أمان الصفوف (RLS)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: المدراء فقط
CREATE POLICY "allow_admins_to_read_audit_logs"
ON audit_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  )
);

-- وظيفة تسجيل الأحداث للخطابات
CREATE OR REPLACE FUNCTION log_letter_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name text;
  action_text text;
  details_json jsonb;
  event_type text;
BEGIN
  -- تحديد نوع الحدث
  IF TG_OP = 'INSERT' THEN
    event_type := 'create';
    action_text := 'إنشاء خطاب جديد';
  ELSIF TG_OP = 'UPDATE' THEN
    event_type := 'update';
    action_text := 'تعديل خطاب';
  ELSIF TG_OP = 'DELETE' THEN
    event_type := 'delete';
    action_text := 'حذف خطاب';
  END IF;
  
  -- الحصول على اسم المستخدم
  SELECT full_name INTO user_name FROM users WHERE id = auth.uid();
  
  -- تحضير تفاصيل التغيير
  IF TG_OP = 'UPDATE' THEN
    details_json := jsonb_build_object(
      'letter_number', COALESCE(NEW.number, ''),
      'letter_year', COALESCE(NEW.year, ''),
      'action', action_text,
      'changed_fields', (
        SELECT jsonb_object_agg(key, value)
        FROM jsonb_each(to_jsonb(NEW) - to_jsonb(OLD))
      ),
      'status', NEW.status,
      'subject', COALESCE(NEW.content->>'subject', 'بدون موضوع')
    );
  ELSIF TG_OP = 'INSERT' THEN
    details_json := jsonb_build_object(
      'letter_number', COALESCE(NEW.number, ''),
      'letter_year', COALESCE(NEW.year, ''),
      'action', action_text,
      'status', NEW.status,
      'subject', COALESCE(NEW.content->>'subject', 'بدون موضوع')
    );
  ELSIF TG_OP = 'DELETE' THEN
    details_json := jsonb_build_object(
      'letter_number', COALESCE(OLD.number, ''),
      'letter_year', COALESCE(OLD.year, ''),
      'action', action_text,
      'status', OLD.status,
      'subject', COALESCE(OLD.content->>'subject', 'بدون موضوع')
    );
  END IF;
  
  -- إدخال سجل الحدث
  INSERT INTO audit_logs (
    user_id,
    action_type,
    entity_type,
    entity_id,
    details,
    user_name
  ) VALUES (
    auth.uid(),
    event_type,
    'letter',
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id 
      ELSE NEW.id 
    END,
    details_json,
    user_name
  );
  
  -- إعادة الصف المناسب
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- وظيفة تسجيل الأحداث للقوالب
CREATE OR REPLACE FUNCTION log_template_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name text;
  action_text text;
  details_json jsonb;
  event_type text;
BEGIN
  -- تحديد نوع الحدث
  IF TG_OP = 'INSERT' THEN
    event_type := 'create';
    action_text := 'إنشاء قالب جديد';
  ELSIF TG_OP = 'UPDATE' THEN
    event_type := 'update';
    action_text := 'تعديل قالب';
  ELSIF TG_OP = 'DELETE' THEN
    event_type := 'delete';
    action_text := 'حذف قالب';
  END IF;
  
  -- الحصول على اسم المستخدم
  SELECT full_name INTO user_name FROM users WHERE id = auth.uid();
  
  -- تحضير تفاصيل التغيير
  IF TG_OP = 'UPDATE' THEN
    details_json := jsonb_build_object(
      'name', NEW.name,
      'action', action_text,
      'changed_fields', (
        SELECT jsonb_object_agg(key, value)
        FROM jsonb_each(to_jsonb(NEW) - to_jsonb(OLD))
      ),
      'is_active', NEW.is_active
    );
  ELSIF TG_OP = 'INSERT' THEN
    details_json := jsonb_build_object(
      'name', NEW.name,
      'action', action_text,
      'is_active', NEW.is_active
    );
  ELSIF TG_OP = 'DELETE' THEN
    details_json := jsonb_build_object(
      'name', OLD.name,
      'action', action_text,
      'is_active', OLD.is_active
    );
  END IF;
  
  -- إدخال سجل الحدث
  INSERT INTO audit_logs (
    user_id,
    action_type,
    entity_type,
    entity_id,
    details,
    user_name
  ) VALUES (
    auth.uid(),
    event_type,
    'template',
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id 
      ELSE NEW.id 
    END,
    details_json,
    user_name
  );
  
  -- إعادة الصف المناسب
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- إنشاء المشغلات (Triggers) للخطابات
CREATE TRIGGER tr_log_letter_insert
AFTER INSERT ON letters
FOR EACH ROW
EXECUTE FUNCTION log_letter_change();

CREATE TRIGGER tr_log_letter_update
AFTER UPDATE ON letters
FOR EACH ROW
EXECUTE FUNCTION log_letter_change();

CREATE TRIGGER tr_log_letter_delete
BEFORE DELETE ON letters
FOR EACH ROW
EXECUTE FUNCTION log_letter_change();

-- إنشاء المشغلات (Triggers) للقوالب
CREATE TRIGGER tr_log_template_insert
AFTER INSERT ON letter_templates
FOR EACH ROW
EXECUTE FUNCTION log_template_change();

CREATE TRIGGER tr_log_template_update
AFTER UPDATE ON letter_templates
FOR EACH ROW
EXECUTE FUNCTION log_template_change();

CREATE TRIGGER tr_log_template_delete
BEFORE DELETE ON letter_templates
FOR EACH ROW
EXECUTE FUNCTION log_template_change();

-- وظيفة للتسجيل اليدوي للأحداث من واجهة المستخدم
CREATE OR REPLACE FUNCTION log_audit_event(
  p_action_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_details jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name text;
  v_log_id uuid;
BEGIN
  -- التحقق من نوع الحدث
  IF p_action_type NOT IN ('create', 'update', 'delete', 'view') THEN
    RAISE EXCEPTION 'Invalid action_type: %', p_action_type;
  END IF;
  
  -- التحقق من نوع الكيان
  IF p_entity_type NOT IN ('letter', 'template') THEN
    RAISE EXCEPTION 'Invalid entity_type: %', p_entity_type;
  END IF;
  
  -- الحصول على اسم المستخدم
  SELECT full_name INTO user_name FROM users WHERE id = auth.uid();
  
  -- إدخال سجل الحدث
  INSERT INTO audit_logs (
    user_id,
    action_type,
    entity_type,
    entity_id,
    details,
    user_name
  ) VALUES (
    auth.uid(),
    p_action_type,
    p_entity_type,
    p_entity_id,
    p_details,
    user_name
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- إنشاء مؤشر على حقول البحث الرئيسية
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type_id ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);