/*
  # إصلاح مشكلة الموافقة على الخطابات

  1. التغييرات
    - تحديث دالة approve_letter_with_signature مع تحسين معالجة الأخطاء
    - إضافة رسائل خطأ تفصيلية للمساعدة في تشخيص المشكلة
    - تأكيد وجود بيانات الطلب قبل محاولة الموافقة
    - تصحيح استعلامات قاعدة البيانات لتجنب الغموض

  2. الأمان
    - تحسين التحقق من الصلاحيات
    - ضمان الوصول الصحيح للبيانات
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
BEGIN
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
    RAISE EXCEPTION 'طلب الموافقة غير مخصص لك أو ليس في حالة تسمح بالموافقة (معرف: %)', p_request_id;
  END IF;
  
  -- التحقق من أن التوقيع صالح وينتمي للمستخدم الحالي
  SELECT count(*) INTO v_record_count 
  FROM signatures 
  WHERE signatures.id = p_signature_id 
    AND signatures.user_id = auth.uid();
  
  IF v_record_count = 0 THEN
    RAISE EXCEPTION 'التوقيع غير صالح أو لا ينتمي لك (معرف: %)', p_signature_id;
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
END;
$$;

-- تحسين وظيفة استرجاع الخطاب بناءً على طلب الموافقة
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
  v_count integer;
  v_error text;
BEGIN
  -- التحقق من وجود طلب الموافقة
  SELECT count(*) INTO v_count FROM approval_requests WHERE approval_requests.id = p_request_id;
  
  IF v_count = 0 THEN
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
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'ليس لديك صلاحية الوصول إلى هذا الطلب أو أنه غير موجود';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error = MESSAGE_TEXT;
    RAISE EXCEPTION 'خطأ في استرجاع بيانات الخطاب: %', v_error;
END;
$$;

-- أيضاً نحسن دالة استرجاع تفاصيل الخطاب للموافقة
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
  v_count integer;
  v_error text;
BEGIN
  -- التحقق من وجود الخطاب
  SELECT count(*) INTO v_count FROM letters WHERE letters.id = p_letter_id;
  
  IF v_count = 0 THEN
    RAISE EXCEPTION 'الخطاب غير موجود (معرف: %)', p_letter_id;
  END IF;

  -- التحقق من أن المستخدم له حق الوصول للخطاب
  SELECT count(*) INTO v_count 
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
    
  IF v_count = 0 THEN
    RAISE EXCEPTION 'ليس لديك صلاحية الوصول لهذا الخطاب (معرف: %)', p_letter_id;
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
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'لم يتم العثور على بيانات الخطاب (معرف: %)', p_letter_id;
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error = MESSAGE_TEXT;
    RAISE EXCEPTION 'خطأ في استرجاع تفاصيل الخطاب: %', v_error;
END;
$$;