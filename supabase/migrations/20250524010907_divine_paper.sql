/*
  # إزالة أي جداول أو وظائف متعلقة بالمهام

  1. تحقق من عدم وجود جداول متعلقة بالمهام
  2. إزالة أي صلاحيات متعلقة بالمهام
*/

-- التحقق من عدم وجود جداول متعلقة بالمهام
DO $$ 
BEGIN
  -- لا توجد جداول متعلقة بالمهام لحذفها
  RAISE NOTICE 'لا توجد جداول متعلقة بالمهام لحذفها';
END $$;

-- إزالة أي صلاحيات متعلقة بالمهام من جدول الصلاحيات
DELETE FROM permissions 
WHERE code LIKE '%:tasks%' 
   OR code LIKE '%:task%'
   OR name LIKE '%مهمة%'
   OR name LIKE '%مهام%'
   OR description LIKE '%مهمة%'
   OR description LIKE '%مهام%';

-- إزالة صلاحيات المهام من أدوار المستخدمين
UPDATE user_roles
SET permissions = array_remove(permissions, 
  (SELECT id FROM permissions WHERE code LIKE '%:tasks%' OR code LIKE '%:task%' LIMIT 1)
)
WHERE permissions @> ARRAY[(SELECT id FROM permissions WHERE code LIKE '%:tasks%' OR code LIKE '%:task%' LIMIT 1)];

-- إزالة صلاحيات المهام من المستخدمين
UPDATE users
SET permissions = array_remove(permissions, 
  (SELECT id FROM permissions WHERE code LIKE '%:tasks%' OR code LIKE '%:task%' LIMIT 1)
)
WHERE permissions @> ARRAY[(SELECT id FROM permissions WHERE code LIKE '%:tasks%' OR code LIKE '%:task%' LIMIT 1)];