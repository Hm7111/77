/*
  # تصحيح آلية معالجة رقم الخطاب

  1. التغييرات
    - تحديث وظيفة set_letter_number لتتعامل بشكل أفضل مع القيم الفارغة
    - تحسين التحقق من القيم النصية الفارغة والتحويل إلى قيمة رقمية
    
  2. الأمان
    - التأكد من أن رقم الخطاب دائمًا إما رقم صحيح أو NULL
    - منع حدوث أخطاء عند التحويل من نص إلى رقم
*/

-- تحديث وظيفة تعيين رقم الخطاب
CREATE OR REPLACE FUNCTION set_letter_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- تعيين السنة الحالية
  NEW.year := EXTRACT(YEAR FROM CURRENT_TIMESTAMP);
  
  -- معالجة قيمة نص فارغ - تحويلها إلى NULL
  IF NEW.number = '' OR NEW.number IS NULL THEN
    -- إذا كانت القيمة نصًا فارغًا أو NULL، قم بتعيين الرقم التالي
    NEW.number := get_next_letter_number(NEW.year);
  END IF;
  
  RETURN NEW;
END;
$$;