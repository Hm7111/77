/*
  # Fix digest function error

  1. Changes
    - Enable pgcrypto extension for digest function
    - Update verification URL generation to use proper hashing

  2. Security
    - Maintain existing security settings
    - Ensure proper function access
*/

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Recreate generate_verification_url function with proper digest usage
CREATE OR REPLACE FUNCTION public.generate_verification_url()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_url text;
  qr_info jsonb;
BEGIN
  -- Generate unique verification URL using proper digest function from pgcrypto
  new_url := encode(
    digest(
      gen_random_uuid()::text || 
      NEW.id::text || 
      extract(epoch from now())::text,
      'sha256'
    ),
    'hex'
  );
  
  -- Create QR data
  qr_info := json_build_object(
    'url', new_url,
    'created_at', now(),
    'letter_id', NEW.id,
    'number', NEW.number,
    'year', NEW.year
  );
  
  -- Update data
  NEW.verification_url := new_url;
  NEW.qr_data := qr_info;
  NEW.status := 'completed';
  
  RETURN NEW;
END;
$$;