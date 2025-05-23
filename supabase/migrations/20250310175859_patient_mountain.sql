/*
  # تحسين عملية حذف المستخدمين

  1. التغييرات
    - إضافة سياسة حذف للمدير
    - تحسين آلية الحذف

  2. الأمان
    - التأكد من أن عملية الحذف تتم فقط بواسطة المدير
*/

-- تحديث سياسة الحذف للمدير
DROP POLICY IF EXISTS "allow_delete_for_admin" ON public.users;

CREATE POLICY "allow_delete_for_admin"
ON public.users
FOR DELETE
TO authenticated
USING (
  (SELECT is_admin())
  AND id != auth.uid() -- لا يمكن للمدير حذف نفسه
);