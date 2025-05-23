/*
  # تصحيح دوال نظام الموافقات

  1. التغييرات
    - تحديث وإعادة إنشاء دالة get_letter_by_request_id لحل مشاكل الوسائط
    - تحسين دالة get_letter_details_for_approval لتجنب التباس الأعمدة
    - إضافة دالة approve_letter_with_signature لتحسين عملية الموافقة

  2. الأمان
    - تحسين فحوصات التحقق من الصلاحيات
    - استخدام بنية متسقة لكافة الدوال
*/

-- إعادة إنشاء دالة get_letter_by_request_id بصورة صحيحة
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

-- تحسين دالة الموافقة على الخطاب مع دعم التوقيع
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
  -- التحقق من أن طلب الموافقة موجود وأنه مخصص للمستخدم الحالي
  IF NOT EXISTS (
    SELECT 1 FROM approval_requests 
    WHERE id = p_request_id 
    AND assigned_to = auth.uid()
    AND status IN ('submitted', 'under_review')
  ) THEN
    RAISE EXCEPTION 'طلب الموافقة غير موجود أو غير مخصص لك أو ليس في حالة تسمح بالموافقة';
  END IF;
  
  -- التحقق من أن التوقيع صالح وينتمي للمستخدم
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

-- تحسين دالة get_letter_details_for_approval مع تعيين الجداول بشكل صريح
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

  -- إرجاع تفاصيل الخطاب مع التحديد الصريح لأسماء الجداول
  RETURN QUERY
  SELECT 
    l.id,
    l.number,
    l.year,
    l.content->>'subject',
    l.content,
    l.template_id,
    lt.name,
    lt.image_url
  FROM letters l
  LEFT JOIN letter_templates lt ON l.template_id = lt.id
  WHERE l.id = p_letter_id;
END;
$$;

-- إضافة دالة للحصول على المعتمدين المتاحين
CREATE OR REPLACE FUNCTION get_approver_by_letter_id(p_letter_id uuid)
RETURNS TABLE (
  approver_id uuid,
  approver_name text,
  approver_email text,
  approver_role text,
  request_id uuid,
  request_status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id as approver_id,
    u.full_name as approver_name,
    u.email as approver_email,
    u.role as approver_role,
    ar.id as request_id,
    ar.status::text as request_status,
    ar.created_at
  FROM approval_requests ar
  JOIN users u ON ar.assigned_to = u.id
  WHERE 
    ar.letter_id = p_letter_id AND
    (
      ar.requested_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid() AND role = 'admin'
      )
    );
END;
$$;

-- تحسين سياسات الوصول للخطابات
CREATE POLICY "approvers_can_view_letters_in_approval"
ON letters
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM approval_requests
    WHERE 
      approval_requests.letter_id = letters.id AND
      approval_requests.assigned_to = auth.uid()
  )
);