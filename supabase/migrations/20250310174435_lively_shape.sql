/*
  # Fix users table policies

  1. Changes
    - Drop existing policies
    - Create new policies that:
      - Allow admins to perform all operations
      - Allow users to view their own data
      - Fix policy checks to properly identify admin users

  2. Security
    - Enable RLS
    - Add proper policies for both admins and regular users
    - Ensure proper access control
*/

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies
DROP POLICY IF EXISTS "admin_all" ON public.users;
DROP POLICY IF EXISTS "user_delete" ON public.users;
DROP POLICY IF EXISTS "user_insert" ON public.users;
DROP POLICY IF EXISTS "user_select" ON public.users;
DROP POLICY IF EXISTS "user_update" ON public.users;

-- Create new policies
CREATE POLICY "admins_all" ON public.users
FOR ALL TO authenticated
USING (
  is_admin() OR auth.uid() = id
)
WITH CHECK (
  is_admin() OR auth.uid() = id
);

CREATE POLICY "users_read_own" ON public.users
FOR SELECT TO authenticated
USING (
  auth.uid() = id OR is_admin()
);

-- Make sure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;