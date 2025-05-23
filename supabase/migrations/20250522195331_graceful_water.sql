-- تحديث دالة الحصول على خطاب من طلب الموافقة
CREATE OR REPLACE FUNCTION get_letter_by_request_id(p_request_id uuid)
RETURNS TABLE (
  letter_id uuid,
  user_id uuid,
  template_id uuid,
  is_approver boolean
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

  -- إرجاع معرف الخطاب ومعرف المستخدم وما إذا كان المستخدم الحالي هو المعتمد
  RETURN QUERY
  SELECT 
    ar.letter_id,
    l.user_id,
    l.template_id,
    (ar.assigned_to = auth.uid()) as is_approver
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

-- تحسين دالة الحصول على تفاصيل الخطاب
CREATE OR REPLACE FUNCTION get_letter_details_for_approval(p_letter_id uuid)
RETURNS TABLE (
  id uuid,
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
    l.id,
    l.number,
    l.year,
    l.content->>'subject',
    l.content,
    l.template_id,
    lt.name as template_name,
    lt.image_url as template_image_url
  FROM letters l
  LEFT JOIN letter_templates lt ON l.template_id = lt.id
  WHERE l.id = p_letter_id;
END;
$$;

-- إضافة دالة للموافقة على الخطاب مع التوقيع
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
  -- التحقق من أن طلب الموافقة موجود
  IF NOT EXISTS (SELECT 1 FROM approval_requests WHERE id = p_request_id) THEN
    RAISE EXCEPTION 'طلب الموافقة غير موجود';
  END IF;

  -- التحقق من أن طلب الموافقة مخصص للمستخدم الحالي
  IF NOT EXISTS (
    SELECT 1 FROM approval_requests 
    WHERE id = p_request_id 
    AND assigned_to = auth.uid()
    AND status IN ('submitted', 'under_review')
  ) THEN
    RAISE EXCEPTION 'طلب الموافقة غير مخصص لك أو ليس في حالة تسمح بالموافقة';
  END IF;
  
  -- التحقق من أن التوقيع صالح وينتمي للمستخدم الحالي
  IF NOT EXISTS (
    SELECT 1 FROM signatures 
    WHERE id = p_signature_id 
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'التوقيع غير صالح أو لا ينتمي لك';
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

-- تحديث دالة الحصول على طلبات الموافقة المعلقة
CREATE OR REPLACE FUNCTION get_pending_approvals()
RETURNS TABLE (
  request_id uuid,
  letter_id uuid,
  letter_subject text,
  requester_name text,
  requester_id uuid,
  requested_at timestamptz,
  due_date timestamptz,
  comments text,
  status workflow_state
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- التحقق من صلاحية المستخدم الحالي
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول لاستخدام هذه الوظيفة';
  END IF;
  
  RETURN QUERY
  SELECT 
    ar.id as request_id,
    ar.letter_id,
    l.content->>'subject' as letter_subject,
    u.full_name as requester_name,
    u.id as requester_id,
    ar.created_at as requested_at,
    ar.due_date,
    ar.comments,
    ar.status
  FROM approval_requests ar
  JOIN letters l ON ar.letter_id = l.id
  JOIN users u ON ar.requested_by = u.id
  WHERE 
    ar.assigned_to = auth.uid() AND
    ar.status IN ('submitted', 'under_review')
  ORDER BY
    COALESCE(ar.due_date, ar.created_at + interval '7 days') ASC;
END;
$$;

-- إضافة سياسة للسماح للمستخدمين برؤية الخطابات التي تم تعيينها لهم للموافقة عليها
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'approvers_can_view_letters_in_approval' AND tablename = 'letters') THEN
    CREATE POLICY "approvers_can_view_letters_in_approval"
    ON letters FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM approval_requests
        WHERE 
          approval_requests.letter_id = letters.id AND
          approval_requests.assigned_to = auth.uid()
      )
    );
  END IF;
END
$$;