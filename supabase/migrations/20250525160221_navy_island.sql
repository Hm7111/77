/*
  # إضافة نظام الإشعارات

  1. New Tables
    - `notifications` - جدول لتخزين الإشعارات للمستخدمين
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `title` (text)
      - `message` (text)
      - `type` (text)
      - `entity_type` (text)
      - `entity_id` (uuid)
      - `is_read` (boolean)
      - `created_at` (timestamptz)
  2. Security
    - Enable RLS on `notifications` table
    - Add policy for users to read their own notifications
    - Add policy for system to create notifications
  3. Functions
    - `create_task_notification` - دالة لإنشاء إشعار متعلق بمهمة
    - `mark_notification_as_read` - دالة لتحديث حالة الإشعار إلى مقروء
*/

-- إنشاء جدول الإشعارات
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('task_assigned', 'task_completed', 'task_overdue', 'task_updated', 'task_comment', 'system')),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- تمكين RLS على جدول الإشعارات
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- سياسة للمستخدمين لقراءة إشعاراتهم الخاصة
CREATE POLICY "Users can read their own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- سياسة للنظام لإنشاء إشعارات
CREATE POLICY "System can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- سياسة للمستخدمين لتحديث حالة إشعاراتهم الخاصة
CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- إنشاء فهرس للبحث السريع
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_entity ON notifications(entity_type, entity_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- دالة لإنشاء إشعار متعلق بمهمة
CREATE OR REPLACE FUNCTION create_task_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text,
  p_task_id uuid
) RETURNS uuid AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    entity_type,
    entity_id
  ) VALUES (
    p_user_id,
    p_title,
    p_message,
    p_type,
    'task',
    p_task_id
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لتحديث حالة الإشعار إلى مقروء
CREATE OR REPLACE FUNCTION mark_notification_as_read(
  p_notification_id uuid
) RETURNS boolean AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- التحقق من أن المستخدم يملك الإشعار
  SELECT user_id INTO v_user_id
  FROM notifications
  WHERE id = p_notification_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Notification not found';
  END IF;
  
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to update this notification';
  END IF;
  
  -- تحديث حالة الإشعار
  UPDATE notifications
  SET is_read = true
  WHERE id = p_notification_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لإنشاء إشعار عند إنشاء مهمة جديدة
CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER AS $$
BEGIN
  -- إذا تم تعيين المهمة لمستخدم
  IF NEW.assigned_to IS NOT NULL THEN
    PERFORM create_task_notification(
      NEW.assigned_to,
      'تم تعيين مهمة جديدة',
      'تم تعيين مهمة جديدة لك: ' || NEW.title,
      'task_assigned',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لإنشاء إشعار عند تحديث حالة المهمة
CREATE OR REPLACE FUNCTION notify_task_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- إذا تغيرت حالة المهمة إلى مكتملة
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- إشعار لمنشئ المهمة
    PERFORM create_task_notification(
      NEW.created_by,
      'تم إكمال المهمة',
      'تم إكمال المهمة: ' || NEW.title,
      'task_completed',
      NEW.id
    );
  END IF;
  
  -- إذا تم تغيير المستخدم المعين له المهمة
  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    PERFORM create_task_notification(
      NEW.assigned_to,
      'تم تعيين مهمة لك',
      'تم تعيين المهمة: ' || NEW.title || ' لك',
      'task_assigned',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لإنشاء إشعارات للمهام المتأخرة
CREATE OR REPLACE FUNCTION create_overdue_task_notifications()
RETURNS integer AS $$
DECLARE
  v_count integer := 0;
  v_task record;
BEGIN
  FOR v_task IN
    SELECT t.id, t.title, t.assigned_to
    FROM tasks t
    WHERE 
      t.due_date < CURRENT_DATE
      AND t.status NOT IN ('completed', 'rejected')
      AND t.assigned_to IS NOT NULL
      -- التحقق من عدم وجود إشعار متأخر تم إنشاؤه اليوم لهذه المهمة
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.entity_id = t.id
        AND n.entity_type = 'task'
        AND n.type = 'task_overdue'
        AND n.created_at > (CURRENT_DATE)
      )
  LOOP
    PERFORM create_task_notification(
      v_task.assigned_to,
      'مهمة متأخرة',
      'المهمة: ' || v_task.title || ' متأخرة عن موعد الاستحقاق',
      'task_overdue',
      v_task.id
    );
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء المشغلات (Triggers)
CREATE TRIGGER tr_notify_task_assigned
AFTER INSERT ON tasks
FOR EACH ROW
EXECUTE FUNCTION notify_task_assigned();

CREATE TRIGGER tr_notify_task_status_change
AFTER UPDATE OF status, assigned_to ON tasks
FOR EACH ROW
EXECUTE FUNCTION notify_task_status_change();

-- إنشاء دالة لتسجيل تعليق على مهمة مع إشعار
CREATE OR REPLACE FUNCTION add_task_comment(
  p_task_id uuid,
  p_user_id uuid,
  p_comment text
) RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
  v_task_owner uuid;
  v_task_assignee uuid;
  v_task_title text;
BEGIN
  -- إنشاء سجل التعليق
  INSERT INTO task_logs (
    task_id,
    user_id,
    action,
    notes
  ) VALUES (
    p_task_id,
    p_user_id,
    'comment',
    p_comment
  ) RETURNING id INTO v_log_id;
  
  -- الحصول على معلومات المهمة
  SELECT created_by, assigned_to, title INTO v_task_owner, v_task_assignee, v_task_title
  FROM tasks
  WHERE id = p_task_id;
  
  -- إرسال إشعار لمنشئ المهمة إذا كان المعلق ليس هو المنشئ
  IF v_task_owner != p_user_id THEN
    PERFORM create_task_notification(
      v_task_owner,
      'تعليق جديد على المهمة',
      'تم إضافة تعليق جديد على المهمة: ' || v_task_title,
      'task_comment',
      p_task_id
    );
  END IF;
  
  -- إرسال إشعار للمعين له المهمة إذا كان المعلق ليس هو المعين له المهمة
  IF v_task_assignee IS NOT NULL AND v_task_assignee != p_user_id THEN
    PERFORM create_task_notification(
      v_task_assignee,
      'تعليق جديد على المهمة',
      'تم إضافة تعليق جديد على المهمة: ' || v_task_title,
      'task_comment',
      p_task_id
    );
  END IF;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;