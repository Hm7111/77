/*
  # تصحيح سياسات جدول المستخدمين

  1. التغييرات
    - إعادة تعريف سياسات الوصول للمستخدمين
    - تحديد صلاحيات المدير والمستخدم العادي
    
  2. السياسات الجديدة
    - المدير يمكنه الوصول لجميع المستخدمين
    - المستخدم العادي يمكنه فقط رؤية وتعديل بياناته
*/

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "allow_select" ON "public"."users";
DROP POLICY IF EXISTS "allow_insert" ON "public"."users";
DROP POLICY IF EXISTS "allow_update" ON "public"."users";
DROP POLICY IF EXISTS "allow_delete" ON "public"."users";

-- إنشاء دالة للتحقق من صلاحية المدير
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- سياسة القراءة: المدير يمكنه رؤية الجميع، والمستخدم العادي يرى نفسه فقط
CREATE POLICY "users_select_policy" ON "public"."users"
  FOR SELECT TO authenticated
  USING (
    is_admin() OR
    auth.uid() = id
  );

-- سياسة الإضافة: المدير فقط
CREATE POLICY "users_insert_policy" ON "public"."users"
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- سياسة التعديل: المدير يمكنه تعديل الجميع، والمستخدم العادي يعدل نفسه فقط
CREATE POLICY "users_update_policy" ON "public"."users"
  FOR UPDATE TO authenticated
  USING (
    is_admin() OR
    auth.uid() = id
  )
  WITH CHECK (
    is_admin() OR
    auth.uid() = id
  );

-- سياسة الحذف: المدير فقط
CREATE POLICY "users_delete_policy" ON "public"."users"
  FOR DELETE TO authenticated
  USING (is_admin());