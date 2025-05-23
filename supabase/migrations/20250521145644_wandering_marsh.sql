/*
  # إضافة حقل موضع رمز QR للقوالب

  1. التغييرات
    - إضافة حقل `qr_position` من نوع jsonb لتخزين إعدادات موضع رمز QR
    - يتيح هذا تخصيص موضع وحجم رمز QR في القالب
    
  2. البنية
    - الحقل يخزن كائن JSON يحتوي على:
      - `x`: الموضع الأفقي
      - `y`: الموضع الرأسي
      - `size`: حجم رمز QR
      - `alignment`: محاذاة رمز QR ('right', 'center', 'left')
*/

-- إضافة حقل qr_position إذا لم يكن موجوداً بالفعل
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'letter_templates' 
    AND column_name = 'qr_position'
  ) THEN
    ALTER TABLE letter_templates 
    ADD COLUMN qr_position jsonb;
    
    COMMENT ON COLUMN letter_templates.qr_position IS 'يخزن إعدادات موضع وحجم رمز QR في القالب';
  END IF;
END $$;

-- إضافة مثال توضيحي لتنسيق البيانات
COMMENT ON COLUMN letter_templates.qr_position IS '
يخزن إعدادات موضع وحجم رمز QR في القالب، مثال:
{
  "x": 40,
  "y": 760,
  "size": 80,
  "alignment": "right"
}
';