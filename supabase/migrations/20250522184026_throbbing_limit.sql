/*
  # Fix Approval System and User Permissions

  1. Changes
    - Fix get_pending_approvals function to return proper data
    - Add function to get available approvers
    - Update RLS policies to ensure proper permissions
    - Drop conflicting policies and recreate them correctly

  2. Security
    - Maintain existing security settings
    - Ensure users can see other users for approval selection
    - Fix permissions for approval workflows
*/

-- حذف الدالة الحالية لتجنب الخطأ المتعلق بتغيير نوع الإرجاع
DROP FUNCTION IF EXISTS get_pending_approvals();

-- إنشاء دالة جديدة للحصول على المستخدمين المتاحين للموافقة
CREATE OR REPLACE FUNCTION get_available_approvers()
RETURNS TABLE (
  id uuid,
  full_name text,
  role text,
  branch_name text,
  branch_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.full_name,
    u.role,
    b.name as branch_name,
    u.branch_id
  FROM users u
  LEFT JOIN branches b ON u.branch_id = b.id
  WHERE 
    u.id != auth.uid() AND  -- استبعاد المستخدم الحالي
    u.is_active = true      -- فقط المستخدمين النشطين
  ORDER BY u.role = 'admin' DESC, u.full_name ASC; -- إظهار المدراء أولاً
END;
$$;

-- إعادة إنشاء دالة get_pending_approvals مع نوع إرجاع محدث
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

-- تحسين دالة إنشاء طلب موافقة
CREATE OR REPLACE FUNCTION create_approval_request(
  p_letter_id uuid,
  p_approver_id uuid,
  p_comments text DEFAULT NULL,
  p_due_date timestamptz DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id uuid;
  v_letter_creator uuid;
  v_existing_request uuid;
BEGIN
  -- التحقق من وجود المستخدم الحالي
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول لإنشاء طلب موافقة';
  END IF;

  -- التحقق من أن الخطاب موجود
  IF NOT EXISTS (SELECT 1 FROM letters WHERE id = p_letter_id) THEN
    RAISE EXCEPTION 'الخطاب غير موجود';
  END IF;
  
  -- التحقق من أن المستخدم هو منشئ الخطاب
  SELECT user_id INTO v_letter_creator FROM letters WHERE id = p_letter_id;
  
  IF v_letter_creator != auth.uid() THEN
    RAISE EXCEPTION 'لا يمكنك إنشاء طلب موافقة لخطاب غير خاص بك';
  END IF;
  
  -- التحقق من أن المستخدم المعتمد موجود ونشط
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_approver_id AND is_active = true) THEN
    RAISE EXCEPTION 'المستخدم المعتمد غير موجود أو غير نشط';
  END IF;
  
  -- التحقق من أن المستخدم لا يطلب موافقة من نفسه
  IF auth.uid() = p_approver_id THEN
    RAISE EXCEPTION 'لا يمكنك طلب موافقة من نفسك';
  END IF;
  
  -- التحقق من عدم وجود طلب موافقة سابق للخطاب
  SELECT id INTO v_existing_request FROM approval_requests 
  WHERE letter_id = p_letter_id AND status NOT IN ('rejected');
  
  IF v_existing_request IS NOT NULL THEN
    RAISE EXCEPTION 'يوجد بالفعل طلب موافقة لهذا الخطاب';
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

-- حذف السياسات الموجودة بحذر (فقط إذا كانت موجودة)
DO $$ 
BEGIN
  -- حذف السياسات القديمة إن وجدت
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_can_view_related_approval_requests' AND tablename = 'approval_requests') THEN
    DROP POLICY "users_can_view_related_approval_requests" ON approval_requests;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_can_create_approval_requests' AND tablename = 'approval_requests') THEN
    DROP POLICY "users_can_create_approval_requests" ON approval_requests;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_can_update_approval_requests' AND tablename = 'approval_requests') THEN
    DROP POLICY "users_can_update_approval_requests" ON approval_requests;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_can_delete_approval_requests' AND tablename = 'approval_requests') THEN
    DROP POLICY "users_can_delete_approval_requests" ON approval_requests;
  END IF;
END $$;

-- إنشاء سياسات جديدة لطلبات الموافقة
CREATE POLICY "users_can_view_related_approval_requests"
ON approval_requests FOR SELECT
TO authenticated
USING (
  requested_by = auth.uid() OR
  assigned_to = auth.uid() OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "users_can_create_approval_requests"
ON approval_requests FOR INSERT
TO authenticated
WITH CHECK (
  requested_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM letters
    WHERE id = letter_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "users_can_update_approval_requests"
ON approval_requests FOR UPDATE
TO authenticated
USING (
  requested_by = auth.uid() OR
  assigned_to = auth.uid() OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "users_can_delete_approval_requests"
ON approval_requests FOR DELETE
TO authenticated
USING (
  requested_by = auth.uid() AND
  status = 'submitted'
);

-- تحسين سياسات الوصول لجدول المستخدمين
DO $$
BEGIN
  -- إضافة سياسة للسماح للمستخدمين برؤية معلومات المستخدمين الأساسية
  -- هذه السياسة مهمة لعرض قائمة المستخدمين في نافذة طلب الموافقة
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_can_read_all_users_basic_info' AND tablename = 'users') THEN
    CREATE POLICY "users_can_read_all_users_basic_info"
    ON users FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

-- تحديث سياسات الجداول الأخرى ذات الصلة
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_logs ENABLE ROW LEVEL SECURITY;