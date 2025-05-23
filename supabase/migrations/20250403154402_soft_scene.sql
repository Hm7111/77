/*
  # Fix letter policies and visibility

  1. Changes
    - Drop existing policies
    - Create new policies for strict letter access control
    - Ensure users can only see their own letters
    - Remove admin access to user letters

  2. Security
    - Enforce strict user isolation
    - Prevent any cross-user access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "allow_read_own_letters" ON letters;
DROP POLICY IF EXISTS "allow_create_own_letters" ON letters;
DROP POLICY IF EXISTS "allow_update_own_letters" ON letters;
DROP POLICY IF EXISTS "allow_delete_own_letters" ON letters;

-- Create new strict policies
CREATE POLICY "users_can_read_own_letters"
ON letters FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "users_can_create_own_letters"
ON letters FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_letters"
ON letters FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_delete_own_letters"
ON letters FOR DELETE
TO authenticated
USING (auth.uid() = user_id);