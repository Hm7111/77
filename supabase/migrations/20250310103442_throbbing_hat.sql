/*
  # Add RLS policies for letter templates

  1. Security
    - Enable RLS on letter_templates table
    - Add policies for authenticated users to view templates
    - Add policies for admin users to manage templates
*/

-- Enable RLS
ALTER TABLE letter_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active templates"
  ON letter_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true OR (auth.jwt() ->> 'role')::text = 'admin');

CREATE POLICY "Only admins can insert templates"
  ON letter_templates
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role')::text = 'admin');

CREATE POLICY "Only admins can update templates"
  ON letter_templates
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'role')::text = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role')::text = 'admin');

CREATE POLICY "Only admins can delete templates"
  ON letter_templates
  FOR DELETE
  TO authenticated
  USING ((auth.jwt() ->> 'role')::text = 'admin');