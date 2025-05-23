/*
  # إضافة نظام سير العمل والموافقات للخطابات

  1. الجداول الجديدة
    - `workflow_status` - جدول لتتبع حالات سير العمل المختلفة
    - `approval_requests` - جدول لتتبع طلبات الموافقة على الخطابات
    - `approval_logs` - جدول لتتبع سجلات الموافقات
    - `signatures` - جدول لتخزين توقيعات المستخدمين
    
  2. الوظائف
    - وظائف لإدارة حالات سير العمل
    - وظائف للتعامل مع طلبات الموافقة

  3. الأمان
    - تفعيل نظام RLS على الجداول الجديدة
    - إضافة سياسات للتحكم في الوصول
*/

-- إنشاء نوع لحالات سير العمل
DO $$ BEGIN
    CREATE TYPE workflow_state AS ENUM (
        'draft',        -- مسودة
        'submitted',    -- مقدم
        'under_review', -- قيد المراجعة
        'approved',     -- معتمد
        'rejected',     -- مرفوض
        'finalized'     -- نهائي
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- إنشاء جدول لتخزين توقيعات المستخدمين
CREATE TABLE IF NOT EXISTS signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  signature_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إنشاء جدول لتتبع طلبات الموافقة
CREATE TABLE IF NOT EXISTS approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id uuid REFERENCES letters(id) ON DELETE CASCADE NOT NULL,
  requested_by uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  status workflow_state NOT NULL DEFAULT 'submitted',
  comments text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  due_date timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text
);

-- إنشاء جدول لتتبع سجلات الموافقات والإجراءات
CREATE TABLE IF NOT EXISTS approval_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES approval_requests(id) ON DELETE CASCADE NOT NULL,
  letter_id uuid REFERENCES letters(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  status workflow_state NOT NULL,
  previous_status workflow_state,
  comments text,
  created_at timestamptz DEFAULT now()
);

