/*
  # Create signatures storage bucket

  1. New Storage
    - Create a storage bucket for signatures with public access
    - Set appropriate CORS and security policies

  This migration adds the necessary storage bucket for storing user signatures
*/

-- Create signatures storage bucket if it doesn't exist
SELECT CASE 
  WHEN NOT EXISTS (
    SELECT FROM storage.buckets WHERE name = 'signatures'
  ) 
  THEN (
    INSERT INTO storage.buckets (id, name, public, file_size_limit)
    VALUES ('signatures', 'signatures', true, 2097152)
  )
END;

-- Create public access policy for the signatures bucket
INSERT INTO storage.policies (name, bucket_id, operation, definition, actions)
SELECT 
  'Public Read Access', 
  'signatures', 
  'SELECT', 
  'true', 
  ARRAY['SELECT']::text[]
WHERE NOT EXISTS (
  SELECT FROM storage.policies 
  WHERE bucket_id = 'signatures' 
  AND operation = 'SELECT'
);

-- Create authenticated user access policy for uploading files to the signatures bucket
INSERT INTO storage.policies (name, bucket_id, operation, definition, actions)
SELECT 
  'User Upload Access', 
  'signatures', 
  'INSERT', 
  'auth.uid() = (storage.foldername())[1]::uuid', 
  ARRAY['INSERT']::text[]
WHERE NOT EXISTS (
  SELECT FROM storage.policies 
  WHERE bucket_id = 'signatures' 
  AND operation = 'INSERT'
);

-- Create policy to allow users to delete their own signatures
INSERT INTO storage.policies (name, bucket_id, operation, definition, actions)
SELECT 
  'User Delete Access', 
  'signatures', 
  'REMOVE', 
  'auth.uid() = (storage.foldername())[1]::uuid', 
  ARRAY['DELETE']::text[]
WHERE NOT EXISTS (
  SELECT FROM storage.policies 
  WHERE bucket_id = 'signatures' 
  AND operation = 'REMOVE'
);