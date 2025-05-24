/*
  # إصلاح نظام الموافقات على الخطابات

  1. التغييرات
    - تبسيط دالة approve_letter_with_signature
    - تحسين سياسات الوصول للمعتمدين
    - إضافة سياسات جديدة للتأكد من أن المعتمدين يمكنهم الوصول للخطابات
    
  2. الأمان
    - تحسين التحقق من الصلاحيات
    - ضمان أن المستخدمين المعتمدين يمكنهم الوصول للخطابات المطلوب الموافقة عليها
*/

-- حذف الدالة الحالية
DROP FUNCTION IF EXISTS approve_letter_with_signature(uuid, uuid, text);

-- إنشاء دالة مبسطة للموافقة على الخطاب مع التوقيع
CREATE OR REPLACE FUNCTION approve_letter_with_signature(
  p_request_id uuid,
  p_signature_id uuid,
  p_comments text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_letter_id uuid;
  v_previous_status workflow_state;
BEGIN
  -- التحقق من صحة المعرفات
  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'معرف طلب الموافقة لا يمكن أن يكون فارغاً';
  END IF;

  IF p_signature_id IS NULL THEN
    RAISE EXCEPTION 'معرف التوقيع لا يمكن أن يكون فارغاً';
  END IF;

  -- التحقق من أن طلب الموافقة موجود ومخصص للمستخدم الحالي
  IF NOT EXISTS (
    SELECT 1 FROM approval_requests 
    WHERE id = p_request_id 
    AND assigned_to = auth.uid()
  ) THEN
    RAISE EXCEPTION 'طلب الموافقة غير موجود أو غير مخصص لك';
  END IF;

  -- التحقق من أن التوقيع ينتمي للمستخدم الحالي
  IF NOT EXISTS (
    SELECT 1 FROM signatures 
    WHERE id = p_signature_id 
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'التوقيع غير صالح أو لا ينتمي لك';
  END IF;

  -- الحصول على معرف الخطاب والحالة السابقة
  SELECT 
    letter_id, 
    status 
  INTO 
    v_letter_id, 
    v_previous_status
  FROM approval_requests
  WHERE id = p_request_id;
  
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

-- تحسين سياسات الوصول للمعتمدين
DO $$ 
BEGIN
  -- سياسة للسماح للمعتمدين بتحديث طلبات الموافقة
  DROP POLICY IF EXISTS "approvers_can_update_approval_requests" ON approval_requests;
  
  CREATE POLICY "approvers_can_update_approval_requests"
  ON approval_requests
  FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

  -- سياسة للسماح للمعتمدين بتحديث الخطابات
  DROP POLICY IF EXISTS "approvers_can_update_assigned_letters" ON letters;
  
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

  -- سياسة للسماح للمعتمدين برؤية الخطابات المخصصة لهم
  DROP POLICY IF EXISTS "approvers_can_view_assigned_letters" ON letters;
  
  CREATE POLICY "approvers_can_view_assigned_letters"
  ON letters
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM approval_requests
      WHERE approval_requests.letter_id = letters.id
      AND approval_requests.assigned_to = auth.uid()
    )
  );
  
  -- سياسة للسماح للمعتمدين بإضافة سجلات الموافقة
  DROP POLICY IF EXISTS "approvers_can_insert_approval_logs" ON approval_logs;
  
  CREATE POLICY "approvers_can_insert_approval_logs"
  ON approval_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
END $$;

-- تحسين دالة get_letter_by_request_id
CREATE OR REPLACE FUNCTION get_letter_by_request_id(p_request_id uuid)
RETURNS TABLE (
  letter_id uuid,
  user_id uuid
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- التحقق من وجود طلب الموافقة
  IF NOT EXISTS (SELECT 1 FROM approval_requests WHERE id = p_request_id) THEN
    RAISE EXCEPTION 'طلب الموافقة غير موجود';
  END IF;

  -- إرجاع معرف الخطاب ومعرف المستخدم
  RETURN QUERY
  SELECT 
    ar.letter_id,
    l.user_id
  FROM approval_requests ar
  JOIN letters l ON ar.letter_id = l.id
  WHERE 
    ar.id = p_request_id AND
    (
      ar.assigned_to = auth.uid() OR  -- المستخدم هو المعتمد
      ar.requested_by = auth.uid() OR -- المستخدم هو الطالب
      l.user_id = auth.uid() OR       -- المستخدم هو منشئ الخطاب
      EXISTS (                        -- المستخدم مدير
        SELECT 1 FROM users
        WHERE users.id = auth.uid() AND role = 'admin'
      )
    );
END;
$$;

-- تحسين دالة get_letter_details_for_approval
CREATE OR REPLACE FUNCTION get_letter_details_for_approval(p_letter_id uuid)
RETURNS TABLE (
  letter_id uuid,
  number integer,
  year integer,
  subject text,
  content jsonb,
  template_id uuid,
  template_name text,
  template_image_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- التحقق من وجود الخطاب
  IF NOT EXISTS (SELECT 1 FROM letters WHERE id = p_letter_id) THEN
    RAISE EXCEPTION 'الخطاب غير موجود';
  END IF;

  -- التحقق من أن المستخدم له حق الوصول للخطاب
  IF NOT EXISTS (
    SELECT 1 FROM letters l
    LEFT JOIN approval_requests ar ON l.id = ar.letter_id
    WHERE 
      l.id = p_letter_id AND
      (
        l.user_id = auth.uid() OR                -- المنشئ
        ar.assigned_to = auth.uid() OR           -- المعتمد
        ar.requested_by = auth.uid() OR          -- الطالب
        EXISTS (                                 -- المدير
          SELECT 1 FROM users
          WHERE users.id = auth.uid() AND role = 'admin'
        )
      )
  ) THEN
    RAISE EXCEPTION 'ليس لديك صلاحية الوصول لهذا الخطاب';
  END IF;

  -- إرجاع تفاصيل الخطاب
  RETURN QUERY
  SELECT 
    l.id AS letter_id,
    l.number,
    l.year,
    l.content->>'subject' AS subject,
    l.content,
    l.template_id,
    lt.name AS template_name,
    lt.image_url AS template_image_url
  FROM letters l
  LEFT JOIN letter_templates lt ON l.template_id = lt.id
  WHERE l.id = p_letter_id;
END;
$$;