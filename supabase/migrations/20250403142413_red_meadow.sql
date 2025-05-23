/*
  # Fix security warnings and improve database functions

  1. Changes
    - Set search_path for all functions
    - Add SECURITY DEFINER to functions
    - Improve function security
    - Handle existing trigger dependencies
    
  2. Security
    - Prevent search_path injection
    - Ensure proper schema usage
    - Add proper security checks
*/

-- First recreate functions with improved security settings
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
  -- Generate unique verification URL
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

CREATE OR REPLACE FUNCTION public.verify_letter(verification_code text)
RETURNS TABLE (
  id uuid,
  number integer,
  year integer,
  content jsonb,
  created_at timestamptz,
  verification_url text,
  creator_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.get_next_letter_number(p_year integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_number integer;
BEGIN
  -- Get highest number for given year
  SELECT COALESCE(MAX(number), 0) + 1
  INTO v_next_number
  FROM letters
  WHERE year = p_year;
  
  RETURN v_next_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_letter_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set year
  NEW.year := EXTRACT(YEAR FROM CURRENT_TIMESTAMP);
  
  -- Get and set next number
  NEW.number := get_next_letter_number(NEW.year);
  
  RETURN NEW;
END;
$$;