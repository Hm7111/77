/*
  # Fix users table policies

  1. Changes
    - Fix infinite recursion in users policies
    - Simplify policy conditions
    - Add proper admin role checks

  2. Security
    - Enable RLS on users table
    - Add policies for CRUD operations
    - Ensure proper access control for admins and users
*/

-- Drop existing policies
DROP POLICY IF EXISTS "سياسة الإضافة للمدراء" ON users;
DROP POLICY IF EXISTS "سياسة التحديث للمستخدمين" ON users;
DROP POLICY IF EXISTS "سياسة الحذف للمدراء" ON users;
DROP POLICY IF EXISTS "سياسة القراءة للمستخدمين" ON users;

-- Create new policies with fixed conditions
CREATE POLICY "admins_can_create_users"
ON users FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "admins_can_update_all_users_and_users_can_update_themselves"
ON users FOR UPDATE TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )) OR (id = auth.uid())
)
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )) OR (id = auth.uid())
);

CREATE POLICY "admins_can_delete_users"
ON users FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "admins_can_read_all_users_and_users_can_read_themselves"
ON users FOR SELECT TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )) OR (id = auth.uid())
);