-- إضافة حقل حالة سير العمل إلى جدول الخطابات
ALTER TABLE letters 
ADD COLUMN IF NOT EXISTS workflow_status workflow_state DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS approval_id uuid REFERENCES approval_requests(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS signature_id uuid REFERENCES signatures(id) ON DELETE SET NULL;

-- إنشاء دالة لإنشاء طلب موافقة جديد
CREATE OR REPLACE FUNCTION create_approval_request(
  p_letter_id uuid,
  p_approver_id uuid,
  p_comments text DEFAULT NULL,
  p_due_date timestamptz DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_id uuid;
BEGIN
  -- التحقق من أن الخطاب موجود
  IF NOT EXISTS (SELECT 1 FROM letters WHERE id = p_letter_id) THEN
    RAISE EXCEPTION 'الخطاب غير موجود';
  END IF;
  
  -- التحقق من أن المستخدم المعتمد موجود
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_approver_id AND is_active = true) THEN
    RAISE EXCEPTION 'المستخدم المعتمد غير موجود أو غير نشط';
  END IF;
  
  -- إنشاء طلب الموافقة
  INSERT INTO approval_requests (
    letter_id,
    requested_by,
    assigned_to,
    status,
    comments,
    due_date
  ) VALUES (
    p_letter_id,
    auth.uid(),
    p_approver_id,
    'submitted',
    p_comments,
    p_due_date
  )
  RETURNING id INTO v_request_id;
  
  -- تحديث حالة الخطاب
  UPDATE letters
  SET 
    workflow_status = 'submitted',
    approval_id = v_request_id,
    updated_at = now()
  WHERE id = p_letter_id;
  
  -- إضافة سجل في سجل الموافقات
  INSERT INTO approval_logs (
    request_id,
    letter_id,
    user_id,
    action,
    status,
    previous_status,
    comments
  ) VALUES (
    v_request_id,
    p_letter_id,
    auth.uid(),
    'submit',
    'submitted',
    'draft',
    p_comments
  );
  
  RETURN v_request_id;
END;
$$;

-- إنشاء دالة للموافقة على الخطاب
CREATE OR REPLACE FUNCTION approve_letter(
  p_request_id uuid,
  p_comments text DEFAULT NULL,
  p_signature_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_letter_id uuid;
  v_previous_status workflow_state;
BEGIN
  -- التحقق من أن طلب الموافقة موجود وأنه مخصص للمستخدم الحالي
  IF NOT EXISTS (
    SELECT 1 FROM approval_requests 
    WHERE id = p_request_id 
    AND assigned_to = auth.uid()
    AND status IN ('submitted', 'under_review')
  ) THEN
    RAISE EXCEPTION 'طلب الموافقة غير موجود أو غير مخصص لك أو ليس في حالة تسمح بالموافقة';
  END IF;
  
  -- الحصول على معرف الخطاب والحالة السابقة
  SELECT 
    ar.letter_id, 
    ar.status 
  INTO 
    v_letter_id, 
    v_previous_status
  FROM approval_requests ar
  WHERE ar.id = p_request_id;
  
  -- التحقق من أن المستخدم لديه توقيع، أو أنه تم تزويد معرف التوقيع
  IF p_signature_id IS NULL THEN
    p_signature_id := (SELECT id FROM signatures WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 1);
    
    IF p_signature_id IS NULL THEN
      RAISE EXCEPTION 'لا يمكن الموافقة بدون توقيع. يرجى تحميل توقيع أو تقديم معرف توقيع صالح.';
    END IF;
  ELSE
    -- التحقق من أن التوقيع ينتمي للمستخدم الحالي
    IF NOT EXISTS (SELECT 1 FROM signatures WHERE id = p_signature_id AND user_id = auth.uid()) THEN
      RAISE EXCEPTION 'التوقيع المقدم غير صالح أو لا ينتمي إليك.';
    END IF;
  END IF;
  
  -- تحديث طلب الموافقة
  UPDATE approval_requests
  SET 
    status = 'approved',
    comments = COALESCE(p_comments, comments),
    updated_at = now(),
    approved_at = now()
  WHERE id = p_request_id;
  
  -- تحديث الخطاب
  UPDATE letters
  SET 
    workflow_status = 'approved',
    updated_at = now(),
    signature_id = p_signature_id
  WHERE id = v_letter_id;
  
  -- إضافة سجل في سجل الموافقات
  INSERT INTO approval_logs (
    request_id,
    letter_id,
    user_id,
    action,
    status,
    previous_status,
    comments
  ) VALUES (
    p_request_id,
    v_letter_id,
    auth.uid(),
    'approve',
    'approved',
    v_previous_status,
    p_comments
  );
  
  RETURN true;
END;
$$;

-- إنشاء دالة لرفض الخطاب
CREATE OR REPLACE FUNCTION reject_letter(
  p_request_id uuid,
  p_reason text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_letter_id uuid;
  v_previous_status workflow_state;
BEGIN
  -- التحقق من أن طلب الموافقة موجود وأنه مخصص للمستخدم الحالي
  IF NOT EXISTS (
    SELECT 1 FROM approval_requests 
    WHERE id = p_request_id 
    AND assigned_to = auth.uid()
    AND status IN ('submitted', 'under_review')
  ) THEN
    RAISE EXCEPTION 'طلب الموافقة غير موجود أو غير مخصص لك أو ليس في حالة تسمح بالرفض';
  END IF;
  
  -- الحصول على معرف الخطاب والحالة السابقة
  SELECT 
    ar.letter_id, 
    ar.status 
  INTO 
    v_letter_id, 
    v_previous_status
  FROM approval_requests ar
  WHERE ar.id = p_request_id;
  
  -- تحديث طلب الموافقة
  UPDATE approval_requests
  SET 
    status = 'rejected',
    rejection_reason = p_reason,
    updated_at = now(),
    rejected_at = now()
  WHERE id = p_request_id;
  
  -- تحديث الخطاب
  UPDATE letters
  SET 
    workflow_status = 'rejected',
    updated_at = now()
  WHERE id = v_letter_id;
  
  -- إضافة سجل في سجل الموافقات
  INSERT INTO approval_logs (
    request_id,
    letter_id,
    user_id,
    action,
    status,
    previous_status,
    comments
  ) VALUES (
    p_request_id,
    v_letter_id,
    auth.uid(),
    'reject',
    'rejected',
    v_previous_status,
    p_reason
  );
  
  RETURN true;
END;
$$;

-- إنشاء دالة للاستعلام عن طلبات الموافقة المعلقة للمستخدم
CREATE OR REPLACE FUNCTION get_pending_approvals()
RETURNS TABLE (
  request_id uuid,
  letter_id uuid,
  letter_subject text,
  requester_name text,
  requested_at timestamptz,
  due_date timestamptz,
  comments text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ar.id as request_id,
    ar.letter_id,
    l.content->>'subject' as letter_subject,
    u.full_name as requester_name,
    ar.created_at as requested_at,
    ar.due_date,
    ar.comments
  FROM approval_requests ar
  JOIN letters l ON ar.letter_id = l.id
  JOIN users u ON ar.requested_by = u.id
  WHERE 
    ar.assigned_to = auth.uid() AND
    ar.status IN ('submitted', 'under_review');
END;
$$;

-- إنشاء دالة لتحويل حالة الخطاب إلى نهائية
CREATE OR REPLACE FUNCTION finalize_letter(
  p_letter_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_id uuid;
  v_previous_status workflow_state;
BEGIN
  -- التحقق من أن الخطاب موجود
  IF NOT EXISTS (
    SELECT 1 FROM letters 
    WHERE id = p_letter_id 
    AND (
      user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    )
  ) THEN
    RAISE EXCEPTION 'الخطاب غير موجود أو ليس لديك صلاحية للوصول إليه';
  END IF;
  
  -- التحقق من أن الخطاب معتمد
  IF NOT EXISTS (SELECT 1 FROM letters WHERE id = p_letter_id AND workflow_status = 'approved') THEN
    RAISE EXCEPTION 'لا يمكن تحويل الخطاب إلى نهائي إلا إذا كان معتمداً';
  END IF;
  
  -- الحصول على معرف طلب الموافقة والحالة السابقة
  SELECT 
    l.approval_id,
    l.workflow_status
  INTO 
    v_request_id,
    v_previous_status
  FROM letters l
  WHERE l.id = p_letter_id;
  
  -- تحديث الخطاب
  UPDATE letters
  SET 
    workflow_status = 'finalized',
    status = 'completed',
    updated_at = now()
  WHERE id = p_letter_id;
  
  -- تحديث طلب الموافقة إن وجد
  IF v_request_id IS NOT NULL THEN
    UPDATE approval_requests
    SET status = 'finalized'
    WHERE id = v_request_id;
    
    -- إضافة سجل في سجل الموافقات
    INSERT INTO approval_logs (
      request_id,
      letter_id,
      user_id,
      action,
      status,
      previous_status,
      comments
    ) VALUES (
      v_request_id,
      p_letter_id,
      auth.uid(),
      'finalize',
      'finalized',
      v_previous_status,
      'تم تحويل الخطاب إلى نهائي'
    );
  END IF;
  
  RETURN true;
END;
$$;

-- تطبيق سياسات الأمان على الجداول الجديدة

-- سياسات التوقيعات
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;

-- المستخدم يمكنه رؤية توقيعه فقط
CREATE POLICY "users_can_view_own_signatures"
ON signatures FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- المستخدم يمكنه إضافة توقيعاته
CREATE POLICY "users_can_add_signatures"
ON signatures FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- المستخدم يمكنه تعديل توقيعاته
CREATE POLICY "users_can_update_own_signatures"
ON signatures FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- المستخدم يمكنه حذف توقيعاته
CREATE POLICY "users_can_delete_own_signatures"
ON signatures FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- سياسات طلبات الموافقة
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

-- المستخدم يمكنه رؤية طلبات الموافقة التي أنشأها أو المخصصة له
CREATE POLICY "users_can_view_related_approval_requests"
ON approval_requests FOR SELECT
TO authenticated
USING (
  requested_by = auth.uid() OR
  assigned_to = auth.uid() OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- المستخدم يمكنه إنشاء طلبات موافقة للخطابات التي أنشأها
CREATE POLICY "users_can_create_approval_requests"
ON approval_requests FOR INSERT
TO authenticated
WITH CHECK (
  requested_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM letters
    WHERE id = approval_requests.letter_id
    AND user_id = auth.uid()
  )
);

-- المستخدم يمكنه تحديث طلبات الموافقة التي أنشأها
CREATE POLICY "users_can_update_own_approval_requests"
ON approval_requests FOR UPDATE
TO authenticated
USING (
  requested_by = auth.uid() OR
  assigned_to = auth.uid() OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  (requested_by = auth.uid() AND status = 'submitted') OR
  (assigned_to = auth.uid() AND status IN ('submitted', 'under_review')) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- المستخدم يمكنه حذف طلبات الموافقة التي أنشأها فقط قبل الموافقة عليها
CREATE POLICY "users_can_delete_own_approval_requests"
ON approval_requests FOR DELETE
TO authenticated
USING (
  requested_by = auth.uid() AND
  status = 'submitted'
);

-- سياسات سجلات الموافقات
ALTER TABLE approval_logs ENABLE ROW LEVEL SECURITY;

-- المستخدمون يمكنهم رؤية سجلات الموافقات المتعلقة بخطاباتهم
CREATE POLICY "users_can_view_related_approval_logs"
ON approval_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM approval_requests ar
    JOIN letters l ON ar.letter_id = l.id
    WHERE 
      approval_logs.request_id = ar.id AND
      (l.user_id = auth.uid() OR ar.assigned_to = auth.uid() OR
       EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  )
);

-- فقط النظام يمكنه إضافة سجلات موافقات
CREATE POLICY "system_can_add_approval_logs"
ON approval_logs FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

-- لا يمكن لأحد تعديل أو حذف سجلات الموافقات
CREATE POLICY "no_one_can_update_approval_logs"
ON approval_logs FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "no_one_can_delete_approval_logs"
ON approval_logs FOR DELETE
TO authenticated
USING (false);

-- إنشاء bucket لتخزين توقيعات المستخدمين
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'signatures'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('signatures', 'توقيعات المستخدمين', false);
  END IF;
END $$;

-- إضافة سياسات التخزين للتوقيعات
CREATE POLICY "users_can_add_signatures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'signatures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "users_can_view_own_signatures"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'signatures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "users_can_update_own_signatures"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'signatures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "users_can_delete_own_signatures"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'signatures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);