/*
  # Storage Policies for Templates

  1. Storage Configuration
    - Ensures 'templates' bucket exists and is public
    - Sets up proper access control for template images

  2. Access Policies
    - Authenticated users can upload files
    - Authenticated users can delete their files
    - Public read access for all files
*/

-- Create templates bucket if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'templates'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('templates', 'templates', true);
  END IF;
END $$;

-- Create policies for file management if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'المستخدمون المصادقون يمكنهم رفع الملفات'
  ) THEN
    CREATE POLICY "المستخدمون المصادقون يمكنهم رفع الملفات"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'templates');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'المستخدمون المصادقون يمكنهم حذف الملفات'
  ) THEN
    CREATE POLICY "المستخدمون المصادقون يمكنهم حذف الملفات"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'templates');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname = 'يمكن للجميع قراءة الملفات'
  ) THEN
    CREATE POLICY "يمكن للجميع قراءة الملفات"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'templates');
  END IF;
END $$;