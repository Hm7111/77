/*
  # Add admin policies for users table

  1. Changes
    - Add policy to allow admins to view all users
    - Add policy to allow admins to insert new users
    - Add policy to allow admins to update users
    - Add policy to allow admins to delete users

  2. Security
    - Only authenticated admin users can manage other users
    - Regular users cannot access user management features
*/

-- سياسة تسمح للمدراء برؤية جميع المستخدمين
CREATE POLICY "Admins can view all users"
ON public.users
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM public.users WHERE role = 'admin'
  )
);

-- سياسة تسمح للمدراء بإضافة مستخدمين جدد
CREATE POLICY "Admins can insert users"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.users WHERE role = 'admin'
  )
);

-- سياسة تسمح للمدراء بتحديث بيانات المستخدمين
CREATE POLICY "Admins can update users"
ON public.users
FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM public.users WHERE role = 'admin'
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.users WHERE role = 'admin'
  )
);

-- سياسة تسمح للمدراء بحذف المستخدمين
CREATE POLICY "Admins can delete users"
ON public.users
FOR DELETE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM public.users WHERE role = 'admin'
  )
);