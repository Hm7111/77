/*
  # إصلاح صلاحيات عرض الخطابات في طلبات الموافقة

  1. التغييرات
    - تحديث سياسات الوصول لجدول الخطابات للسماح للمستخدمين بعرض الخطابات التي تم تعيينهم كمعتمدين لها
    - إضافة دالة helper للتحقق ما إذا كان المستخدم معتمداً للخطاب
    - تحسين سياسات الأمان لضمان رؤية المستخدمين للخطابات المناسبة
    
  2. المشكلة المعالجة
    - المستخدمون لا يستطيعون عرض الخطابات المعينة لهم للموافقة
    - ظهور خطأ 406 عند محاولة عرض الخطاب
*/

-- دالة للتحقق ما إذا كان المستخدم معتمداً للخطاب
CREATE OR REPLACE FUNCTION public.is_letter_approver(letter_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM approval_requests 
    WHERE letter_id = is_letter_approver.letter_id 
    AND assigned_to = auth.uid()
  );
END;
$$;

-- تحديث سياسات الخطابات
DROP POLICY IF EXISTS "users_can_read_own_letters" ON letters;
DROP POLICY IF EXISTS "users_can_read_assigned_letters" ON letters;

-- إضافة سياسة للسماح للمستخدمين بقراءة خطاباتهم
CREATE POLICY "users_can_read_own_letters"
  ON letters
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- إضافة سياسة جديدة للسماح للمستخدمين بقراءة الخطابات المعينة لهم للموافقة
CREATE POLICY "users_can_read_assigned_letters"
  ON letters
  FOR SELECT
  TO authenticated
  USING (is_letter_approver(id));

-- تحديث دالة الحصول على طلبات الموافقة المعلقة لتضمين معلومات الخطاب وحالته
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
  status workflow_state,
  letter_number integer,
  letter_year integer
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
    ar.status,
    l.number as letter_number,
    l.year as letter_year
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

-- دالة للحصول على معلومات الخطاب بمعرف الطلب
CREATE OR REPLACE FUNCTION get_letter_by_request_id(p_request_id uuid)
RETURNS TABLE (
  letter_id uuid,
  letter_number integer,
  letter_year integer,
  letter_subject text,
  requester_name text,
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

  -- التحقق من وجود الطلب وأنه مخصص للمستخدم الحالي
  IF NOT EXISTS (
    SELECT 1 FROM approval_requests 
    WHERE id = p_request_id 
    AND assigned_to = auth.uid()
  ) THEN
    RAISE EXCEPTION 'الطلب غير موجود أو غير مخصص لك';
  END IF;
  
  RETURN QUERY
  SELECT 
    l.id as letter_id,
    l.number as letter_number,
    l.year as letter_year,
    l.content->>'subject' as letter_subject,
    u.full_name as requester_name,
    ar.status
  FROM approval_requests ar
  JOIN letters l ON ar.letter_id = l.id
  JOIN users u ON ar.requested_by = u.id
  WHERE ar.id = p_request_id;
END;
$$;