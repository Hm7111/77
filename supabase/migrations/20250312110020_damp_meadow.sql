/*
  # Fix letters table schema

  1. Changes
    - Add lastSaved column for tracking draft status
    - Add localId column for IndexedDB sync
    - Add syncStatus column for tracking sync state

  2. Security
    - Maintain existing RLS policies
    - Add indexes for performance
*/

-- Add new columns to letters table
ALTER TABLE letters
ADD COLUMN last_saved timestamptz DEFAULT now(),
ADD COLUMN local_id uuid,
ADD COLUMN sync_status text CHECK (sync_status IN ('pending', 'synced', 'failed')) DEFAULT 'synced';

-- Add index for performance
CREATE INDEX letters_last_saved_idx ON letters(last_saved);
CREATE INDEX letters_local_id_idx ON letters(local_id);