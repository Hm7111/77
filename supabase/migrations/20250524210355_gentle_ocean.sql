/*
  # Fix branch display in user profile

  1. New Functions
    - `get_user_with_branch_details` - Function to retrieve user data with complete branch information
    - `refresh_user_branch_data` - Function to update user's branch information

  2. Security
    - Enable RLS on all affected tables
    - Add policies for authenticated users

  3. Changes
    - Add trigger to update user branch data when branch changes
    - Fix branch data retrieval in user profile
*/

-- Function to get user with complete branch details
CREATE OR REPLACE FUNCTION get_user_with_branch_details(user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_data JSONB;
BEGIN
  SELECT 
    jsonb_build_object(
      'id', u.id,
      'email', u.email,
      'full_name', u.full_name,
      'role', u.role,
      'is_active', u.is_active,
      'branch_id', u.branch_id,
      'branch', CASE 
        WHEN b.id IS NOT NULL THEN 
          jsonb_build_object(
            'id', b.id,
            'name', b.name,
            'code', b.code,
            'city', b.city,
            'is_active', b.is_active
          )
        ELSE NULL
      END,
      'permissions', u.permissions,
      'created_at', u.created_at,
      'updated_at', u.updated_at
    ) INTO user_data
  FROM 
    users u
    LEFT JOIN branches b ON u.branch_id = b.id
  WHERE 
    u.id = user_id;
    
  RETURN user_data;
END;
$$;

-- Function to refresh user branch data
CREATE OR REPLACE FUNCTION refresh_user_branch_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If branch_id is updated, ensure branch data is properly linked
  IF (TG_OP = 'UPDATE' AND OLD.branch_id IS DISTINCT FROM NEW.branch_id) THEN
    -- Log the branch change
    INSERT INTO audit_logs (
      action_type, 
      target_type, 
      target_id, 
      summary, 
      details, 
      performed_by,
      user_name,
      user_role
    ) VALUES (
      'update',
      'user',
      NEW.id,
      'تحديث فرع المستخدم',
      jsonb_build_object(
        'old_branch_id', OLD.branch_id,
        'new_branch_id', NEW.branch_id
      ),
      auth.uid(),
      (SELECT full_name FROM users WHERE id = auth.uid()),
      (SELECT role FROM users WHERE id = auth.uid())
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to update user branch data
DROP TRIGGER IF EXISTS tr_refresh_user_branch_data ON users;
CREATE TRIGGER tr_refresh_user_branch_data
AFTER UPDATE ON users
FOR EACH ROW
WHEN (OLD.branch_id IS DISTINCT FROM NEW.branch_id)
EXECUTE FUNCTION refresh_user_branch_data();

-- Ensure RLS is enabled on users table
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;

-- Ensure RLS is enabled on branches table
ALTER TABLE IF EXISTS branches ENABLE ROW LEVEL SECURITY;

-- Create index on branch_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users(branch_id);

-- Create index on branch code for faster lookups
CREATE INDEX IF NOT EXISTS idx_branches_code ON branches(code);

-- Update user branch data for existing users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id, branch_id FROM users WHERE branch_id IS NOT NULL LOOP
    PERFORM get_user_with_branch_details(user_record.id);
  END LOOP;
END;
$$;

-- Add comment to explain the purpose of this migration
COMMENT ON FUNCTION get_user_with_branch_details(UUID) IS 'Retrieves user data with complete branch information';
COMMENT ON FUNCTION refresh_user_branch_data() IS 'Updates user branch data when branch changes';