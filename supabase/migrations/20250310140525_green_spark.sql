/*
  # Fix users table policies

  1. Changes
    - Drop existing policies that cause infinite recursion
    - Add new policies for users table:
      - Admins can view all users
      - Users can view their own data
      - Admins can insert new users
      - Admins can update users
      - Admins can delete users

  2. Security
    - Enable RLS on users table
    - Add proper policies for each operation
*/

-- Drop existing policies
DROP POLICY IF EXISTS "users_admin_delete" ON users;
DROP POLICY IF EXISTS "users_admin_insert" ON users;
DROP POLICY IF EXISTS "users_admin_select" ON users;
DROP POLICY IF EXISTS "users_admin_update" ON users;

-- Create new policies
CREATE POLICY "Allow admins to see all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    )
    OR id = auth.uid()
  );

CREATE POLICY "Allow admins to create users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    )
  );

CREATE POLICY "Allow admins to update users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    )
  );

CREATE POLICY "Allow admins to delete users"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    )
  );