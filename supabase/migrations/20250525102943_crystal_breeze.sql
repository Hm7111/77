/*
  # إنشاء نظام المهام الإلكترونية
  
  1. New Tables
     - `tasks` - لتخزين المهام الرئيسية
     - `task_logs` - لتخزين سجل التحديثات والإجراءات على المهام
     - `task_attachments` - لتخزين مرفقات المهام
  
  2. Security
     - تفعيل Row Level Security (RLS) لجميع الجداول
     - إنشاء سياسات للقراءة والإضافة والتعديل والحذف
  
  3. Triggers
     - تنفيذ دوال آلية لتسجيل التغييرات على المهام
*/

-- إنشاء نوع تعداد لحالات المهمة
CREATE TYPE task_status AS ENUM (
  'new',        -- جديدة
  'in_progress', -- قيد التنفيذ
  'completed',   -- مكتملة
  'rejected',    -- مرفوضة
  'postponed'    -- مؤجلة
);

-- إنشاء نوع تعداد لأولويات المهمة
CREATE TYPE task_priority AS ENUM (
  'low',       -- منخفضة
  'medium',    -- متوسطة
  'high'       -- عالية
);

-- إنشاء جدول المهام
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  priority task_priority NOT NULL DEFAULT 'medium',
  status task_status NOT NULL DEFAULT 'new',
  due_date TIMESTAMP WITH TIME ZONE,
  completion_date TIMESTAMP WITH TIME ZONE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء جدول سجل المهام لتتبع التغييرات
CREATE TABLE IF NOT EXISTS task_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- مثل: create, update_status, comment, etc.
  previous_status task_status,
  new_status task_status,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء جدول مرفقات المهام (اختياري)
CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- تفعيل RLS لأمان الجداول
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- إنشاء الفهارس لتحسين الأداء
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_branch_id ON tasks(branch_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_task_logs_task_id ON task_logs(task_id);
CREATE INDEX idx_task_logs_user_id ON task_logs(user_id);
CREATE INDEX idx_task_attachments_task_id ON task_attachments(task_id);

-- إنشاء وظيفة لتسجيل تغييرات المهام
CREATE OR REPLACE FUNCTION log_task_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- تسجيل إنشاء مهمة جديدة
    INSERT INTO task_logs (task_id, user_id, action, new_status, notes)
    VALUES (NEW.id, NEW.created_by, 'create', NEW.status, 'تم إنشاء المهمة');
  ELSIF TG_OP = 'UPDATE' THEN
    -- تسجيل تحديث حالة المهمة
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO task_logs (task_id, user_id, action, previous_status, new_status, notes)
      VALUES (
        NEW.id, 
        COALESCE(auth.uid(), NEW.created_by),
        'update_status',
        OLD.status,
        NEW.status,
        CASE
          WHEN NEW.status = 'in_progress' THEN 'تم بدء العمل على المهمة'
          WHEN NEW.status = 'completed' THEN 'تم إكمال المهمة'
          WHEN NEW.status = 'rejected' THEN 'تم رفض المهمة'
          WHEN NEW.status = 'postponed' THEN 'تم تأجيل المهمة'
          ELSE 'تم تحديث حالة المهمة'
        END
      );

      -- تحديث تاريخ الإكمال عند اكتمال المهمة
      IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completion_date := now();
      ELSIF NEW.status != 'completed' THEN
        NEW.completion_date := NULL;
      END IF;
    END IF;
    
    -- تسجيل تحديث تفاصيل المهمة (غير الحالة)
    IF OLD.title IS DISTINCT FROM NEW.title OR 
       OLD.description IS DISTINCT FROM NEW.description OR
       OLD.assigned_to IS DISTINCT FROM NEW.assigned_to OR
       OLD.priority IS DISTINCT FROM NEW.priority OR
       OLD.due_date IS DISTINCT FROM NEW.due_date OR
       OLD.notes IS DISTINCT FROM NEW.notes THEN
      INSERT INTO task_logs (task_id, user_id, action, notes)
      VALUES (
        NEW.id, 
        COALESCE(auth.uid(), NEW.created_by),
        'update_details',
        'تم تحديث تفاصيل المهمة'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء مشغل لتسجيل تغييرات المهام
CREATE TRIGGER log_task_changes
AFTER INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION log_task_change();

-- إنشاء وظيفة لإضافة تعليق للمهمة
CREATE OR REPLACE FUNCTION add_task_comment(
  p_task_id UUID,
  p_user_id UUID,
  p_comment TEXT
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO task_logs (task_id, user_id, action, notes)
  VALUES (p_task_id, p_user_id, 'comment', p_comment)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- إنشاء وظيفة لجلب مهام المستخدم
CREATE OR REPLACE FUNCTION get_user_tasks(p_user_id UUID)
RETURNS SETOF tasks AS $$
BEGIN
  RETURN QUERY
  SELECT t.*
  FROM tasks t
  WHERE t.assigned_to = p_user_id 
    AND t.is_active = true
  ORDER BY 
    CASE 
      WHEN t.status = 'new' THEN 1
      WHEN t.status = 'in_progress' THEN 2
      WHEN t.status = 'postponed' THEN 3
      WHEN t.status = 'completed' THEN 4
      WHEN t.status = 'rejected' THEN 5
      ELSE 6
    END,
    CASE 
      WHEN t.priority = 'high' THEN 1
      WHEN t.priority = 'medium' THEN 2
      WHEN t.priority = 'low' THEN 3
      ELSE 4
    END,
    t.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- سياسات أمان للمهام (RLS)

-- 1. المدراء يمكنهم رؤية كل المهام
CREATE POLICY admin_view_all_tasks
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 2. المستخدمون يمكنهم رؤية المهام التي أنشأوها أو المسندة إليهم
CREATE POLICY users_view_own_tasks
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR assigned_to = auth.uid()
  );

-- 3. المدراء يمكنهم إنشاء المهام
CREATE POLICY admins_create_tasks
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 4. المدراء يمكنهم تحديث أي مهمة
CREATE POLICY admins_update_tasks
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 5. المستخدمون يمكنهم تحديث المهام المسندة إليهم (ولكن ليس كل الحقول)
CREATE POLICY users_update_assigned_tasks
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    assigned_to = auth.uid()
  )
  WITH CHECK (
    assigned_to = auth.uid() AND
    -- حقول محددة يمكن للمستخدم تعديلها
    (
      (OLD.status IS DISTINCT FROM NEW.status) OR
      (OLD.notes IS DISTINCT FROM NEW.notes)
    )
  );

-- 6. المدراء يمكنهم حذف المهام (حذف وهمي عبر تحديث is_active)
CREATE POLICY admins_delete_tasks
  ON tasks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- سياسات أمان لسجل المهام

-- 1. المدراء يمكنهم رؤية كل سجلات المهام
CREATE POLICY admin_view_all_task_logs
  ON task_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 2. المستخدمون يمكنهم رؤية سجلات المهام التي أنشأوها أو المسندة إليهم
CREATE POLICY users_view_own_task_logs
  ON task_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_logs.task_id
      AND (tasks.created_by = auth.uid() OR tasks.assigned_to = auth.uid())
    )
  );

-- 3. المستخدمون المصادقون يمكنهم إنشاء سجلات المهام (سيتم التحقق على مستوى التطبيق)
CREATE POLICY users_create_task_logs
  ON task_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

-- سياسات أمان لمرفقات المهام

-- 1. المدراء يمكنهم رؤية كل مرفقات المهام
CREATE POLICY admin_view_all_task_attachments
  ON task_attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 2. المستخدمون يمكنهم رؤية مرفقات المهام التي أنشأوها أو المسندة إليهم
CREATE POLICY users_view_own_task_attachments
  ON task_attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_attachments.task_id
      AND (tasks.created_by = auth.uid() OR tasks.assigned_to = auth.uid())
    )
  );

-- 3. المستخدمون المصادقون يمكنهم إضافة مرفقات للمهام
CREATE POLICY users_create_task_attachments
  ON task_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_attachments.task_id
      AND (tasks.created_by = auth.uid() OR tasks.assigned_to = auth.uid())
    )
  );

-- 4. المستخدمون يمكنهم حذف مرفقات المهام التي أضافوها
CREATE POLICY users_delete_own_task_attachments
  ON task_attachments
  FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
  );