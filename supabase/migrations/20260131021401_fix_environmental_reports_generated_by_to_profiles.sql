/*
  # Fix environmental_reports generated_by to reference profiles instead of auth.users

  1. Changes
    - Drop existing foreign key from environmental_reports.generated_by to auth.users
    - Add new foreign key to profiles.id instead
    - This aligns with the component's query expectations
  
  2. Security
    - No changes to RLS policies
*/

-- Fix environmental_reports
DO $$
BEGIN
  -- Drop old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'environmental_reports_generated_by_fkey'
    AND table_name = 'environmental_reports'
  ) THEN
    ALTER TABLE environmental_reports
    DROP CONSTRAINT environmental_reports_generated_by_fkey;
  END IF;
END $$;

-- Add new constraint pointing to profiles
ALTER TABLE environmental_reports
ADD CONSTRAINT environmental_reports_generated_by_fkey
FOREIGN KEY (generated_by) REFERENCES profiles(id) ON DELETE RESTRICT;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
