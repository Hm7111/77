-- حذف جميع الدوال المتأثرة أولاً
DROP FUNCTION IF EXISTS approve_letter_with_signature(uuid, uuid, text);
DROP FUNCTION IF EXISTS get_letter_by_request_id(uuid);
DROP FUNCTION IF EXISTS get_letter_details_for_approval(uuid);
DROP FUNCTION IF EXISTS reject_letter(uuid, text); -- إضافة هذا السطر لحل الخطأ

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
  v_debug_info jsonb;
BEGIN
  -- إضافة معلومات تصحيح الأخطاء
  v_debug_info := jsonb_build_object(
    'function', 'get_letter_by_request_id',
    'p_request_id', p_request_id,
    'auth_uid', auth.uid(),
    'timestamp', now()
  );

  -- التحقق من وجود طلب الموافقة
  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'معرف طلب الموافقة مطلوب';
  END IF;

  -- التحقق من وجود طلب الموافقة في قاعدة البيانات
  SELECT count(*) INTO v_record_count 
  FROM approval_requests 
  WHERE approval_requests.id = p_request_id;
  
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
    v_debug_info := v_debug_info || jsonb_build_object(
      'error_check', 'permission_check',
      'details', (
        SELECT jsonb_build_object(
          'approval_found', (SELECT COUNT(*) FROM approval_requests WHERE id = p_request_id),
          'letter_found', (
            SELECT COUNT(*) FROM approval_requests ar
            JOIN letters l ON ar.letter_id = l.id
            WHERE ar.id = p_request_id
          ),
          'user_is_approver', (
            SELECT COUNT(*) FROM approval_requests
            WHERE id = p_request_id AND assigned_to = auth.uid()
          ),
          'user_is_requester', (
            SELECT COUNT(*) FROM approval_requests
            WHERE id = p_request_id AND requested_by = auth.uid()
          )
        )
      )
    );
    
    RAISE EXCEPTION 'ليس لديك صلاحية الوصول إلى هذا الطلب أو أنه غير موجود. معلومات: %', v_debug_info;
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    -- إضافة معلومات الاستثناء إلى معلومات التصحيح
    v_debug_info := v_debug_info || jsonb_build_object(
      'exception', SQLERRM,
      'sqlstate', SQLSTATE
    );
    
    RAISE EXCEPTION 'خطأ في استرجاع بيانات الخطاب: % | %', SQLERRM, v_debug_info;
END;
$$;

-- تحسين دالة الحصول على تفاصيل الخطاب
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
DECLARE
  v_record_count integer;
  v_error text;
  v_debug_info jsonb;
BEGIN
  -- إضافة معلومات تصحيح الأخطاء
  v_debug_info := jsonb_build_object(
    'function', 'get_letter_details_for_approval',
    'p_letter_id', p_letter_id,
    'auth_uid', auth.uid(),
    'timestamp', now()
  );

  -- التحقق من وجود الخطاب
  IF p_letter_id IS NULL THEN
    RAISE EXCEPTION 'معرف الخطاب مطلوب';
  END IF;

  -- التحقق من وجود الخطاب في قاعدة البيانات
  SELECT count(*) INTO v_record_count 
  FROM letters 
  WHERE letters.id = p_letter_id;
  
  IF v_record_count = 0 THEN
    RAISE EXCEPTION 'الخطاب غير موجود (معرف: %)', p_letter_id;
  END IF;

  -- التحقق من أن المستخدم له حق الوصول للخطاب
  SELECT count(*) INTO v_record_count 
  FROM letters l
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
    );
    
  IF v_record_count = 0 THEN
    v_debug_info := v_debug_info || jsonb_build_object(
      'error_check', 'permission_check',
      'details', (
        SELECT jsonb_build_object(
          'letter_found', (SELECT COUNT(*) FROM letters WHERE id = p_letter_id),
          'user_is_creator', (
            SELECT COUNT(*) FROM letters
            WHERE id = p_letter_id AND user_id = auth.uid()
          ),
          'user_is_approver', (
            SELECT COUNT(*) FROM approval_requests
            WHERE letter_id = p_letter_id AND assigned_to = auth.uid()
          ),
          'user_is_requester', (
            SELECT COUNT(*) FROM approval_requests
            WHERE letter_id = p_letter_id AND requested_by = auth.uid()
          )
        )
      )
    );
    
    RAISE EXCEPTION 'ليس لديك صلاحية الوصول لهذا الخطاب. معلومات: %', v_debug_info;
  END IF;

  -- إرجاع تفاصيل الخطاب مع التحديد الصريح لأسماء الجداول
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
  
  -- التأكد من وجود نتائج
  GET DIAGNOSTICS v_record_count = ROW_COUNT;
  IF v_record_count = 0 THEN
    RAISE EXCEPTION 'لم يتم العثور على بيانات الخطاب';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    -- إضافة معلومات الاستثناء إلى معلومات التصحيح
    v_debug_info := v_debug_info || jsonb_build_object(
      'exception', SQLERRM,
      'sqlstate', SQLSTATE,
      'letter_id', p_letter_id
    );
    
    RAISE EXCEPTION 'خطأ في استرجاع تفاصيل الخطاب: % | %', SQLERRM, v_debug_info;
