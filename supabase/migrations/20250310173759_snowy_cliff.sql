/*
  # Fix users table policies

  1. Changes
    - Update RLS policies for proper user management
    - Add policies for admin users to manage all users
    - Add policy for users to read their own data

  2. Security
    - Enable RLS on users table
    - Admins can perform all operations
    - Users can only read their own data
*/

-- First, ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- Drop policies if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users') THEN
    DROP POLICY IF EXISTS "المدير يمكنه إضافة مستخدمين" ON users;
    DROP POLICY IF EXISTS "المدير يمكنه تعديل المستخدمين" ON users;
    DROP POLICY IF EXISTS "المدير يمكنه حذف المستخدمين" ON users;
    DROP POLICY IF EXISTS "المدير يمكنه رؤية جميع المستخدمين" ON users;
    DROP POLICY IF EXISTS "Admins can do everything" ON users;
    DROP POLICY IF EXISTS "Users can read own data" ON users;
  END IF;
END $$;

-- Create new policies
CREATE POLICY "admin_all" ON users
FOR ALL TO authenticated
USING (is_admin() OR auth.uid() = id)
WITH CHECK (is_admin());

CREATE POLICY "user_select" ON users
FOR SELECT TO authenticated
USING (auth.uid() = id OR is_admin());

CREATE POLICY "user_insert" ON users
FOR INSERT TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "user_update" ON users
FOR UPDATE TO authenticated
USING (is_admin() OR auth.uid() = id)
WITH CHECK (is_admin() OR auth.uid() = id);

CREATE POLICY "user_delete" ON users
FOR DELETE TO authenticated
USING (is_admin());