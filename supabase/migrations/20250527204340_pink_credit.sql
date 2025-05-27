/*
  # نظام الإشعارات الموحد
  
  1. New Tables
    - `notifications` - جدول لتخزين إشعارات المستخدمين
  
  2. Security
    - تمكين RLS على جدول الإشعارات
    - إضافة سياسات للقراءة والتحديث
  
  3. Functions
    - إضافة دالة لتعيين الإشعار كمقروء
    - إضافة دالة لإنشاء إشعار جديد
*/

-- إنشاء جدول الإشعارات
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('task_assigned', 'task_completed', 'task_overdue', 'task_updated', 'task_comment', 'system')),
  entity_type text NOT NULL CHECK (entity_type IN ('task', 'letter', 'approval', 'system')),
  entity_id uuid NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);

-- تمكين RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان
CREATE POLICY "Users can read their own notifications" 
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = uid());

CREATE POLICY "Users can update their own notifications" 
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = uid())
  WITH CHECK (user_id = uid());

CREATE POLICY "System can create notifications" 
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- دالة لتعيين إشعار كمقروء
CREATE OR REPLACE FUNCTION mark_notification_as_read(p_notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- الحصول على معرف المستخدم الحالي
  v_user_id := auth.uid();
  
  -- التحقق من وجود المستخدم
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول لتعيين الإشعار كمقروء';
  END IF;
  
  -- تحديث حالة الإشعار
  UPDATE notifications
  SET is_read = true
  WHERE id = p_notification_id
  AND user_id = v_user_id;
  
  RETURN FOUND;
END;
$$;

-- دالة لإنشاء إشعار جديد
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text,
  p_entity_type text,
  p_entity_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  -- التحقق من صحة البيانات
  IF p_user_id IS NULL OR p_title IS NULL OR p_message IS NULL OR p_type IS NULL OR p_entity_type IS NULL OR p_entity_id IS NULL THEN
    RAISE EXCEPTION 'جميع الحقول مطلوبة';
  END IF;
  
  -- إدراج الإشعار الجديد
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    entity_type,
    entity_id,
    is_read,
    created_at
  ) VALUES (
    p_user_id,
    p_title,
    p_message,
    p_type,
    p_entity_type,
    p_entity_id,
    false,
    now()
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- إنشاء مشغل لإنشاء إشعار عند تعيين مهمة جديدة
CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- إنشاء إشعار للمستخدم المعين له المهمة
  IF NEW.assigned_to IS NOT NULL THEN
    PERFORM create_notification(
      NEW.assigned_to,
      'تم تعيين مهمة جديدة لك',
      'تم تعيين مهمة "' || NEW.title || '" لك',
      'task_assigned',
      'task',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- إنشاء مشغل لإنشاء إشعار عند تغيير حالة المهمة
CREATE OR REPLACE FUNCTION notify_task_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- إذا تم تغيير حالة المهمة أو المستخدم المعين له
  IF (OLD.status IS DISTINCT FROM NEW.status) OR (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    -- إشعار لمنشئ المهمة إذا تم إكمالها
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
      PERFORM create_notification(
        NEW.created_by,
        'تم إكمال المهمة',
        'تم إكمال المهمة "' || NEW.title || '"',
        'task_completed',
        'task',
        NEW.id
      );
    END IF;
    
    -- إشعار للمستخدم الجديد المعين له المهمة
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
      PERFORM create_notification(
        NEW.assigned_to,
        'تم تعيين مهمة لك',
        'تم تعيين المهمة "' || NEW.title || '" لك',
        'task_assigned',
        'task',
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- إضافة المشغلات إلى جدول المهام
DROP TRIGGER IF EXISTS tr_notify_task_assigned ON tasks;
CREATE TRIGGER tr_notify_task_assigned
  AFTER INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_assigned();

DROP TRIGGER IF EXISTS tr_notify_task_status_change ON tasks;
CREATE TRIGGER tr_notify_task_status_change
  AFTER UPDATE OF status, assigned_to ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_status_change();

-- إنشاء مشغل لإنشاء إشعار عند إنشاء طلب موافقة جديد
CREATE OR REPLACE FUNCTION notify_approval_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_letter_subject text;
  v_requester_name text;
BEGIN
  -- الحصول على عنوان الخطاب واسم الطالب
  SELECT content->>'subject', u.full_name
  INTO v_letter_subject, v_requester_name
  FROM letters l
  JOIN users u ON l.user_id = u.id
  WHERE l.id = NEW.letter_id;
  
  -- إنشاء إشعار للمستخدم المعين له طلب الموافقة
  IF NEW.assigned_to IS NOT NULL THEN
    PERFORM create_notification(
      NEW.assigned_to,
      'طلب موافقة جديد',
      'طلب موافقة على خطاب "' || COALESCE(v_letter_subject, 'بدون عنوان') || '" من ' || COALESCE(v_requester_name, 'مستخدم'),
      'system',
      'approval',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- إضافة المشغل إلى جدول طلبات الموافقة
DROP TRIGGER IF EXISTS tr_notify_approval_request ON approval_requests;
CREATE TRIGGER tr_notify_approval_request
  AFTER INSERT ON approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_approval_request();

-- إنشاء مشغل لإنشاء إشعار عند تغيير حالة طلب الموافقة
CREATE OR REPLACE FUNCTION notify_approval_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_letter_subject text;
  v_approver_name text;
BEGIN
  -- إذا تم تغيير حالة طلب الموافقة
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- الحصول على عنوان الخطاب واسم المعتمد
    SELECT content->>'subject', u.full_name
    INTO v_letter_subject, v_approver_name
    FROM letters l
    JOIN users u ON u.id = NEW.assigned_to
    WHERE l.id = NEW.letter_id;
    
    -- إشعار لطالب الموافقة
    IF NEW.status = 'approved' THEN
      PERFORM create_notification(
        NEW.requested_by,
        'تمت الموافقة على الخطاب',
        'تمت الموافقة على خطاب "' || COALESCE(v_letter_subject, 'بدون عنوان') || '" من قبل ' || COALESCE(v_approver_name, 'المعتمد'),
        'system',
        'letter',
        NEW.letter_id
      );
    ELSIF NEW.status = 'rejected' THEN
      PERFORM create_notification(
        NEW.requested_by,
        'تم رفض الخطاب',
        'تم رفض خطاب "' || COALESCE(v_letter_subject, 'بدون عنوان') || '" من قبل ' || COALESCE(v_approver_name, 'المعتمد'),
        'system',
        'letter',
        NEW.letter_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- إضافة المشغل إلى جدول طلبات الموافقة
DROP TRIGGER IF EXISTS tr_notify_approval_status_change ON approval_requests;
CREATE TRIGGER tr_notify_approval_status_change
  AFTER UPDATE OF status ON approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_approval_status_change();