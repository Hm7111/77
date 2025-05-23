/*
  # Fix recursive policies in users table

  1. Changes
    - Drop existing policies that cause infinite recursion
    - Add new policies with optimized conditions:
      - Use auth.uid() directly for user identification
      - Store role in auth.users metadata to avoid recursive checks
      - Policies for CRUD operations based on role

  2. Security
    - Maintain RLS protection
    - Ensure proper access control:
      - Admins can manage all users
      - Users can only view their own data
*/

-- Drop existing policies to clean up
DROP POLICY IF EXISTS "Allow admins to create users" ON users;
DROP POLICY IF EXISTS "Allow admins to delete users" ON users;
DROP POLICY IF EXISTS "Allow admins to see all users" ON users;
DROP POLICY IF EXISTS "Allow admins to update users" ON users;

-- Create new optimized policies
CREATE POLICY "users_read_access"
ON users
FOR SELECT
TO authenticated
USING (
  -- Users can read their own data
  auth.uid() = id
  OR
  -- Admins can read all data (checking metadata to avoid recursion)
  (auth.jwt() ->> 'role')::text = 'admin'
);

CREATE POLICY "users_insert_admin_only"
ON users
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt() ->> 'role')::text = 'admin'
);

CREATE POLICY "users_update_admin_only"
ON users
FOR UPDATE
TO authenticated
USING (
  (auth.jwt() ->> 'role')::text = 'admin'
)
WITH CHECK (
  (auth.jwt() ->> 'role')::text = 'admin'
);

CREATE POLICY "users_delete_admin_only"
ON users
FOR DELETE
TO authenticated
USING (
  (auth.jwt() ->> 'role')::text = 'admin'
);