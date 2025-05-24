/*
  # Fix signatures storage policies

  1. Security
    - Add proper storage policies for the signatures bucket
    - Ensure authenticated users can upload their own signatures
    - Allow public read access to signatures
    - Allow users to delete their own signatures
*/

-- Skip creating the bucket since it already exists
-- Just focus on creating the required policies

-- Create public access policy for the signatures bucket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM storage.policies 
        WHERE bucket_id = 'signatures' 
        AND operation = 'SELECT'
    ) THEN
        INSERT INTO storage.policies (name, bucket_id, operation, definition, actions)
        VALUES (
            'Public Read Access', 
            'signatures', 
            'SELECT', 
            'true', 
            ARRAY['SELECT']::text[]
        );
    END IF;
END $$;

-- Create authenticated user access policy for uploading files to the signatures bucket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM storage.policies 
        WHERE bucket_id = 'signatures' 
        AND operation = 'INSERT'
    ) THEN
        INSERT INTO storage.policies (name, bucket_id, operation, definition, actions)
        VALUES (
            'User Upload Access', 
            'signatures', 
            'INSERT', 
            'auth.uid() = (storage.foldername())[1]::uuid', 
            ARRAY['INSERT']::text[]
        );
    END IF;
END $$;

-- Create policy to allow users to delete their own signatures
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM storage.policies 
        WHERE bucket_id = 'signatures' 
        AND operation = 'REMOVE'
    ) THEN
        INSERT INTO storage.policies (name, bucket_id, operation, definition, actions)
        VALUES (
            'User Delete Access', 
            'signatures', 
            'REMOVE', 
            'auth.uid() = (storage.foldername())[1]::uuid', 
            ARRAY['DELETE']::text[]
        );
    END IF;
END $$;