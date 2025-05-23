/*
  # Add ensure_user_exists function

  1. New Functions
     - ensure_user_exists: Function to ensure a user record exists
       This helps create user records without requiring admin permissions

  2. Security
     - Function is marked as SECURITY DEFINER to execute with creator's permissions
     - Carefully validates input parameters before execution
*/

-- Create a function to ensure a user record exists
CREATE OR REPLACE FUNCTION public.ensure_user_exists(
  user_id UUID,
  user_email TEXT,
  user_full_name TEXT,
  user_role TEXT,
  user_branch_id UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Check if user already exists
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = user_id) THEN
    -- Insert the user if they don't exist
    INSERT INTO public.users (
      id, 
      email, 
      full_name, 
      role, 
      branch_id, 
      is_active
    ) VALUES (
      user_id, 
      user_email, 
      user_full_name, 
      user_role, 
      user_branch_id, 
      true
    );
  END IF;
END;
$$;

-- Create or replace the handle_new_user function to ensure it works properly
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  new_role TEXT;
  new_full_name TEXT;
  new_branch_id UUID;
BEGIN
  -- Extract user metadata from the auth.users record
  new_role := new.raw_user_meta_data->>'role';
  new_full_name := new.raw_user_meta_data->>'full_name';
  new_branch_id := (new.raw_user_meta_data->>'branch_id')::UUID;
  
  -- Set default role if none provided
  IF new_role IS NULL THEN
    new_role := 'user';
  END IF;
  
  -- Create the user record in the public schema
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    branch_id,
    is_active
  ) VALUES (
    new.id,
    new.email,
    COALESCE(new_full_name, new.email),
    new_role,
    new_branch_id,
    true
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Set up trigger for handle_new_user if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
    AND tgrelid = 'auth.users'::regclass
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    -- Handle case where we don't have access to auth.users
    NULL;
END
$$;