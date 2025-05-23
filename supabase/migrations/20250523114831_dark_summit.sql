/*
  # إصلاح مشكلة الموافقة على الخطابات

  1. التغييرات
    - تبسيط دالة approve_letter_with_signature
    - إزالة الفحوصات المعقدة التي تسبب الأخطاء
    - تحسين رسائل الخطأ
    
  2. الأمان
    - الحفاظ على التحقق من الصلاحيات الأساسية
    - ضمان أن المستخدم المعتمد فقط يمكنه الموافقة
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
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'خطأ في عملية الموافقة: %', SQLERRM;
END;
$$;

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