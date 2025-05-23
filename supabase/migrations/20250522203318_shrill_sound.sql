/*
  # تصحيح دالة الموافقة على الخطابات

  1. التغييرات
    - تحسين دالة approve_letter_with_signature للتعامل مع الأخطاء بشكل أفضل
    - إضافة تفاصيل لرسائل الخطأ لتسهيل تصحيح المشكلات
    - تحسين التحقق من صلاحيات الوصول

  2. الأمان
    - التحقق من وجود طلب الموافقة
    - التحقق من ملكية التوقيع
    - ضمان أن المستخدم له الصلاحية المناسبة
*/

-- حذف الدالة الحالية وإعادة إنشائها بشكل محسن
DROP FUNCTION IF EXISTS approve_letter_with_signature(uuid, uuid, text);

-- إنشاء دالة محسنة للموافقة على الخطاب مع التوقيع
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
  v_record_count int;
  v_error text;
  v_debug_info jsonb;
BEGIN
  -- إضافة معلومات تصحيح الأخطاء
  v_debug_info := jsonb_build_object(
    'function', 'approve_letter_with_signature',
    'request_id', p_request_id,
    'signature_id', p_signature_id,
    'user_id', auth.uid(),
    'timestamp', now()
  );

  -- التحقق من صحة المعرفات
  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'معرف طلب الموافقة لا يمكن أن يكون فارغاً';
  END IF;

  IF p_signature_id IS NULL THEN
    RAISE EXCEPTION 'معرف التوقيع لا يمكن أن يكون فارغاً';
  END IF;

  -- التحقق من وجود طلب الموافقة
  SELECT count(*) INTO v_record_count 
  FROM approval_requests 
  WHERE approval_requests.id = p_request_id;
  
  IF v_record_count = 0 THEN
    RAISE EXCEPTION 'طلب الموافقة غير موجود (معرف: %)', p_request_id;
  END IF;

  -- التحقق من أن طلب الموافقة مخصص للمستخدم الحالي
  SELECT count(*) INTO v_record_count 
  FROM approval_requests 
  WHERE approval_requests.id = p_request_id 
    AND approval_requests.assigned_to = auth.uid()
    AND approval_requests.status IN ('submitted', 'under_review');
  
  IF v_record_count = 0 THEN
    -- إضافة المزيد من التفاصيل حول الخطأ
    v_debug_info := v_debug_info || jsonb_build_object(
      'error_check', 'assigned_to_and_status',
      'details', (
        SELECT jsonb_build_object(
          'found', true,
          'assigned_to', assigned_to,
          'current_user', auth.uid(),
          'status', status
        )
        FROM approval_requests
        WHERE id = p_request_id
      )
    );
    
    RAISE EXCEPTION 'طلب الموافقة إما غير مخصص لك أو ليس في حالة تسمح بالموافقة. معلومات: %', v_debug_info;
  END IF;

  -- التحقق من أن التوقيع ينتمي للمستخدم الحالي
  SELECT count(*) INTO v_record_count 
  FROM signatures 
  WHERE signatures.id = p_signature_id 
    AND signatures.user_id = auth.uid();
  
  IF v_record_count = 0 THEN
    v_debug_info := v_debug_info || jsonb_build_object(
      'error_check', 'signature_ownership',
      'details', (
        SELECT jsonb_build_object(
          'found', (SELECT COUNT(*) FROM signatures WHERE id = p_signature_id),
          'belongs_to_user', (
            SELECT COUNT(*) FROM signatures 
            WHERE id = p_signature_id AND user_id = auth.uid()
          )
        )
      )
    );
    
    RAISE EXCEPTION 'التوقيع غير صالح أو لا ينتمي إليك. معلومات: %', v_debug_info;
  END IF;

  -- الحصول على معرف الخطاب والحالة السابقة
  BEGIN
    SELECT 
      ar.letter_id, 
      ar.status 
    INTO STRICT
      v_letter_id, 
      v_previous_status
    FROM approval_requests ar
    WHERE ar.id = p_request_id;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RAISE EXCEPTION 'لم يتم العثور على بيانات طلب الموافقة';
    WHEN TOO_MANY_ROWS THEN
      RAISE EXCEPTION 'تم العثور على أكثر من طلب موافقة بنفس المعرف';
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_error = MESSAGE_TEXT;
      RAISE EXCEPTION 'خطأ غير متوقع: %', v_error;
  END;
  
  -- تحديث طلب الموافقة
  UPDATE approval_requests
  SET 
    status = 'approved',
    comments = COALESCE(p_comments, comments),
    updated_at = now(),
    approved_at = now()
  WHERE approval_requests.id = p_request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'فشل تحديث طلب الموافقة، لم يتم العثور على السجل';
  END IF;
  
  -- تحديث الخطاب
  UPDATE letters
  SET 
    workflow_status = 'approved',
    updated_at = now(),
    signature_id = p_signature_id
  WHERE letters.id = v_letter_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'فشل تحديث الخطاب، لم يتم العثور على الخطاب بالمعرف %', v_letter_id;
  END IF;
  
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
    -- إضافة معلومات الاستثناء إلى معلومات التصحيح
    v_debug_info := v_debug_info || jsonb_build_object(
      'exception', SQLERRM,
      'sqlstate', SQLSTATE
    );
    RAISE EXCEPTION 'خطأ في عملية الموافقة: % | %', SQLERRM, v_debug_info;
END;
$$;

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
DECLARE
  v_record_count integer;
  v_error text;
BEGIN
  -- التحقق من وجود طلب الموافقة
  SELECT count(*) INTO v_record_count FROM approval_requests WHERE approval_requests.id = p_request_id;
  
  IF v_record_count = 0 THEN
    RAISE EXCEPTION 'طلب الموافقة غير موجود (معرف: %)', p_request_id;
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
    
  -- التأكد من وجود نتائج
  GET DIAGNOSTICS v_record_count = ROW_COUNT;
  IF v_record_count = 0 THEN
    RAISE EXCEPTION 'ليس لديك صلاحية الوصول إلى هذا الطلب أو أنه غير موجود';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error = MESSAGE_TEXT;
    RAISE EXCEPTION 'خطأ في استرجاع بيانات الخطاب: %', v_error;
END;
$$;

-- إضافة سياسات جديدة للمعتمدين
DO $$ 
BEGIN
  -- سياسة للسماح للمعتمدين بتحديث الخطابات
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

  -- سياسة للسماح للمعتمدين بإضافة سجلات للموافقة
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'approvers_can_insert_approval_logs' AND tablename = 'approval_logs') THEN
    CREATE POLICY "approvers_can_insert_approval_logs"
    ON approval_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;