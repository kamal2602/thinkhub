/*
  # Fix asset_history foreign key for profiles join

  1. Changes
    - Drop the existing foreign key constraint on asset_history.performed_by
    - Add new foreign key constraint referencing profiles(id) instead of auth.users(id)
    - This enables PostgREST automatic joins with profiles table

  2. Notes
    - profiles.id is the same as auth.users.id, so data integrity is maintained
    - This allows the query `profiles:performed_by(full_name, email)` to work
*/

-- Drop the existing foreign key constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'asset_history_performed_by_fkey'
    AND table_name = 'asset_history'
  ) THEN
    ALTER TABLE asset_history DROP CONSTRAINT asset_history_performed_by_fkey;
  END IF;
END $$;

-- Add new foreign key constraint referencing profiles
ALTER TABLE asset_history 
  ADD CONSTRAINT asset_history_performed_by_fkey 
  FOREIGN KEY (performed_by) REFERENCES profiles(id);
