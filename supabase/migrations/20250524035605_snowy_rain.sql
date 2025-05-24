/*
  # Fix workflow_state type casting in approval function
  
  1. Changes
    - Updates the approve_letter_with_signature function to properly cast text values to workflow_state type
    - Fixes the type mismatch error when updating previous_status in approval logs
  
  2. Security
    - No changes to security policies
*/

-- Update the approve_letter_with_signature function to fix the type casting issue
CREATE OR REPLACE FUNCTION approve_letter_with_signature(
  p_request_id UUID,
  p_signature_id UUID,
  p_comments TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_letter_id UUID;
  v_user_id UUID;
  v_current_status workflow_state;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Check if the request exists and is assigned to the current user
  SELECT letter_id, status INTO v_letter_id, v_current_status
  FROM approval_requests
  WHERE id = p_request_id AND assigned_to = v_user_id;
  
  IF v_letter_id IS NULL THEN
    RAISE EXCEPTION 'طلب الموافقة غير موجود أو غير مخصص لك';
  END IF;
  
  -- Check if the request is in a valid state for approval
  IF v_current_status != 'submitted'::workflow_state AND v_current_status != 'under_review'::workflow_state THEN
    RAISE EXCEPTION 'لا يمكن الموافقة على طلب في الحالة %', v_current_status;
  END IF;
  
  -- Update the approval request status
  UPDATE approval_requests
  SET 
    status = 'approved'::workflow_state,
    approved_at = NOW()
  WHERE id = p_request_id;
  
  -- Update the letter status and add signature
  UPDATE letters
  SET 
    workflow_status = 'approved'::workflow_state,
    signature_id = p_signature_id
  WHERE id = v_letter_id;
  
  -- Log the approval action
  INSERT INTO approval_logs (
    request_id,
    letter_id,
    user_id,
    action,
    status,
    previous_status,
    comments,
    created_at
  ) VALUES (
    p_request_id,
    v_letter_id,
    v_user_id,
    'approve',
    'approved'::workflow_state,
    v_current_status,
    p_comments,
    NOW()
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the reject_letter function to fix the type casting issue
CREATE OR REPLACE FUNCTION reject_letter(
  p_request_id UUID,
  p_reason TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_letter_id UUID;
  v_user_id UUID;
  v_current_status workflow_state;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Check if the request exists and is assigned to the current user
  SELECT letter_id, status INTO v_letter_id, v_current_status
  FROM approval_requests
  WHERE id = p_request_id AND assigned_to = v_user_id;
  
  IF v_letter_id IS NULL THEN
    RAISE EXCEPTION 'طلب الموافقة غير موجود أو غير مخصص لك';
  END IF;
  
  -- Check if the request is in a valid state for rejection
  IF v_current_status != 'submitted'::workflow_state AND v_current_status != 'under_review'::workflow_state THEN
    RAISE EXCEPTION 'لا يمكن رفض طلب في الحالة %', v_current_status;
  END IF;
  
  -- Update the approval request status
  UPDATE approval_requests
  SET 
    status = 'rejected'::workflow_state,
    rejected_at = NOW(),
    rejection_reason = p_reason
  WHERE id = p_request_id;
  
  -- Update the letter status
  UPDATE letters
  SET workflow_status = 'rejected'::workflow_state
  WHERE id = v_letter_id;
  
  -- Log the rejection action
  INSERT INTO approval_logs (
    request_id,
    letter_id,
    user_id,
    action,
    status,
    previous_status,
    comments,
    created_at
  ) VALUES (
    p_request_id,
    v_letter_id,
    v_user_id,
    'reject',
    'rejected'::workflow_state,
    v_current_status,
    p_reason,
    NOW()
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;