END;
$$;

-- تحديث دالة رفض الخطاب للتوافق مع التحسينات
CREATE OR REPLACE FUNCTION reject_letter(
  p_request_id uuid,
  p_reason text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_letter_id uuid;
  v_previous_status workflow_state;
  v_record_count integer;
  v_debug_info jsonb;
BEGIN
  -- إضافة معلومات تصحيح الأخطاء
  v_debug_info := jsonb_build_object(
    'function', 'reject_letter',
    'request_id', p_request_id,
    'user_id', auth.uid(),
    'timestamp', now()
  );

  -- التحقق من صحة المعرفات
  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'معرف طلب الموافقة مطلوب';
  END IF;

  IF p_reason IS NULL OR p_reason = '' THEN
    RAISE EXCEPTION 'سبب الرفض مطلوب';
  END IF;

  -- التحقق من وجود طلب الموافقة
  SELECT count(*) INTO v_record_count 
  FROM approval_requests 
  WHERE approval_requests.id = p_request_id;
  
  IF v_record_count = 0 THEN
    RAISE EXCEPTION 'طلب الموافقة غير موجود';
  END IF;

  -- التحقق من أن طلب الموافقة مخصص للمستخدم الحالي
  SELECT count(*) INTO v_record_count 
  FROM approval_requests 
  WHERE approval_requests.id = p_request_id 
    AND approval_requests.assigned_to = auth.uid()
    AND approval_requests.status IN ('submitted', 'under_review');
  
  IF v_record_count = 0 THEN
    v_debug_info := v_debug_info || jsonb_build_object(
      'error_check', 'permission_check',
      'details', (
        SELECT jsonb_build_object(
          'approval_found', (SELECT COUNT(*) FROM approval_requests WHERE id = p_request_id),
          'user_is_approver', (
            SELECT COUNT(*) FROM approval_requests
            WHERE id = p_request_id AND assigned_to = auth.uid()
          ),
          'status_allows_rejection', (
            SELECT COUNT(*) FROM approval_requests
            WHERE id = p_request_id 
            AND status IN ('submitted', 'under_review')
          )
        )
      )
    );
    
    RAISE EXCEPTION 'طلب الموافقة إما غير مخصص لك أو ليس في حالة تسمح بالرفض. معلومات: %', v_debug_info;
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
    status = 'rejected',
    rejection_reason = p_reason,
    updated_at = now(),
    rejected_at = now()
  WHERE approval_requests.id = p_request_id;
  
  -- تحديث الخطاب
  UPDATE letters
  SET 
    workflow_status = 'rejected',
    updated_at = now()
  WHERE letters.id = v_letter_id;
  
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
    'reject',
    'rejected',
    v_previous_status,
    p_reason
  );
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    v_debug_info := v_debug_info || jsonb_build_object(
      'exception', SQLERRM,
      'sqlstate', SQLSTATE
    );
    
    RAISE EXCEPTION 'خطأ في رفض الخطاب: % | %', SQLERRM, v_debug_info;
END;
$$;

-- إضافة سياسات للمعتمدين لتحديث الخطابات والطلبات
DO $$ 
BEGIN
  -- سياسة للمعتمدين للوصول إلى الخطابات
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'approvers_can_view_letters_in_approval' AND tablename = 'letters') THEN
    CREATE POLICY "approvers_can_view_letters_in_approval"
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
  END IF;
  
  -- سياسة للمعتمدين لتحديث الخطابات
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
  
  -- سياسة للمعتمدين لتحديث طلبات الموافقة المخصصة لهم
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'approvers_can_update_approval_requests' AND tablename = 'approval_requests') THEN
    CREATE POLICY "approvers_can_update_approval_requests"
    ON approval_requests
    FOR UPDATE
    TO authenticated
    USING (
      assigned_to = auth.uid()
    )
    WITH CHECK (
      assigned_to = auth.uid()
    );
  END IF;
END $$;