/*
  # Fix asset_data_sanitization to profiles relationship

  ## Problem
  PostgREST requires a direct foreign key relationship for resource embedding.
  Currently `performed_by` references `auth.users`, but queries expect a 
  relationship with `profiles` table for user information.

  ## Changes
  - Drop the existing foreign key to auth.users
  - Add new foreign key from performed_by to profiles(id)
  - This works because profiles.id already references auth.users.id

  ## Security
  No changes to RLS policies needed
*/

-- Drop existing foreign key to auth.users
ALTER TABLE asset_data_sanitization
  DROP CONSTRAINT IF EXISTS asset_data_sanitization_performed_by_fkey;

-- Add new foreign key to profiles instead
ALTER TABLE asset_data_sanitization
  ADD CONSTRAINT asset_data_sanitization_performed_by_fkey
  FOREIGN KEY (performed_by)
  REFERENCES profiles(id)
  ON DELETE SET NULL;

-- Ensure index exists for performance
CREATE INDEX IF NOT EXISTS idx_asset_data_sanitization_performed_by
  ON asset_data_sanitization(performed_by);

COMMENT ON COLUMN asset_data_sanitization.performed_by IS 'References profiles(id) - user who performed the data sanitization';
