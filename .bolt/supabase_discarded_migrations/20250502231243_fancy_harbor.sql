/*
  # Prevent Letters from Being Deleted When Templates are Deleted

  1. Changes
    - Drop the existing constraint with CASCADE behavior
    - Make template_id nullable 
    - Add a new constraint with SET NULL behavior
    - Add is_deleted flag to templates for soft delete

  2. Security
    - Maintain existing RLS policies
    - Preserve all existing letter data
*/

-- Make template_id nullable and change the deletion behavior
ALTER TABLE letters DROP CONSTRAINT IF EXISTS letters_template_id_fkey;
ALTER TABLE letters ALTER COLUMN template_id DROP NOT NULL;
ALTER TABLE letters ADD CONSTRAINT letters_template_id_fkey 
  FOREIGN KEY (template_id) REFERENCES letter_templates(id) ON DELETE SET NULL;

-- Add is_deleted column to letter_templates for soft delete
ALTER TABLE letter_templates ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Update is_active to true for existing templates if it doesn't exist
UPDATE letter_templates SET is_active = true WHERE is_active IS NULL;