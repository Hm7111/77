/*
  # Remove non-admin users

  1. Changes
    - Removes all users with role 'user' from the system
    - Preserves all admin users
    - Logs the removal operation in audit_logs table
  
  2. Security
    - This is a one-time operation to clean up the database
    - Only admin users will remain after this migration
*/

-- First, log the operation in audit_logs
INSERT INTO audit_logs (
  action_type,
  target_type,
  summary,
  details,
  performed_at,
  user_role
)
VALUES (
  'delete',
  'user',
  'Bulk removal of non-admin users',
  jsonb_build_object(
    'count', (SELECT COUNT(*) FROM users WHERE role != 'admin'),
    'operation', 'bulk delete',
    'reason', 'System cleanup - removing non-admin users'
  ),
  now(),
  'admin'
);

-- Delete all approval requests associated with non-admin users
DELETE FROM approval_requests
WHERE requested_by IN (SELECT id FROM users WHERE role != 'admin')
OR assigned_to IN (SELECT id FROM users WHERE role != 'admin');

-- Delete all signatures associated with non-admin users
DELETE FROM signatures
WHERE user_id IN (SELECT id FROM users WHERE role != 'admin');

-- Delete all letters associated with non-admin users
DELETE FROM letters
WHERE user_id IN (SELECT id FROM users WHERE role != 'admin');

-- Finally, delete all non-admin users from the users table
DELETE FROM users
WHERE role != 'admin';

-- Update the sequence for user IDs if needed
-- This is optional but helps keep the sequence in sync
-- ALTER SEQUENCE users_id_seq RESTART WITH (SELECT COALESCE(MAX(id), 1) FROM users);