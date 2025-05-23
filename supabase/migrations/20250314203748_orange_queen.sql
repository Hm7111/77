/*
  # Add letter creator name

  1. Changes
    - Add creator_name column to letters table
    - Drop and recreate verify_letter function with creator_name
    - Update function to return additional fields

  2. Security
    - Maintain SECURITY DEFINER setting
    - Keep existing security checks
*/

-- Add creator_name column
ALTER TABLE letters
ADD COLUMN creator_name text;

-- Drop existing function first
DROP FUNCTION IF EXISTS verify_letter(text);

-- Recreate function with updated return type
CREATE OR REPLACE FUNCTION verify_letter(verification_code text)
RETURNS TABLE (
  id uuid,
  number integer,
  year integer,
  content jsonb,
  created_at timestamptz,
  verification_url text,
  creator_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    letters.id,
    letters.number,
    letters.year,
    letters.content,
    letters.created_at,
    letters.verification_url,
    letters.creator_name
  FROM letters
  WHERE letters.verification_url = verification_code
  AND letters.status = 'completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;