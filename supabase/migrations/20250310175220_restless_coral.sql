/*
  # Fix user creation and policies

  1. Changes
    - Add trigger to automatically create user record on auth.users insert
    - Update policies to ensure proper access control
    - Add function to handle user creation

  2. Security
    - Maintain RLS policies
    - Ensure data consistency between auth.users and public.users
*/

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    true
  );
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Recreate policies with simplified logic
DROP POLICY IF EXISTS "allow_read_all_for_admin" ON public.users;
DROP POLICY IF EXISTS "allow_read_own_data" ON public.users;
DROP POLICY IF EXISTS "allow_insert_for_admin" ON public.users;
DROP POLICY IF EXISTS "allow_update_for_admin" ON public.users;
DROP POLICY IF EXISTS "allow_update_own_data" ON public.users;
DROP POLICY IF EXISTS "allow_delete_for_admin" ON public.users;

-- Read policies
CREATE POLICY "allow_read_own_data"
ON public.users
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);

CREATE POLICY "allow_read_all_for_admin"
ON public.users
FOR SELECT
TO authenticated
USING (
  role = 'admin'
);

-- Update policies
CREATE POLICY "allow_update_own_data"
ON public.users
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
)
WITH CHECK (
  auth.uid() = id
  AND role = (SELECT users.role FROM public.users WHERE users.id = auth.uid())
);

CREATE POLICY "allow_update_for_admin"
ON public.users
FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

-- Delete policy (admin only)
CREATE POLICY "allow_delete_for_admin"
ON public.users
FOR DELETE
TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);