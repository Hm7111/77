/*
  # Add QR position customization feature

  1. Changes
    - Add `qr_position` column to letter_templates table
    - This will store the custom position for QR codes in templates
    - Support positioning, size and alignment options

  2. Type definition
    - The qr_position column will store a JSONB object with:
      - x: horizontal position
      - y: vertical position
      - size: QR code size in pixels
      - alignment: text alignment (right, center, left)
*/

-- Only add the column if it doesn't exist yet
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'letter_templates' 
    AND column_name = 'qr_position'
  ) THEN
    ALTER TABLE letter_templates 
    ADD COLUMN qr_position jsonb;
  END IF;
END $$;