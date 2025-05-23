/*
  # Add updated_at column to users table

  1. Changes
    - Add updated_at column to users table
    - Set default value to now()
    
  2. Purpose
    - Track when a user record was last updated
    - Support functionality in the UserDialog component
*/

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();