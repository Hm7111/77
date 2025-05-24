/*
  # Create Signatures Storage Bucket and Policies

  1. Create Storage
    - Create 'signatures' bucket if it doesn't exist
  2. Security
    - Add public read access policy
    - Add user upload access policy
    - Add user delete access policy
*/

-- Create signatures storage bucket if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM storage.buckets WHERE name = 'signatures') THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit)
        VALUES ('signatures', 'signatures', true, 2097152);
    END IF;
END $$;

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