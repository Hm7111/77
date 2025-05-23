/*
  # Fix ambiguous id column errors in approval system functions

  1. Changes
    - Drop and recreate functions with proper column references
    - Fix ambiguous id column references in SQL queries
    - Ensure proper return types for functions

  2. Security
    - Maintain existing security settings
    - Ensure proper access controls
*/

-- First drop the existing functions to avoid the "cannot change return type" error
DROP FUNCTION IF EXISTS get_letter_details_for_approval(uuid);
DROP FUNCTION IF EXISTS approve_letter_with_signature(uuid, uuid, text);

-- Recreate get_letter_details_for_approval function with proper column references
CREATE OR REPLACE FUNCTION get_letter_details_for_approval(p_letter_id uuid)
RETURNS TABLE (
  letter_id uuid,
  number integer,
  year integer,
  subject text,
  content jsonb,
  template_id uuid,
  template_name text,
  template_image_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate the letter exists
  IF NOT EXISTS (SELECT 1 FROM letters WHERE letters.id = p_letter_id) THEN
    RAISE EXCEPTION 'الخطاب غير موجود';
  END IF;

  -- Validate user has access to the letter
  IF NOT EXISTS (
    SELECT 1 FROM letters l
    LEFT JOIN approval_requests ar ON l.id = ar.letter_id
    WHERE 
      l.id = p_letter_id AND
      (
        l.user_id = auth.uid() OR                -- Creator
        ar.assigned_to = auth.uid() OR           -- Approver
        ar.requested_by = auth.uid() OR          -- Requester
        EXISTS (                                 -- Admin
          SELECT 1 FROM users
          WHERE users.id = auth.uid() AND role = 'admin'
        )
      )
  ) THEN
    RAISE EXCEPTION 'ليس لديك صلاحية الوصول لهذا الخطاب';
  END IF;

  -- Return letter details with explicit table column references
  RETURN QUERY
  SELECT 
    l.id AS letter_id,
    l.number,
    l.year,
    l.content->>'subject' AS subject,
    l.content,
    l.template_id,
    lt.name AS template_name,
    lt.image_url AS template_image_url
  FROM letters l
  LEFT JOIN letter_templates lt ON l.template_id = lt.id
  WHERE l.id = p_letter_id;
END;
$$;

-- Recreate approve_letter_with_signature function
CREATE OR REPLACE FUNCTION approve_letter_with_signature(
  p_request_id uuid,
  p_signature_id uuid,
  p_comments text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_letter_id uuid;
  v_previous_status workflow_state;
BEGIN
  -- Validate that the approval request exists and is assigned to the current user
  IF NOT EXISTS (
    SELECT 1 FROM approval_requests 
    WHERE approval_requests.id = p_request_id 
    AND approval_requests.assigned_to = auth.uid()
    AND approval_requests.status IN ('submitted', 'under_review')
  ) THEN
    RAISE EXCEPTION 'طلب الموافقة غير موجود أو غير مخصص لك أو ليس في حالة تسمح بالموافقة';
  END IF;
  
  -- Validate that the signature is valid and belongs to the user
  IF NOT EXISTS (
    SELECT 1 FROM signatures 
    WHERE signatures.id = p_signature_id 
    AND signatures.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'التوقيع غير صالح أو لا ينتمي لك';
  END IF;
  
  -- Get the letter_id and previous status
  SELECT 
    ar.letter_id, 
    ar.status 
  INTO 
    v_letter_id, 
    v_previous_status
  FROM approval_requests ar
  WHERE ar.id = p_request_id;
  
  -- Update the approval request
  UPDATE approval_requests
  SET 
    status = 'approved',
    comments = COALESCE(p_comments, comments),
    updated_at = now(),
    approved_at = now()
  WHERE id = p_request_id;
  
  -- Update the letter
  UPDATE letters
  SET 
    workflow_status = 'approved',
    updated_at = now(),
    signature_id = p_signature_id
  WHERE id = v_letter_id;
  
  -- Add a log entry
  INSERT INTO approval_logs (
    request_id,
    letter_id,
    user_id,
    action,
    status,
    previous_status,
    comments
  ) VALUES (
    p_request_id,
    v_letter_id,
    auth.uid(),
    'approve',
    'approved',
    v_previous_status,
    p_comments
  );
  
  RETURN true;
END;
$$;