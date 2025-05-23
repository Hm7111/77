/*
  # Setup storage for templates

  1. Storage
    - Create templates bucket if it doesn't exist
    - Add policies for file access and upload
  
  2. Security
    - Allow authenticated users to upload files
    - Allow public access to view files
*/

DO $$
BEGIN
  -- Only create bucket if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'templates'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('templates', 'templates', true);
  END IF;
END $$;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can upload template images" ON storage.objects;
DROP POLICY IF EXISTS "Public users can view template images" ON storage.objects;

-- Create policy to allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload template images"
ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'templates'
);

-- Create policy to allow public access to template images
CREATE POLICY "Public users can view template images"
ON storage.objects FOR SELECT TO public USING (
  bucket_id = 'templates'
);