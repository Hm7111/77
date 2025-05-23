/*
  # إصلاح أخطاء عرض الخطابات وطلبات الموافقة

  1. التغييرات
    - إصلاح خطأ "column reference 'id' is ambiguous" في دالة get_letter_details_for_approval
    - تحديث الدوال الخاصة بالوصول للخطابات من طلبات الموافقة
    - تحسين سياسات الوصول للخطابات للمعتمدين
    
  2. الأمان
    - ضمان أن المعتمدين يمكنهم الوصول للخطابات المطلوب الموافقة عليها
    - إضافة ضوابط أمنية مشددة للتحقق من صلاحيات الوصول
*/

-- إصلاح دالة get_letter_details_for_approval لتحديد الجداول بشكل واضح
DROP FUNCTION IF EXISTS get_letter_details_for_approval(uuid);

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

-- إصلاح دالة get_letter_by_request_id لتجنب التباس الأعمدة
DROP FUNCTION IF EXISTS get_letter_by_request_id(uuid);

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

-- إضافة دالة لتحميل تفاصيل الخطاب كاملة من طلب الموافقة
CREATE OR REPLACE FUNCTION get_letter_with_approval_details(p_request_id uuid)
RETURNS TABLE (
  letter_id uuid,
  user_id uuid,
  template_id uuid,
  content jsonb,
  status text,
  number integer,
  year integer,
  created_at timestamptz,
  template_name text,
  template_image_url text,
  approval_id uuid,
  approval_status text,
  requester_name text,
  approver_name text,
  comments text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id as letter_id,
    l.user_id,
    l.template_id,
    l.content,
    l.status,
    l.number,
    l.year,
    l.created_at,
    lt.name as template_name,
    lt.image_url as template_image_url,
    ar.id as approval_id,
    ar.status::text as approval_status,
    requester.full_name as requester_name,
    approver.full_name as approver_name,
    ar.comments
  FROM approval_requests ar
  JOIN letters l ON ar.letter_id = l.id
  LEFT JOIN letter_templates lt ON l.template_id = lt.id
  LEFT JOIN users requester ON ar.requested_by = requester.id
  LEFT JOIN users approver ON ar.assigned_to = approver.id
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

-- تحديث سياسة عرض الخطابات للمعتمدين
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

-- إضافة دالة لإعادة استلام طلب الموافقة
CREATE OR REPLACE FUNCTION take_approval_request(p_request_id uuid)
RETURNS boolean
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
    AND status = 'submitted'
  ) THEN
    RAISE EXCEPTION 'طلب الموافقة غير موجود أو غير مخصص لك أو ليس في حالة تسمح بالاستلام';
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
    status = 'under_review',
    updated_at = now()
  WHERE id = p_request_id;
  
  -- تحديث الخطاب
  UPDATE letters
  SET 
    workflow_status = 'under_review',
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
    'review',
    'under_review',
    v_previous_status,
    'تم استلام طلب الموافقة للمراجعة'
  );
  
  RETURN true;
END;
$$;