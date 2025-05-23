/*
  # Add verification URL to letters table

  1. Changes
    - Add verification_url column to letters table
    - Add function to generate verification URL
    - Add trigger to automatically set verification URL on insert

  2. Security
    - Ensure verification URLs are unique
    - Add index for faster lookups
*/

-- Add verification_url column
ALTER TABLE letters
ADD COLUMN verification_url text UNIQUE;

-- Create function to generate verification URL
CREATE OR REPLACE FUNCTION generate_verification_url()
RETURNS trigger AS $$
BEGIN
  NEW.verification_url := encode(digest(NEW.id::text || now()::text, 'sha256'), 'hex');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set verification URL on insert
CREATE TRIGGER set_verification_url
  BEFORE INSERT ON letters
  FOR EACH ROW
  EXECUTE FUNCTION generate_verification_url();

-- Add index for faster lookups
CREATE INDEX letters_verification_url_idx ON letters(verification_url);