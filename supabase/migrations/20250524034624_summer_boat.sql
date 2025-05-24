/*
  # إصلاح وظائف الموافقة في قاعدة البيانات

  1. New Functions
    - `get_letter_by_request_id_v2`: وظيفة محسنة للحصول على معرف الخطاب من طلب الموافقة
    - `get_letter_details_for_approval_v2`: وظيفة محسنة للحصول على تفاصيل الخطاب للموافقة
  2. Updated Functions
    - `approve_letter_with_signature`: تحسين وظيفة الموافقة على الخطابات
    - `reject_letter`: تحسين وظيفة رفض الخطابات
  3. Security
    - تم تحسين التعامل مع الأخطاء وتسجيلها
*/

-- وظيفة للحصول على معرف الخطاب من طلب الموافقة (نسخة محسنة)
CREATE OR REPLACE FUNCTION get_letter_by_request_id_v2(
  p_request_id UUID
) RETURNS TABLE (
  letter_id UUID,
  user_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ar.letter_id,
    ar.requested_by AS user_id
  FROM 
    approval_requests ar
  WHERE 
    ar.id = p_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- وظيفة للحصول على تفاصيل الخطاب للموافقة (نسخة محسنة)
CREATE OR REPLACE FUNCTION get_letter_details_for_approval_v2(
  p_letter_id UUID
) RETURNS TABLE (
  letter_id UUID,
  template_id UUID,
  template_name TEXT,
  template_image_url TEXT,
  content JSONB,
  number INTEGER,
  year INTEGER,
  verification_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id AS letter_id,
    l.template_id,
    lt.name AS template_name,
    lt.image_url AS template_image_url,
    l.content,
    l.number,
    l.year,
    l.verification_url
  FROM 
    letters l
  JOIN 
    letter_templates lt ON l.template_id = lt.id
  WHERE 
    l.id = p_letter_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  v_debug_info JSONB;
BEGIN
  -- تسجيل معلومات التصحيح
  v_debug_info := jsonb_build_object(
    'function', 'approve_letter_with_signature',
    'request_id', p_request_id,
    'signature_id', p_signature_id,
    'comments', p_comments
  );
  
  -- الحصول على معرف المستخدم الحالي
  SELECT auth.uid() INTO v_user_id;
  v_debug_info := v_debug_info || jsonb_build_object('user_id', v_user_id);
  
  -- التحقق من وجود الطلب
  SELECT EXISTS (
    SELECT 1 FROM approval_requests WHERE id = p_request_id
  ) INTO v_request_exists;
  
  v_debug_info := v_debug_info || jsonb_build_object('request_exists', v_request_exists);
  
  IF NOT v_request_exists THEN
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
      'خطأ في الموافقة: طلب غير موجود',
      v_debug_info,
      v_user_id
    );
    
    RAISE EXCEPTION 'طلب الموافقة غير موجود';
  END IF;
  
  -- التحقق من حالة الطلب
  SELECT status INTO v_request_status FROM approval_requests WHERE id = p_request_id;
  v_debug_info := v_debug_info || jsonb_build_object('request_status', v_request_status);
  
  IF v_request_status != 'submitted' AND v_request_status != 'under_review' THEN
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
      'خطأ في الموافقة: حالة غير صالحة',
      v_debug_info || jsonb_build_object('error', 'حالة غير صالحة: ' || v_request_status),
      v_user_id
    );
    
    RAISE EXCEPTION 'لا يمكن الموافقة على طلب بحالة %', v_request_status;
  END IF;
  
  -- الحصول على معرف الخطاب
  SELECT letter_id INTO v_letter_id FROM approval_requests WHERE id = p_request_id;
  v_debug_info := v_debug_info || jsonb_build_object('letter_id', v_letter_id);
  
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
    approval_id = p_request_id,
    updated_at = NOW()
  WHERE id = v_letter_id;
  
  -- تسجيل نجاح العملية
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
    'تمت الموافقة على الخطاب',
    v_debug_info || jsonb_build_object('success', true),
    v_user_id
  );
  
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
      v_debug_info || jsonb_build_object(
        'error', SQLERRM,
        'error_detail', SQLSTATE
      ),
      COALESCE(v_user_id, auth.uid())
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
  v_debug_info JSONB;
BEGIN
  -- تسجيل معلومات التصحيح
  v_debug_info := jsonb_build_object(
    'function', 'reject_letter',
    'request_id', p_request_id,
    'reason', p_reason
  );
  
  -- الحصول على معرف المستخدم الحالي
  SELECT auth.uid() INTO v_user_id;
  v_debug_info := v_debug_info || jsonb_build_object('user_id', v_user_id);
  
  -- التحقق من وجود الطلب
  SELECT EXISTS (
    SELECT 1 FROM approval_requests WHERE id = p_request_id
  ) INTO v_request_exists;
  
  v_debug_info := v_debug_info || jsonb_build_object('request_exists', v_request_exists);
  
  IF NOT v_request_exists THEN
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
      'خطأ في الرفض: طلب غير موجود',
      v_debug_info,
      v_user_id
    );
    
    RAISE EXCEPTION 'طلب الموافقة غير موجود';
  END IF;
  
  -- التحقق من حالة الطلب
  SELECT status INTO v_request_status FROM approval_requests WHERE id = p_request_id;
  v_debug_info := v_debug_info || jsonb_build_object('request_status', v_request_status);
  
  IF v_request_status != 'submitted' AND v_request_status != 'under_review' THEN
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
      'خطأ في الرفض: حالة غير صالحة',
      v_debug_info || jsonb_build_object('error', 'حالة غير صالحة: ' || v_request_status),
      v_user_id
    );
    
    RAISE EXCEPTION 'لا يمكن رفض طلب بحالة %', v_request_status;
  END IF;
  
  -- الحصول على معرف الخطاب
  SELECT letter_id INTO v_letter_id FROM approval_requests WHERE id = p_request_id;
  v_debug_info := v_debug_info || jsonb_build_object('letter_id', v_letter_id);
  
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
    approval_id = p_request_id,
    updated_at = NOW()
  WHERE id = v_letter_id;
  
  -- تسجيل نجاح العملية
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
    'تم رفض الخطاب',
    v_debug_info || jsonb_build_object('success', true),
    v_user_id
  );
  
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
      v_debug_info || jsonb_build_object(
        'error', SQLERRM,
        'error_detail', SQLSTATE
      ),
      COALESCE(v_user_id, auth.uid())
    );
    
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;