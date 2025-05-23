/*
  # Fix verification URL and QR code functionality

  1. Changes
    - Drop existing function and recreate with improved logic
    - Update trigger to handle verification URLs properly
    - Add function to check verification status
    
  2. Security
    - Use cryptographically secure random values
    - Ensure URL uniqueness
*/

-- Drop existing function and recreate with improved logic
CREATE OR REPLACE FUNCTION generate_verification_url()
RETURNS trigger AS $$
DECLARE
  new_url text;
  attempts integer := 0;
  max_attempts constant integer := 3;
BEGIN
  LOOP
    -- Generate a new verification URL using multiple sources of entropy
    new_url := encode(
      digest(
        gen_random_uuid()::text || 
        NEW.id::text || 
        extract(epoch from now())::text ||
        gen_random_uuid()::text,  -- Additional entropy
        'sha256'
      ),
      'hex'
    );
    
    -- Check if URL already exists
    IF NOT EXISTS (
      SELECT 1 FROM letters WHERE verification_url = new_url
    ) THEN
      NEW.verification_url := new_url;
      EXIT;
    END IF;
    
    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique verification URL after % attempts', max_attempts;
    END IF;
  END LOOP;
  
  -- Set status to completed
  NEW.status := 'completed';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to verify letter
CREATE OR REPLACE FUNCTION verify_letter(verification_code text)
RETURNS TABLE (
  id uuid,
  number integer,
  year integer,
  content jsonb,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    letters.id,
    letters.number,
    letters.year,
    letters.content,
    letters.created_at
  FROM letters
  WHERE letters.verification_url = verification_code
  AND letters.status = 'completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;