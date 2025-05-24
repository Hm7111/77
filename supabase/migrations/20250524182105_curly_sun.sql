/*
  # إضافة حقول مواضع العناصر المخصصة

  1. تغييرات الجدول
    - إضافة حقل letter_elements إلى جدول letter_templates لتخصيص مواضع العناصر (الرقم، التاريخ، التوقيع)
  
  2. شرح الحقول
    - letter_elements: مصفوفة JSON تحتوي على إعدادات مواضع عناصر الخطاب مثل رقم الخطاب وتاريخه والتوقيع
*/

-- إضافة حقل letter_elements إلى جدول letter_templates
-- سيتم استخدامه لتخزين إعدادات مواضع رقم الخطاب وتاريخ الخطاب والتوقيع وأي عناصر أخرى
DO $$ 
BEGIN 
  IF NOT EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'letter_templates' AND column_name = 'letter_elements'
  ) THEN
    ALTER TABLE letter_templates 
    ADD COLUMN letter_elements JSONB DEFAULT NULL;

    COMMENT ON COLUMN letter_templates.letter_elements IS 
    'يخزن إعدادات مواضع العناصر الثابتة في القالب مثل رقم الخطاب وتاريخه وموضع التوقيع. مثال:
    {
      "letterNumber": {
        "x": 85,
        "y": 25,
        "width": 32,
        "alignment": "right",
        "enabled": true
      },
      "letterDate": {
        "x": 40,
        "y": 60,
        "width": 120,
        "alignment": "center",
        "enabled": true
      },
      "signature": {
        "x": 40,
        "y": 700,
        "width": 150,
        "height": 80,
        "alignment": "center",
        "enabled": true
      }
    }';
  END IF;
END $$;