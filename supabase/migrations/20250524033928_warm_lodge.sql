/*
  # إصلاح وظائف الموافقة على الخطابات

  1. Changes
    - تحسين وظيفة الموافقة على الخطابات للتحقق من صحة معرف الطلب
    - إضافة سجلات تفصيلية للتصحيح والتتبع
    - تحسين التعامل مع الأخطاء في وظائف الموافقة والرفض
*/

-- تحسين وظيفة الموافقة على الخطابات
CREATE OR REPLACE FUNCTION approve_letter_with_signature(
  p_request_id UUID,
  p_signature_id UUID,
  p_comments TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_letter_id UUID;
  v_user_id UUID;
  v_request_exists BOOLEAN;
  v_request_status TEXT;
BEGIN
  -- التحقق من وجود الطلب
  SELECT EXISTS (
    SELECT 1 FROM approval_requests WHERE id = p_request_id
  ) INTO v_request_exists;
  
  IF NOT v_request_exists THEN
    RAISE EXCEPTION 'طلب الموافقة غير موجود';
  END IF;
  
  -- التحقق من حالة الطلب
  SELECT status INTO v_request_status FROM approval_requests WHERE id = p_request_id;
  
  IF v_request_status != 'submitted' AND v_request_status != 'under_review' THEN
    RAISE EXCEPTION 'لا يمكن الموافقة على طلب بحالة %', v_request_status;
  END IF;
  
  -- الحصول على معرف المستخدم الحالي
  SELECT auth.uid() INTO v_user_id;
  
  -- الحصول على معرف الخطاب
  SELECT letter_id INTO v_letter_id FROM approval_requests WHERE id = p_request_id;
  
  -- تسجيل معلومات التصحيح
  INSERT INTO audit_logs (
    action_type, 
    target_type, 
    target_id, 
    summary, 
    details, 
    performed_by
  ) VALUES (
    'update',
    'letter',
    v_letter_id,
    'تصحيح موافقة على خطاب',
    jsonb_build_object(
      'request_id', p_request_id,
      'signature_id', p_signature_id,
      'comments', p_comments,
      'user_id', v_user_id
    ),
    v_user_id
  );
  
  -- تحديث حالة الطلب إلى "موافق عليه"
  UPDATE approval_requests
  SET 
    status = 'approved',
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id;
  
  -- إضافة سجل الموافقة
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
    v_user_id,
    'approve',
    'approved',
    v_request_status,
    p_comments
  );
  
  -- تحديث حالة سير العمل للخطاب
  UPDATE letters
  SET 
    workflow_status = 'approved',
    signature_id = p_signature_id,
    updated_at = NOW()
  WHERE id = v_letter_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- تسجيل الخطأ
    INSERT INTO audit_logs (
      action_type, 
      target_type, 
      summary, 
      details, 
      performed_by
    ) VALUES (
      'update',
      'letter',
      'خطأ في الموافقة على خطاب',
      jsonb_build_object(
        'error', SQLERRM,
        'request_id', p_request_id,
        'signature_id', p_signature_id
      ),
      v_user_id
    );
    
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تحسين وظيفة رفض الخطاب
CREATE OR REPLACE FUNCTION reject_letter(
  p_request_id UUID,
  p_reason TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_letter_id UUID;
  v_user_id UUID;
  v_request_exists BOOLEAN;
  v_request_status TEXT;
BEGIN
  -- التحقق من وجود الطلب
  SELECT EXISTS (
    SELECT 1 FROM approval_requests WHERE id = p_request_id
  ) INTO v_request_exists;
  
  IF NOT v_request_exists THEN
    RAISE EXCEPTION 'طلب الموافقة غير موجود';
  END IF;
  
  -- التحقق من حالة الطلب
  SELECT status INTO v_request_status FROM approval_requests WHERE id = p_request_id;
  
  IF v_request_status != 'submitted' AND v_request_status != 'under_review' THEN
    RAISE EXCEPTION 'لا يمكن رفض طلب بحالة %', v_request_status;
  END IF;
  
  -- الحصول على معرف المستخدم الحالي
  SELECT auth.uid() INTO v_user_id;
  
  -- الحصول على معرف الخطاب
  SELECT letter_id INTO v_letter_id FROM approval_requests WHERE id = p_request_id;
  
  -- تسجيل معلومات التصحيح
  INSERT INTO audit_logs (
    action_type, 
    target_type, 
    target_id, 
    summary, 
    details, 
    performed_by
  ) VALUES (
    'update',
    'letter',
    v_letter_id,
    'تصحيح رفض خطاب',
    jsonb_build_object(
      'request_id', p_request_id,
      'reason', p_reason,
      'user_id', v_user_id
    ),
    v_user_id
  );
  
  -- تحديث حالة الطلب إلى "مرفوض"
  UPDATE approval_requests
  SET 
    status = 'rejected',
    rejected_at = NOW(),
    rejection_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_request_id;
  
  -- إضافة سجل الرفض
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
    v_user_id,
    'reject',
    'rejected',
    v_request_status,
    p_reason
  );
  
  -- تحديث حالة سير العمل للخطاب
  UPDATE letters
  SET 
    workflow_status = 'rejected',
    updated_at = NOW()
  WHERE id = v_letter_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- تسجيل الخطأ
    INSERT INTO audit_logs (
      action_type, 
      target_type, 
      summary, 
      details, 
      performed_by
    ) VALUES (
      'update',
      'letter',
      'خطأ في رفض خطاب',
      jsonb_build_object(
        'error', SQLERRM,
        'request_id', p_request_id
      ),
      v_user_id
    );
    
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- وظيفة مساعدة للتحقق من صحة طلب الموافقة
CREATE OR REPLACE FUNCTION validate_approval_request(
  p_request_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_request_exists BOOLEAN;
  v_is_assigned BOOLEAN;
BEGIN
  -- التحقق من وجود الطلب
  SELECT EXISTS (
    SELECT 1 FROM approval_requests WHERE id = p_request_id
  ) INTO v_request_exists;
  
  IF NOT v_request_exists THEN
    RETURN FALSE;
  END IF;
  
  -- التحقق من أن المستخدم الحالي هو المعين للموافقة
  SELECT EXISTS (
    SELECT 1 
    FROM approval_requests 
    WHERE id = p_request_id AND assigned_to = auth.uid()
  ) INTO v_is_assigned;
  
  RETURN v_is_assigned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;