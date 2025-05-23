/*
  # Fix digest function and schema issues

  1. Changes
    - Enable pgcrypto extension in the correct schema
    - Update generate_verification_url function to use proper schema reference
    - Fix digest function usage

  2. Security
    - Maintain existing security settings
    - Ensure proper schema usage
*/

-- Enable pgcrypto extension in the correct schema
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;

-- Recreate generate_verification_url function with proper schema reference
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
  -- Generate unique verification URL using proper schema reference
  new_url := encode(
    public.digest(
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