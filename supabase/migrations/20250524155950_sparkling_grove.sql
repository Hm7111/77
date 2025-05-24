/*
  # إضافة نظام ترقيم مركب للخطابات حسب الفرع
  
  1. التغييرات
     - إضافة حقل `branch_code` للإشارة إلى رمز الفرع الذي يصدر الخطاب
     - إضافة حقل `letter_reference` لتخزين مرجع الخطاب المركب (مثال: RYD-123/2025)
     - تحديث الوظائف والمشغلات المتعلقة بالترقيم
  
  2. الأمان
     - الحفاظ على سياسات RLS الحالية
*/

-- إضافة أعمدة جديدة لجدول الخطابات
ALTER TABLE letters ADD COLUMN IF NOT EXISTS branch_code TEXT;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS letter_reference TEXT;

-- إنشاء فهرس للبحث السريع بواسطة مرجع الخطاب
CREATE INDEX IF NOT EXISTS idx_letters_reference ON letters(letter_reference);

-- تحديث الوظيفة المسؤولة عن تعيين رقم الخطاب
CREATE OR REPLACE FUNCTION set_letter_number_with_branch()
RETURNS TRIGGER AS $$
DECLARE
    branch_code_val TEXT;
    next_num INTEGER;
BEGIN
    -- الحصول على رمز الفرع من جدول المستخدمين
    SELECT b.code INTO branch_code_val
    FROM branches b
    JOIN users u ON u.branch_id = b.id
    WHERE u.id = NEW.user_id;

    -- إذا لم يكن هناك رمز فرع، استخدم القيمة الافتراضية
    IF branch_code_val IS NULL THEN
        branch_code_val := 'GEN'; -- General/عام
    END IF;

    -- تعيين رمز الفرع للخطاب
    NEW.branch_code := branch_code_val;

    -- إذا كان الرقم غير محدد، قم بتعيينه
    IF NEW.number IS NULL THEN
        -- الحصول على أعلى رقم للعام والفرع الحاليين
        SELECT COALESCE(MAX(number), 0) + 1 INTO next_num
        FROM letters 
        WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
        AND branch_code = branch_code_val;
        
        NEW.number := next_num;
    END IF;

    -- إذا كانت السنة غير محددة، استخدم السنة الحالية
    IF NEW.year IS NULL THEN
        NEW.year := EXTRACT(YEAR FROM CURRENT_DATE);
    END IF;

    -- إنشاء مرجع الخطاب المركب
    NEW.letter_reference := branch_code_val || '-' || NEW.number || '/' || NEW.year;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء أو تحديث المشغل الذي يستخدم الوظيفة
DROP TRIGGER IF EXISTS tr_set_letter_number ON letters;
CREATE TRIGGER tr_set_letter_number
BEFORE INSERT ON letters
FOR EACH ROW
WHEN (NEW.number IS NULL OR NEW.year IS NULL)
EXECUTE FUNCTION set_letter_number_with_branch();

-- تحديث الخطابات الحالية بتعيين رمز الفرع ومرجع الخطاب
DO $$
DECLARE
    letter_rec RECORD;
    branch_code_val TEXT;
BEGIN
    FOR letter_rec IN SELECT l.id, l.user_id, l.number, l.year FROM letters l WHERE l.branch_code IS NULL
    LOOP
        -- الحصول على رمز الفرع من جدول المستخدمين
        SELECT b.code INTO branch_code_val
        FROM branches b
        JOIN users u ON u.branch_id = b.id
        WHERE u.id = letter_rec.user_id;

        -- إذا لم يكن هناك رمز فرع، استخدم القيمة الافتراضية
        IF branch_code_val IS NULL THEN
            branch_code_val := 'GEN'; -- General/عام
        END IF;

        -- تحديث الخطاب بتعيين رمز الفرع ومرجع الخطاب
        UPDATE letters
        SET branch_code = branch_code_val,
            letter_reference = branch_code_val || '-' || number || '/' || year
        WHERE id = letter_rec.id;
    END LOOP;
END;
$$;

-- تحديث وظيفة التحقق من الخطاب لتضمين مرجع الخطاب
CREATE OR REPLACE FUNCTION verify_letter(verification_code TEXT)
RETURNS TABLE (
    id UUID,
    number INTEGER,
    year INTEGER,
    branch_code TEXT,
    letter_reference TEXT,
    content JSONB,
    created_at TIMESTAMPTZ,
    verification_url TEXT,
    creator_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.id,
        l.number,
        l.year,
        l.branch_code,
        l.letter_reference,
        l.content,
        l.created_at,
        l.verification_url,
        l.creator_name
    FROM
        letters l
    WHERE
        l.verification_url = verification_code;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION verify_letter(TEXT) IS 'التحقق من صحة الخطاب باستخدام الرمز وإرجاع تفاصيل الخطاب';