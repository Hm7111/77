/*
  # Add is_deleted column to letter_templates table
  
  1. Changes
    - Add `is_deleted` column to the `letter_templates` table with a default value of `false`
    - This allows for soft deletion of templates instead of permanently removing them
  
  2. Notes
    - The column will be used to implement "soft delete" functionality for templates
    - All existing templates will have is_deleted=false by default
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'letter_templates' AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE letter_templates ADD COLUMN is_deleted BOOLEAN DEFAULT false;
  END IF;
END $$;