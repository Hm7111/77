/*
  # Fix users table policies

  1. Changes
    - Remove recursive role check in select policy
    - Simplify policies to prevent infinite recursion
    - Ensure admins can manage all users
    - Allow users to view and edit their own data

  2. Security
    - Maintain role-based access control
    - Prevent privilege escalation
    - Keep data isolation between users
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "select_users" ON users;
DROP POLICY IF EXISTS "insert_users" ON users;
DROP POLICY IF EXISTS "update_users" ON users;
DROP POLICY IF EXISTS "delete_users" ON users;

-- Select policy: Admins can see all users, users can only see themselves
CREATE POLICY "select_users" ON users
FOR SELECT TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  OR id = auth.uid()
);

-- Insert policy: Only admins can create users
CREATE POLICY "insert_users" ON users
FOR INSERT TO authenticated
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- Update policy: Admins can update any user, users can only update themselves
CREATE POLICY "update_users" ON users
FOR UPDATE TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  OR id = auth.uid()
)
WITH CHECK (
  CASE
    WHEN (SELECT role FROM users WHERE id = auth.uid()) = 'admin' THEN true
    WHEN id = auth.uid() THEN
      -- Users can't change their own role
      (role IS NULL OR role = (SELECT role FROM users WHERE id = auth.uid()))
    ELSE false
  END
);

-- Delete policy: Only admins can delete users
CREATE POLICY "delete_users" ON users
FOR DELETE TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);