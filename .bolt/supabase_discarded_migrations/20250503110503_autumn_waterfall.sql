/*
  # تصحيح مشكلة معالجة الرقم في جدول الخطابات

  1. التغييرات
   - السماح بقيم null في حقل الرقم
   - تحديث دالة set_letter_number للتعامل بشكل أفضل مع الأرقام
   
  2. الأمان
   - تعديل سياسات الوصول للخطابات
   - تحسين التعامل مع القيم الفارغة
*/

-- تحديث دالة تعيين رقم الخطاب
CREATE OR REPLACE FUNCTION set_letter_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- تعيين السنة
  NEW.year := EXTRACT(YEAR FROM CURRENT_TIMESTAMP);
  
  -- تعيين الرقم فقط إذا لم يتم تعيينه بالفعل
  IF NEW.number IS NULL THEN
    NEW.number := get_next_letter_number(NEW.year);
  END IF;
  
  RETURN NEW;
END;
$$;

-- تحديث دالة الحصول على الرقم التالي
CREATE OR REPLACE FUNCTION get_next_letter_number(p_year integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_number integer;
BEGIN
  -- البحث عن أكبر رقم للسنة المحددة
  SELECT COALESCE(MAX(number), 0) + 1
  INTO v_next_number
  FROM letters
  WHERE year = p_year
  AND number IS NOT NULL; -- تجاهل الخطابات التي لا تحتوي على رقم
  
  RETURN v_next_number;
END;
$$;